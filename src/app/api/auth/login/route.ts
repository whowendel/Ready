import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, roleType } = body;

    if (!email || !password || !roleType) {
      return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { hotel: true }
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Role mapping compatibility check
    if (roleType === 'worker' && user.role !== 'worker') {
      return NextResponse.json({ error: 'This account is not registered as a Worker.' }, { status: 403 });
    }
    if (roleType === 'hotel' && user.role === 'worker') {
      return NextResponse.json({ error: 'This account is registered as a Worker. Please login via Worker tab.' }, { status: 403 });
    }

    const onboardingCompleted = user.hotel ? user.hotel.onboardingCompleted : false;

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
      onboardingCompleted,
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
      role: user.role,
      onboardingCompleted,
      message: 'Logged in successfully.'
    });
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
