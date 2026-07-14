import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hotelName, email, password } = body;

    if (!hotelName || !email || !password) {
      return NextResponse.json({ error: 'Missing required signup fields.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    // Normalized Transaction: Create Hotel & Admin User
    const result = await prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName.trim(),
          timezone: 'Asia/Manila',
          brandColor: '#FF2E2E', // Brand Red default
          onboardingCompleted: false
        }
      });

      const user = await tx.user.create({
        data: {
          name: `${hotelName.trim()} Admin`,
          email: email.toLowerCase().trim(),
          password: password,
          role: 'hotel',
          hotelId: hotel.id
        }
      });

      return { hotel, user };
    });

    const payload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      hotelId: result.hotel.id,
      onboardingCompleted: false,
    };

    const encrypted = await encrypt(payload);
    const cookieStore = await cookies();

    cookieStore.set({
      name: 'ready_session',
      value: encrypted,
      httpOnly: true,
      expires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      path: '/',
    });

    return NextResponse.json({
      success: true,
      role: 'hotel',
      onboardingCompleted: false,
      message: 'Hotel registered and logged in successfully.'
    });
  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
