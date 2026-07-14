import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const defaultRoster = [
  { firstName: "Maria", lastName: "Santos", email: "maria@resort.com", department: "Housekeeping", role: "Room Attendant", shift: "Morning (06:00 - 14:00)" },
  { firstName: "Elena", lastName: "Cruz", email: "elena@resort.com", department: "Housekeeping", role: "Room Attendant", shift: "Morning (06:00 - 14:00)" },
  { firstName: "Juan", lastName: "Reyes", email: "juan@resort.com", department: "Maintenance", role: "Technician", shift: "Morning (06:00 - 14:00)" },
  { firstName: "Rico", lastName: "Santos", email: "rico@resort.com", department: "Maintenance", role: "Technician", shift: "Afternoon (14:00 - 22:00)" },
  { firstName: "Ana", lastName: "Dela Cruz", email: "ana@resort.com", department: "Front Desk", role: "Receptionist", shift: "Morning (06:00 - 14:00)" },
  { firstName: "Pedro", lastName: "Gomez", email: "pedro@resort.com", department: "Security", role: "Security Officer", shift: "Morning (06:00 - 14:00)" }
];

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotelId = session.hotelId;

    // Fetch existing users
    let dbUsers = await prisma.user.findMany({
      where: { hotelId, role: 'worker' },
      include: { department: true }
    });

    if (dbUsers.length === 0) {
      // Seed default workers in DB
      // Fetch or create departments to align
      const dbDepts = await prisma.department.findMany({ where: { hotelId } });
      const deptMap = new Map(dbDepts.map(d => [d.name.toLowerCase(), d.id]));

      // If departments are not found, let's create the default ones first
      const housekeepingId = deptMap.get('housekeeping') || (await prisma.department.create({ data: { hotelId, name: 'Housekeeping' } })).id;
      const maintenanceId = deptMap.get('maintenance') || (await prisma.department.create({ data: { hotelId, name: 'Maintenance' } })).id;
      const frontdeskId = deptMap.get('front desk') || deptMap.get('frontdesk') || (await prisma.department.create({ data: { hotelId, name: 'Front Desk' } })).id;
      const securityId = deptMap.get('security') || (await prisma.department.create({ data: { hotelId, name: 'Security' } })).id;
      const laundryId = deptMap.get('laundry') || (await prisma.department.create({ data: { hotelId, name: 'Laundry' } })).id;

      const seedDepts: Record<string, number> = {
        'housekeeping': housekeepingId,
        'maintenance': maintenanceId,
        'front desk': frontdeskId,
        'security': securityId,
        'laundry': laundryId
      };

      for (const worker of defaultRoster) {
        const dId = seedDepts[worker.department.toLowerCase()] || housekeepingId;
        
        // Check if user already exists globally
        const existingGlobal = await prisma.user.findUnique({
          where: { email: worker.email }
        });
        if (!existingGlobal) {
          await prisma.user.create({
            data: {
              name: `${worker.firstName} ${worker.lastName}`,
              email: worker.email,
              password: 'password',
              role: 'worker',
              hotelId,
              departmentId: dId,
              schedule: { shift: worker.shift }
            }
          });
        }
      }

      dbUsers = await prisma.user.findMany({
        where: { hotelId, role: 'worker' },
        include: { department: true }
      });
    }

    // Map DB Users to matching format expected by Dashboard and Worker page
    // Active tasks, intensityScore can be computed from actual database Tasks!
    const activeTasks = await prisma.task.findMany({
      where: { hotelId, status: { in: ['in_progress'] } }
    });

    const roster = dbUsers.map(user => {
      const userTasks = activeTasks.filter(t => t.workerId === user.id);
      const intensity = userTasks.reduce((sum, t) => sum + t.difficulty, 0);
      const parts = user.name.split(' ');
      const fName = parts[0] || 'Worker';
      const lName = parts.slice(1).join(' ') || '';
      const sched = (user.schedule as any) || {};

      return {
        id: user.id,
        firstName: fName,
        lastName: lName,
        email: user.email,
        password: user.password,
        department: user.department?.name || 'Housekeeping',
        role: user.role === 'worker' ? (user.department?.name === 'Maintenance' ? 'Technician' : 'Staff') : user.role,
        activeTasks: userTasks.length,
        intensityScore: intensity,
        isFocusMode: userTasks.length > 0,
        shift: sched.shift || "Morning (06:00 - 14:00)"
      };
    });

    return NextResponse.json({ roster });
  } catch (error: any) {
    console.error('Fetch roster error:', error);
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
    const { firstName, lastName, email, role, department, shift, password } = body;

    if (!firstName || !email) {
      return NextResponse.json({ error: 'Missing required worker fields.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Worker with this email already exists.' }, { status: 400 });
    }

    // Resolve department
    let dbDept = await prisma.department.findFirst({
      where: { hotelId, name: { equals: department, mode: 'insensitive' } }
    });

    if (!dbDept) {
      dbDept = await prisma.department.create({
        data: {
          hotelId,
          name: department || 'Housekeeping'
        }
      });
    }

    const user = await prisma.user.create({
      data: {
        name: `${firstName.trim()} ${lastName?.trim() || ''}`.trim(),
        email: email.toLowerCase().trim(),
        password: password || 'password', // Default temporary password
        role: 'worker',
        hotelId,
        departmentId: dbDept.id,
        schedule: { shift: shift || "Morning (06:00 - 14:00)" }
      }
    });

    return NextResponse.json({ success: true, workerId: user.id });
  } catch (error: any) {
    console.error('Create worker error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
