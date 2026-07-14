import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const hotelId = searchParams.get('hotelId');

    if (!hotelId) {
      return NextResponse.json({ error: 'Missing hotel ID' }, { status: 400 });
    }

    if (!query.trim()) {
      return NextResponse.json({ faqs: [], policies: [], facilities: [] });
    }

    const hId = Number(hotelId);

    // Perform case-insensitive search on FAQ, Policy, and Facility databases
    const faqs = await prisma.fAQ.findMany({
      where: {
        hotelId: hId,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } }
        ]
      }
    });

    const policies = await prisma.policy.findMany({
      where: {
        hotelId: hId,
        OR: [
          { topic: { contains: query, mode: 'insensitive' } },
          { rule: { contains: query, mode: 'insensitive' } }
        ]
      }
    });

    const facilities = await prisma.facility.findMany({
      where: {
        hotelId: hId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      }
    });

    return NextResponse.json({
      faqs,
      policies,
      facilities
    });
  } catch (error: any) {
    console.error('Local guest search error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
