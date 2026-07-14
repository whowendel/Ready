import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('ready_session');
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error: any) {
    console.error('Logout API error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
