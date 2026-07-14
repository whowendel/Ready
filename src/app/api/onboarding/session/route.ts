import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const defaultSessionData = {
  departments: [],
  roomTypes: [],
  amenities: [],
  facilities: [],
  policies: [],
  faqs: [],
  emergencyProcedures: [],
};

export async function GET() {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated with user.' }, { status: 400 });
    }

    const onboardingSession = await prisma.onboardingSession.findUnique({
      where: { hotelId: session.hotelId },
    });

    return NextResponse.json({
      hotelId: session.hotelId,
      step: onboardingSession?.step || 1,
      data: onboardingSession?.data || defaultSessionData,
    });
  } catch (error: any) {
    console.error('Failed to get onboarding session:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated with user.' }, { status: 400 });
    }

    const body = await request.json();
    const { step, data } = body;

    const onboardingSession = await prisma.onboardingSession.upsert({
      where: { hotelId: session.hotelId },
      create: {
        hotelId: session.hotelId,
        step: Number(step) || 1,
        data: data || defaultSessionData,
      },
      update: {
        step: Number(step) || 1,
        data: data || defaultSessionData,
      },
    });

    return NextResponse.json({
      message: 'Draft auto-saved successfully.',
      step: onboardingSession.step,
      data: onboardingSession.data,
    });
  } catch (error: any) {
    console.error('Failed to save onboarding session:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
