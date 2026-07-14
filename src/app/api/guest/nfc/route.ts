import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ error: 'Missing tag ID.' }, { status: 400 });
    }

    const tag = await prisma.nfcTag.findUnique({
      where: { id: tagId },
      include: { hotel: true },
    });

    if (!tag) {
      return NextResponse.json({ error: 'NFC configuration not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tag: {
        id: tag.id,
        roomNumber: tag.roomNumber,
        location: tag.location,
        displayName: tag.displayName,
        services: tag.services,
        menuItems: tag.menuItems,
        hotel: {
          name: tag.hotel.name,
          brandColor: tag.hotel.brandColor,
        },
      },
    });
  } catch (error: any) {
    console.error('Fetch guest NFC error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
