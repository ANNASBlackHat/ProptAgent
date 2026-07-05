import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB limit for PDFs

import { uploadFile, deleteFile } from '@/lib/storage';

// POST /api/leases/[id]/documents — Upload a PDF lease document
async function uploadDocument(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;
    const { id: leaseId } = await context.params;

    // 1. Verify lease existence and ownership
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (lease.landlordId.toString() !== landlordId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access denied' },
        { status: 403 }
      );
    }

    // 2. Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded. Use field name "file".' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds the 5MB limit' },
        { status: 400 }
      );
    }

    // Validate PDF extension and mimetype
    const originalName = file.name || 'document.pdf';
    const ext = path.extname(originalName).toLowerCase();
    const mimetype = file.type;

    if (ext !== '.pdf' || mimetype !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF documents are allowed' },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload using storage layer
    const uploadResult = await uploadFile(buffer, originalName, `leases/${leaseId}`, 'application/pdf');

    // 4. Update lease document array
    const newDoc = {
      filename: originalName,
      path: uploadResult.url,
      fileId: uploadResult.fileId,
      provider: uploadResult.provider,
      uploadedAt: new Date(),
    };

    lease.documents.push(newDoc);
    await lease.save();

    return NextResponse.json({
      success: true,
      data: newDoc,
    });
  } catch (error) {
    console.error('POST /api/leases/[id]/documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// DELETE /api/leases/[id]/documents — Delete a PDF lease document
async function deleteDocument(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;
    const { id: leaseId } = await context.params;

    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    const lease = await Lease.findById(leaseId);
    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (lease.landlordId.toString() !== landlordId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access denied' },
        { status: 403 }
      );
    }

    // Find document to delete by fileId or path
    const docIndex = lease.documents.findIndex(d => d.fileId === fileId || d.path === fileId);
    if (docIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const doc = lease.documents[docIndex];
    
    // Call deleteFile (does not throw)
    await deleteFile(doc.fileId, doc.provider);

    // Remove from array and save
    lease.documents.splice(docIndex, 1);
    await lease.save();

    return NextResponse.json({
      success: true,
      data: { message: 'Document deleted successfully' }
    });
  } catch (error) {
    console.error('DELETE /api/leases/[id]/documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(uploadDocument, ['landlord']);
export const DELETE = withAuth(deleteDocument, ['landlord']);
