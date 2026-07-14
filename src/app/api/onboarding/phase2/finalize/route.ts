import { NextResponse } from 'next/server';
import { getOrCreateDevSession, encrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated.' }, { status: 400 });
    }

    const hotelId = session.hotelId;

    const body = await request.json().catch(() => ({}));
    const { data } = body;
    if (!data || !data.phase2) {
      return NextResponse.json({ error: 'Missing Phase 2 draft datasets.' }, { status: 400 });
    }

    const p2 = data.phase2;
    const deptsDraft = p2.departments || [];
    const employeesDraft = p2.employees || [];
    const hierarchyDraft = p2.hierarchy || [];
    const permissionsDraft = p2.permissions || {};

    await prisma.$transaction(async (tx) => {
      // 1. Update department shifts and details in database
      const dbDepts = await tx.department.findMany({
        where: { hotelId }
      });

      for (const draftDept of deptsDraft) {
        const matchingDb = dbDepts.find(d => d.name.toLowerCase() === draftDept.name.toLowerCase());
        if (matchingDb) {
          await tx.department.update({
            where: { id: matchingDb.id },
            data: {
              description: draftDept.description || matchingDb.description,
              operatingHours: {
                shifts: draftDept.shifts || [],
                workerCount: Number(draftDept.workerCount) || 0,
              }
            }
          });
        }
      }

      // 2. Fetch fresh departments mapping to attach staff
      const freshDepts = await tx.department.findMany({
        where: { hotelId }
      });
      const deptMap = new Map(freshDepts.map(d => [d.name.toLowerCase(), d.id]));

      // 3. Create or update staff accounts
      for (const emp of employeesDraft) {
        const targetDeptId = deptMap.get(emp.department?.toLowerCase() || "");
        
        await tx.user.upsert({
          where: { email: emp.email.toLowerCase() },
          update: {
            name: `${emp.firstName} ${emp.lastName}`,
            role: emp.role || "worker",
            departmentId: targetDeptId || null,
          },
          create: {
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email.toLowerCase(),
            password: 'password', // Default temporary password
            role: emp.role || "worker",
            departmentId: targetDeptId || null,
            hotelId,
          }
        });
      }

      // 4. Save hierarchy and permission structures inside Hotel settings
      const hotel = await tx.hotel.findUnique({
        where: { id: hotelId }
      });
      const currentSettings = (hotel?.settings as any) || {};

      await tx.hotel.update({
        where: { id: hotelId },
        data: {
          settings: {
            ...currentSettings,
            hierarchy: hierarchyDraft,
            rolePermissions: permissionsDraft,
            workforceConfigured: true,
          }
        }
      });

      // 5. Clear Onboarding Session drafts
      await tx.onboardingSession.deleteMany({
        where: { hotelId }
      });
    }, {
      maxWait: 20000,
      timeout: 60000,
    });

    // 6. Refresh cookies with finalized operational flags
    const cookieStore = await cookies();
    const updatedPayload = {
      ...session,
      onboardingCompleted: true,
      workforceConfigured: true,
    };
    const encrypted = await encrypt(updatedPayload);
    cookieStore.set({
      name: 'ready_session',
      value: encrypted,
      httpOnly: true,
      expires: new Date(Date.now() + 2 * 60 * 60 * 1000), 
      path: '/',
    });

    return NextResponse.json({ success: true, message: "Workforce configuration successfully finalized!" });
  } catch (error: any) {
    console.error('Failed to finalize Phase 2 workforce:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
