import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { uploadFile, deleteFile } from '@/lib/storage';

async function testStorageConnectionHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    // 1x1 transparent PNG
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const buffer = Buffer.from(pngBase64, 'base64');
    
    // Upload tiny test image to ImageKit/local folder "/propagent/test"
    const uploadResult = await uploadFile(buffer, 'test-connection.png', 'test', 'image/png');
    
    // Immediately delete the test file
    await deleteFile(uploadResult.fileId, uploadResult.provider);
    
    return NextResponse.json({
      success: true,
      data: {
        provider: uploadResult.provider,
        message: 'Storage connection test passed successfully'
      }
    });
  } catch (error) {
    console.error('[Storage Connection Test] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Storage provider connection test failed.'
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(testStorageConnectionHandler, ['super_admin']);
export const dynamic = 'force-dynamic';
