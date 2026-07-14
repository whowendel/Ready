import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const defaultHandovers = [
  { author: "Maria (Morning Crew)", text: "Vacuum cleaner in Lobby is losing suction, needs a quick nozzle check from Maintenance.", time: "Jul 2, 2026, 02:00 PM" },
  { author: "Juan (Maintenance)", text: "AC Compressor replacement part arriving tomorrow morning for room 304.", time: "Jul 2, 2026, 03:30 PM" }
];

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotelId = session.hotelId;

    let dbHandovers = await prisma.handoverLog.findMany({
      where: { hotelId },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json({ handovers: dbHandovers });
  } catch (error: any) {
    console.error('Fetch handovers error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotelId = session.hotelId;
    const body = await request.json();
    const { author, text, time } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing text content.' }, { status: 400 });
    }

    const handover = await prisma.handoverLog.create({
      data: {
        author: author || 'Staff Member',
        text,
        time: time || new Date().toLocaleString(),
        hotelId
      }
    });

    return NextResponse.json({ success: true, handover });
  } catch (error: any) {
    console.error('Save handover error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
