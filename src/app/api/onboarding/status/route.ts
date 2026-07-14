import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated with user.' }, { status: 400 });
    }

    const documents = await prisma.hotelDocument.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Failed to fetch document statuses:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
