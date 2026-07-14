import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { department: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const sched = (user.schedule as any) || {};
    const shift = sched.shift || "Morning (06:00 - 14:00)";

    // Fetch this worker's active tasks
    const activeTasks = await prisma.task.findMany({
      where: {
        hotelId: user.hotelId || 0,
        workerId: user.id
      }
    });

    const inProgressCount = activeTasks.filter(t => t.status === 'in_progress').length;

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department?.name || 'Housekeeping',
        shift,
        inProgressCount,
        tasksCount: activeTasks.length,
        isOnShift: user.isOnShift
      }
    });
  } catch (error: any) {
    console.error('Fetch worker profile error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { isOnShift } = body;

    if (typeof isOnShift !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid isOnShift state.' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { isOnShift },
      include: { department: true }
    });

    const sched = (user.schedule as any) || {};
    const shift = sched.shift || "Morning (06:00 - 14:00)";

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department?.name || 'Housekeeping',
        shift,
        isOnShift: user.isOnShift
      }
    });
  } catch (error: any) {
    console.error('Update worker shift error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
