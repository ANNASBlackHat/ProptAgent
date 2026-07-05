import path from 'path';
import fs from 'fs';
import { dbConnect } from '@/lib/db';
import SystemSettings, { decryptField } from '@/models/SystemSettings';

export interface UploadResult {
  url: string;        // public URL to display/store
  fileId: string;     // provider's file ID (for deletion)
  provider: string;   // 'imagekit' | 'local'
}

export async function uploadFile(
  file: Buffer,
  filename: string,
  folder: string,      // e.g. 'properties', 'units', 'leases', 'avatars'
  mimeType: string,
  overrides?: {
    provider?: string;
    publicKey?: string;
    privateKey?: string;
    urlEndpoint?: string;
  }
): Promise<UploadResult> {
  const provider = overrides?.provider || (await getProvider());

  if (provider === 'imagekit') {
    return uploadToImageKit(file, filename, folder, mimeType, overrides);
  } else {
    return uploadToLocal(file, filename, folder, mimeType);
  }
}

async function getProvider(): Promise<string> {
  try {
    await dbConnect();
    const settings = await SystemSettings.getSingleton();
    return settings.storageProvider || process.env.STORAGE_PROVIDER || 'local';
  } catch {
    return process.env.STORAGE_PROVIDER || 'local';
  }
}

export async function uploadToImageKit(
  file: Buffer,
  filename: string,
  folder: string,
  mimeType: string,
  overrides?: {
    publicKey?: string;
    privateKey?: string;
    urlEndpoint?: string;
  }
): Promise<UploadResult> {
  await dbConnect();
  const settings = await SystemSettings.getSingleton();

  const publicKey = overrides?.publicKey || settings.imagekitPublicKey || process.env.IMAGEKIT_PUBLIC_KEY || '';
  
  let privateKey = '';
  if (overrides?.privateKey && !overrides.privateKey.includes('•') && overrides.privateKey !== '') {
    privateKey = overrides.privateKey;
  } else {
    const privateKeyEncrypted = settings.imagekitPrivateKey;
    if (privateKeyEncrypted) {
      privateKey = decryptField(privateKeyEncrypted);
    } else {
      privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
    }
  }
  const urlEndpoint = overrides?.urlEndpoint || settings.imagekitUrlEndpoint || process.env.IMAGEKIT_URL_ENDPOINT || '';

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error('ImageKit is not fully configured (missing public key, private key, or URL endpoint)');
  }

  const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
  
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(file)], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('fileName', filename);
  formData.append('folder', `/propagent/${folder}`);
  formData.append('useUniqueFileName', 'true');

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ImageKit upload failed: ${res.statusText} - ${errText}`);
  }

  const data = await res.json();
  return {
    url: data.url,
    fileId: data.fileId,
    provider: 'imagekit',
  };
}

export async function uploadToLocal(
  file: Buffer,
  filename: string,
  folder: string,
  _mimeType: string
): Promise<UploadResult> {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalName = `${Date.now()}-${sanitized}`;
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const finalPath = path.join(uploadDir, finalName);
  fs.writeFileSync(finalPath, file);
  
  const relativePath = `/uploads/${folder}/${finalName}`;
  return {
    url: relativePath,
    fileId: relativePath,
    provider: 'local',
  };
}

export async function deleteFile(
  fileId: string,
  provider: string
): Promise<void> {
  try {
    if (provider === 'imagekit') {
      await dbConnect();
      const settings = await SystemSettings.getSingleton();
      const privateKeyEncrypted = settings.imagekitPrivateKey;
      let privateKey = '';
      if (privateKeyEncrypted) {
        privateKey = decryptField(privateKeyEncrypted);
      } else {
        privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
      }
      if (!privateKey) {
        console.warn('[Storage] Cannot delete file from ImageKit: private key is missing');
        return;
      }
      
      const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
      const res = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Storage] ImageKit delete failed for fileId ${fileId}: ${res.statusText} - ${errText}`);
      }
    } else if (provider === 'local') {
      const relativePath = fileId.startsWith('/') ? fileId : `/${fileId}`;
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    console.error('[Storage] deleteFile error (not thrown):', error);
  }
}

export async function getStorageConfig(): Promise<{
  provider: string;
  isConfigured: boolean;
  missingFields: string[];
}> {
  await dbConnect();
  const settings = await SystemSettings.getSingleton();
  const provider = settings.storageProvider || process.env.STORAGE_PROVIDER || 'local';
  
  if (provider === 'local') {
    return {
      provider,
      isConfigured: true,
      missingFields: [],
    };
  }
  
  const missingFields: string[] = [];
  if (!settings.imagekitPublicKey && !process.env.IMAGEKIT_PUBLIC_KEY) {
    missingFields.push('imagekitPublicKey');
  }
  if (!settings.imagekitPrivateKey && !process.env.IMAGEKIT_PRIVATE_KEY) {
    missingFields.push('imagekitPrivateKey');
  }
  if (!settings.imagekitUrlEndpoint && !process.env.IMAGEKIT_URL_ENDPOINT) {
    missingFields.push('imagekitUrlEndpoint');
  }
  
  return {
    provider,
    isConfigured: missingFields.length === 0,
    missingFields,
  };
}
