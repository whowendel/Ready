import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { assignTaskDynamically } from '@/lib/dispatcher';

// Seed tasks if empty
const defaultTasks = [
  { id: "TKT-101", name: "Lobby Deep Dusting", dept: "Housekeeping", room: "Lobby", difficulty: 2, priority: "LOW", slaMinutes: 30, createdAt: "Jul 2, 2026", status: "in_progress", workerId: 1, completedAt: "" },
  { id: "TKT-102", name: "AC Filter Recalibration", dept: "Maintenance", room: "Room 304", difficulty: 3, priority: "MEDIUM", slaMinutes: 45, createdAt: "Jul 2, 2026", status: "in_progress", workerId: 3, completedAt: "" },
  { id: "TKT-103", name: "Guest Wake-up Call", dept: "Front Desk", room: "Room 205", difficulty: 1, priority: "LOW", slaMinutes: 10, createdAt: "Jul 2, 2026", status: "in_progress", workerId: 5, completedAt: "" },
  { id: "TKT-104", name: "CCTV Main Console Audit", dept: "Security", room: "Server Room", difficulty: 2, priority: "MEDIUM", slaMinutes: 60, createdAt: "Jul 2, 2026", status: "backlog", completedAt: "" },
  { id: "TKT-105", name: "Linens Sorting Cycle", dept: "Laundry", room: "Laundry Room", difficulty: 4, priority: "MEDIUM", slaMinutes: 90, createdAt: "Jul 2, 2026", status: "completed", workerId: 1, completedAt: "Jul 2, 2026, 11:22 AM" },
  { id: "TKT-106", name: "Water Pump Seal Leak Fix", dept: "Maintenance", room: "Basement", difficulty: 4, priority: "HIGH", slaMinutes: 20, createdAt: "Jul 2, 2026", status: "in_progress", workerId: 3, completedAt: "" }
];

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotelId = session.hotelId;

    let dbTasks = await prisma.task.findMany({
      where: { hotelId },
      orderBy: { id: 'asc' }
    });

    if (dbTasks.length === 0) {
      // Fetch registered workers for this hotel
      const workers = await prisma.user.findMany({
        where: { hotelId, role: 'worker' },
        include: { department: true }
      });

      // Group worker IDs by department name (lowercase)
      const workersByDept: Record<string, number[]> = {};
      workers.forEach(w => {
        const deptName = (w.department?.name || 'Housekeeping').toLowerCase();
        if (!workersByDept[deptName]) {
          workersByDept[deptName] = [];
        }
        workersByDept[deptName].push(w.id);
      });

      const getWorkerForDept = (deptName: string, index: number) => {
        const list = workersByDept[deptName.toLowerCase()] || [];
        if (list.length === 0) return null;
        return list[index % list.length];
      };

      // Seed default tasks with hotel-specific unique IDs and correct worker assignments
      await prisma.task.createMany({
        data: defaultTasks.map(t => {
          let assignedWorkerId: number | null = null;
          if (t.workerId !== undefined && t.workerId !== null) {
            const dept = t.dept.toLowerCase();
            if (dept === 'housekeeping' || dept === 'laundry') {
              // Assign to first/second housekeeping worker
              assignedWorkerId = getWorkerForDept('housekeeping', t.workerId === 1 ? 0 : 1);
            } else if (dept === 'maintenance') {
              // Assign to first/second maintenance worker
              assignedWorkerId = getWorkerForDept('maintenance', t.workerId === 3 ? 0 : 1);
            } else if (dept === 'front desk') {
              assignedWorkerId = getWorkerForDept('front desk', 0);
            } else if (dept === 'security') {
              assignedWorkerId = getWorkerForDept('security', 0);
            }
          }
          return {
            ...t,
            id: `${t.id}-${hotelId}`,
            workerId: assignedWorkerId,
            hotelId
          };
        })
      });

      dbTasks = await prisma.task.findMany({
        where: { hotelId },
        orderBy: { id: 'asc' }
      });
    }

    return NextResponse.json({ tasks: dbTasks });
  } catch (error: any) {
    console.error('Fetch tasks error:', error);
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
    const { id, name, dept, room, difficulty, priority, slaMinutes, status, workerId, completedAt, isOverloaded, photoUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing task ID.' }, { status: 400 });
    }

    // If workerId is not explicitly provided, assign the task dynamically using AI
    let finalWorkerId = workerId !== undefined ? workerId : null;
    let finalOverloaded = isOverloaded !== undefined ? !!isOverloaded : false;

    // Check if task already exists
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask && !finalWorkerId) {
      const assignment = await assignTaskDynamically(hotelId, dept || 'Housekeeping', {
        name: name || 'New Task Request',
        difficulty: Number(difficulty) || 2,
        priority: priority || 'MEDIUM',
        room: room || 'Lobby',
        slaMinutes: Number(slaMinutes) || 30
      });
      finalWorkerId = assignment.workerId;
      finalOverloaded = assignment.isOverloaded;
    }

    // Upsert task in database
    const task = await prisma.task.upsert({
      where: { id },
      update: {
        status: status !== undefined ? status : undefined,
        workerId: workerId !== undefined ? workerId : undefined,
        completedAt: completedAt !== undefined ? completedAt : undefined,
        isOverloaded: isOverloaded !== undefined ? isOverloaded : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
      },
      create: {
        id,
        name: name || 'New Task Request',
        dept: dept || 'Housekeeping',
        room: room || 'Lobby',
        difficulty: Number(difficulty) || 2,
        priority: priority || 'MEDIUM',
        slaMinutes: Number(slaMinutes) || 30,
        status: status || 'backlog',
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        workerId: finalWorkerId,
        completedAt: completedAt || null,
        isOverloaded: finalOverloaded,
        photoUrl: photoUrl || null,
        hotelId
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Save task error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
