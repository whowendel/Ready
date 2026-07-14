import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'ready-default-super-secret-key-32-chars-long'
);

export interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  hotelId: number | null;
  onboardingCompleted: boolean;
  [key: string]: any;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(SECRET_KEY);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('ready_session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('ready_session')?.value;
  if (!session) return null;

  const parsed = await decrypt(session);
  if (!parsed) return null;

  const res = NextResponse.next();
  const encrypted = await encrypt({
    ...parsed,
  });

  res.cookies.set({
    name: 'ready_session',
    value: encrypted,
    httpOnly: true,
    expires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    path: '/',
  });

  return res;
}

export async function getOrCreateDevSession(): Promise<SessionPayload> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get('ready_session')?.value;
  if (sessionVal) {
    const dec = await decrypt(sessionVal);
    if (dec) return dec;
  }

  const { prisma } = await import('./prisma');
  
  let hotel = await prisma.hotel.findFirst();
  if (!hotel) {
    hotel = await prisma.hotel.create({
      data: {
        name: 'Clark Marriott Hotel',
        domain: 'clarkmarriott',
        timezone: 'Asia/Manila',
        brandColor: '#4F46E5',
        totalRooms: 260,
        onboardingCompleted: false,
      },
    });
  }

  let user = await prisma.user.findUnique({
    where: { email: 'admin@clarkmarriott.com' },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Marriott Admin',
        email: 'admin@clarkmarriott.com',
        role: 'admin',
        password: 'password', 
        hotelId: hotel.id,
      },
    });
  }

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    hotelId: hotel.id,
    onboardingCompleted: hotel.onboardingCompleted,
  };

  const encrypted = await encrypt(payload);

  cookieStore.set({
    name: 'ready_session',
    value: encrypted,
    httpOnly: true,
    expires: new Date(Date.now() + 2 * 60 * 60 * 1000), 
    path: '/',
  });

  return payload;
}
