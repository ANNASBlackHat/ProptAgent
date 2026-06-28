import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit for PDFs

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
        { success: false, error: 'File size exceeds the 10MB limit' },
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

    // 3. Save file to disk
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'leases', leaseId);
    fs.mkdirSync(uploadDir, { recursive: true });

    // Sanitize filename
    const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = `${Date.now()}-${sanitized}`;
    const finalPath = path.join(uploadDir, finalName);

    // Convert file to Buffer and write it
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(finalPath, buffer);

    // 4. Update lease document array
    const relativePath = `/uploads/leases/${leaseId}/${finalName}`;
    const newDoc = {
      filename: originalName,
      path: relativePath,
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

export const POST = withAuth(uploadDocument, ['landlord']);
