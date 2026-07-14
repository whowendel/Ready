import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getDocumentQueue } from '@/lib/queue';
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
    
    // Save file locally or fallback to base64 Data URL if filesystem is read-only (EROFS)
    let filePathStr = '';
    const fileName = `${Date.now()}_${file.name}`;
    
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      filePathStr = path.join('public', 'uploads', fileName);
    } catch (fsError: any) {
      console.warn('Failed to save file to local filesystem, falling back to base64 in database:', fsError.message || fsError);
      const base64Data = buffer.toString('base64');
      filePathStr = `data:${file.type};base64,${base64Data}`;
    }

    // Save document details
    const doc = await prisma.hotelDocument.create({
      data: {
        hotelId: session.hotelId,
        name: file.name,
        filePath: filePathStr,
        mimeType: file.type,
        status: 'PENDING',
      },
    });

    // Enqueue document processing task or run inline in serverless
    const isServerless = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined || !process.env.REDIS_URL;
    let queued = false;
    let finalStatus = 'PENDING';

    if (!isServerless) {
      try {
        await getDocumentQueue().add('process-document', {
          documentId: doc.id,
          hotelId: session.hotelId,
        });
        queued = true;
      } catch (queueError: any) {
        console.warn('Failed to enqueue document processing task, falling back to inline:', queueError.message || queueError);
      }
    }

    if (isServerless || !queued) {
      try {
        const { processDocumentInline } = await import('@/lib/documentProcessor');
        await processDocumentInline(doc.id, session.hotelId);
        finalStatus = 'COMPLETED';
      } catch (procError: any) {
        console.error('Inline document processing failed:', procError);
        finalStatus = 'FAILED';
      }
    }

    const publicUrl = doc.filePath.startsWith('data:') 
      ? doc.filePath 
      : '/' + doc.filePath.replace(/\\/g, '/').replace(/^public\//, '');

    return NextResponse.json({
      message: finalStatus === 'COMPLETED'
        ? 'File uploaded and processed inline successfully.'
        : finalStatus === 'FAILED'
        ? 'File uploaded but processing failed.'
        : 'File uploaded and queued successfully.',
      documentId: doc.id,
      name: doc.name,
      status: finalStatus,
      url: publicUrl,
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

    // Delete local file if not a data URL
    if (!doc.filePath.startsWith('data:')) {
      const absolutePath = path.resolve(doc.filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
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

