import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Missing task ID.' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    let workerName = null;
    if (task.workerId) {
      const worker = await prisma.user.findUnique({
        where: { id: task.workerId },
        select: { name: true }
      });
      if (worker) {
        workerName = worker.name;
      }
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        name: task.name,
        dept: task.dept,
        room: task.room,
        priority: task.priority,
        status: task.status,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        isOverloaded: task.isOverloaded,
        workerName
      }
    });
  } catch (error: any) {
    console.error('Fetch guest task status error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
