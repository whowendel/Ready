import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { documentQueue } from '@/lib/queue';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated with user.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Ensure upload folder exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file locally
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const relativePath = path.join('public', 'uploads', fileName);

    // Save document details
    const doc = await prisma.hotelDocument.create({
      data: {
        hotelId: session.hotelId,
        name: file.name,
        filePath: relativePath,
        mimeType: file.type,
        status: 'PENDING',
      },
    });

    // Enqueue document processing task
    await documentQueue.add('process-document', {
      documentId: doc.id,
      hotelId: session.hotelId,
    });

    return NextResponse.json({
      message: 'File uploaded and queued successfully.',
      documentId: doc.id,
      name: doc.name,
      status: doc.status,
    });
  } catch (error: any) {
    console.error('File upload processing failed:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated.' }, { status: 400 });
    }

    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'No document ID provided.' }, { status: 400 });
    }

    const doc = await prisma.hotelDocument.findUnique({
      where: { id: Number(documentId) },
    });

    if (!doc || doc.hotelId !== session.hotelId) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    // Delete local file
    const absolutePath = path.resolve(doc.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // Delete database record
    await prisma.hotelDocument.delete({
      where: { id: doc.id },
    });

    return NextResponse.json({ message: 'Document deleted successfully.' });
  } catch (error: any) {
    console.error('Delete failed:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

