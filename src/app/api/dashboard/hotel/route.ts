import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: session.hotelId },
      include: {
        policies: true,
      }
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found.' }, { status: 404 });
    }

    return NextResponse.json({ hotel });
  } catch (error: any) {
    console.error('Fetch hotel info error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotelId = session.hotelId as number;
    const body = await request.json();
    const { password, name, policies, settings } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password confirmation is required.' }, { status: 400 });
    }

    // Verify password of the current user
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid confirmation password.' }, { status: 403 });
    }

    // Update hotel name if provided
    if (name) {
      await prisma.hotel.update({
        where: { id: hotelId },
        data: { name }
      });
    }

    // Update settings if provided
    if (settings) {
      const currentHotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });
      const mergedSettings = {
        ...(currentHotel?.settings as any || {}),
        ...settings
      };
      await prisma.hotel.update({
        where: { id: hotelId },
        data: { settings: mergedSettings }
      });
    }

    // Update policies if provided
    if (Array.isArray(policies)) {
      // Clean existing policies and recreate them
      await prisma.policy.deleteMany({
        where: { hotelId }
      });

      if (policies.length > 0) {
        await prisma.policy.createMany({
          data: policies.map((p: any) => ({
            hotelId,
            topic: p.topic || 'General',
            rule: p.rule || ''
          }))
        });
      }
    }

    const updatedHotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { policies: true }
    });

    return NextResponse.json({ success: true, hotel: updatedHotel });
  } catch (error: any) {
    console.error('Update hotel info error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
