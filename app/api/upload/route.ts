import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import formidable, { File } from 'formidable';
import { Readable } from 'stream';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

// Disable Next.js built-in body parsing so formidable can handle multipart
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function parseForm(
  req: NextRequest,
  uploadDir: string
): Promise<{ files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFiles: MAX_FILES,
      maxFileSize: MAX_FILE_SIZE,
      maxTotalFileSize: MAX_FILE_SIZE * MAX_FILES,
      filter({ mimetype }) {
        return !!mimetype && ALLOWED_TYPES.includes(mimetype);
      },
    });

    // formidable v3 accepts a Node.js IncomingMessage-like object.
    // Next.js route handlers expose a Web API Request; we adapt using the body.
    req
      .arrayBuffer()
      .then((buf) => {
        // Build a minimal Node-compatible stream from the buffer
        const stream = new Readable();
        stream.push(Buffer.from(buf));
        stream.push(null);

        // Copy headers from NextRequest
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
          headers[key] = value;
        });
        (stream as unknown as Record<string, unknown>).headers = headers;
        (stream as unknown as Record<string, unknown>).method = req.method;
        (stream as unknown as Record<string, unknown>).url = req.url;

        form.parse(stream as unknown as import('http').IncomingMessage, (err, _fields, files) => {
          if (err) return reject(err);
          resolve({ files });
        });
      })
      .catch(reject);
  });
}

import { uploadFile } from '@/lib/storage';

async function handleUpload(req: AuthenticatedRequest): Promise<Response> {
  try {
    const userId = req.user!.userId;
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'tmp');

    // Ensure temp directory exists
    fs.mkdirSync(tempDir, { recursive: true });

    let files: formidable.Files;
    try {
      ({ files } = await parseForm(req, tempDir));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'File parsing error';
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    const fileField = files['files'];
    if (!fileField) {
      return NextResponse.json(
        { success: false, error: 'No files uploaded. Use field name "files".' },
        { status: 400 }
      );
    }

    const fileList: File[] = Array.isArray(fileField) ? fileField : [fileField];

    // Validate extensions
    for (const file of fileList) {
      const ext = path.extname(file.originalFilename || '').toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        fs.unlinkSync(file.filepath);
        return NextResponse.json(
          { success: false, error: `File type not allowed: ${ext}. Accepted: jpg, jpeg, png, webp` },
          { status: 400 }
        );
      }
    }

    // Upload using storage helper and return both urls & files
    const uploadedFiles = [];
    const urls: string[] = [];
    for (const file of fileList) {
      const originalName = file.originalFilename || 'upload';
      const buffer = fs.readFileSync(file.filepath);
      const mimeType = file.mimetype || 'image/jpeg';
      
      const result = await uploadFile(buffer, originalName, userId, mimeType);
      
      // Clean up the formidable temp file
      try {
        fs.unlinkSync(file.filepath);
      } catch (err) {
        console.warn('[Upload] Failed to clean up temp file:', err);
      }
      
      uploadedFiles.push(result);
      urls.push(result.url);
    }

    return NextResponse.json({
      success: true,
      data: { urls, files: uploadedFiles }
    }, { status: 200 });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}

export const POST = withAuth(handleUpload, ['landlord', 'super_admin', 'tenant']);
