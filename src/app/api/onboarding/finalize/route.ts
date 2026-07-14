import { NextResponse } from 'next/server';
import { getOrCreateDevSession, encrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated with user.' }, { status: 400 });
    }

    const hotelId = session.hotelId as number;

    const body = await request.json();
    const { readinessScore, data } = body;

    if (!readinessScore) {
      return NextResponse.json({ error: 'Readiness scores must be computed before finalizing.' }, { status: 400 });
    }

    const {
      knowledgeCoverage,
      policiesCoverage,
      isDepartmentMappingComplete,
      isRoutingMatrixComplete,
      isPriorityMatrixComplete,
      isCoreOperationalDataAvailable,
    } = readinessScore;

    if (
      knowledgeCoverage < 80 ||
      policiesCoverage < 70 ||
      !isDepartmentMappingComplete ||
      !isRoutingMatrixComplete ||
      !isPriorityMatrixComplete ||
      !isCoreOperationalDataAvailable
    ) {
      return NextResponse.json({ error: 'Minimum AI readiness scores not met.' }, { status: 400 });
    }

    console.log(`Finalizing onboarding for hotel ID: ${hotelId}...`);

    // Normalized Database Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Soft Reset existing entries
      await tx.service.deleteMany({ where: { department: { hotelId } } });
      await tx.department.deleteMany({ where: { hotelId } });
      await tx.roomType.deleteMany({ where: { hotelId } });
      await tx.amenity.deleteMany({ where: { hotelId } });
      await tx.facility.deleteMany({ where: { hotelId } });
      await tx.policy.deleteMany({ where: { hotelId } });
      await tx.fAQ.deleteMany({ where: { hotelId } });
      await tx.emergencyProcedure.deleteMany({ where: { hotelId } });
      await tx.routingRule.deleteMany({ where: { hotelId } });
      await tx.priorityRule.deleteMany({ where: { hotelId } });
      await tx.escalationRule.deleteMany({ where: { hotelId } });

      // 2. Create Departments & Services
      for (const dept of data.departments || []) {
        const createdDept = await tx.department.create({
          data: {
            hotelId,
            name: dept.name,
            description: dept.description,
            isActive: true,
            operatingHours: {
              workerCount: Number(dept.workerCount) || 0,
              shifts: dept.shifts || [],
            }
          },
        });

        const servicesObj = data.services?.find((s: any) => s.department.toLowerCase() === dept.name.toLowerCase());
        const services = servicesObj?.services || [];
        for (const service of services) {
          await tx.service.create({
            data: {
              departmentId: createdDept.id,
              name: service.name,
              description: service.description,
              isActive: true,
            },
          });
        }
      }

      // 3. Create Amenities & RoomTypes
      const amenityMap = new Map<string, number>();
      for (const amen of data.amenities || []) {
        const createdAmen = await tx.amenity.create({
          data: {
            hotelId,
            name: amen.name,
            description: amen.description,
          },
        });
        amenityMap.set(amen.name.toLowerCase(), createdAmen.id);
      }

      for (const room of data.roomTypes || []) {
        const roomAmenityIds = (room.amenities || [])
          .map((a: string) => amenityMap.get(a.toLowerCase()))
          .filter((id?: number): id is number => id !== undefined);

        await tx.roomType.create({
          data: {
            hotelId,
            name: room.name,
            capacity: Number(room.capacity) || 2,
            bedTypes: room.bedTypes || '1 Bed',
            amenities: {
              connect: roomAmenityIds.map((id: number) => ({ id })),
            },
          },
        });
      }

      // 4. Create Facilities
      for (const fac of data.facilities || []) {
        await tx.facility.create({
          data: {
            hotelId,
            name: fac.name,
            description: fac.description,
            operatingHours: fac.operatingHours || {},
          },
        });
      }

      // 5. Create Policies
      for (const pol of data.policies || []) {
        await tx.policy.create({
          data: {
            hotelId,
            topic: pol.topic,
            rule: pol.rule,
          },
        });
      }

      // 6. Create FAQs
      for (const faq of data.faqs || []) {
        await tx.fAQ.create({
          data: {
            hotelId,
            question: faq.question,
            answer: faq.answer,
          },
        });
      }

      // 7. Create Emergency Procedures
      for (const ep of data.emergencyProcedures || []) {
        await tx.emergencyProcedure.create({
          data: {
            hotelId,
            title: ep.title,
            steps: ep.steps || [],
            contactInfo: ep.contactInfo || '',
          },
        });
      }

      // 8. Create Operational Workflows (Blueprints)
      const depts = await tx.department.findMany({ where: { hotelId } });
      const deptMap = new Map(depts.map((d) => [d.name.toLowerCase(), d.id]));

      const blueprint = data.blueprint || {};

      for (const routeRule of blueprint.routing || []) {
        const triggerStr = routeRule.trigger || routeRule.text || "";
        const deptName = routeRule.department || "";
        if (!triggerStr || !deptName) continue;
        const deptId = deptMap.get(deptName.toLowerCase());
        if (deptId) {
          await tx.routingRule.create({
            data: {
              hotelId,
              trigger: triggerStr,
              departmentId: deptId,
            },
          });
        }
      }

      for (const prioRule of blueprint.priority || []) {
        const triggerStr = prioRule.trigger || prioRule.text || "";
        if (!triggerStr) continue;
        await tx.priorityRule.create({
          data: {
            hotelId,
            trigger: triggerStr,
            priority: prioRule.priority || "MEDIUM",
          },
        });
      }

      for (const escRule of blueprint.escalation || []) {
        const triggerStr = escRule.trigger || escRule.text || "";
        if (!triggerStr) continue;
        await tx.escalationRule.create({
          data: {
            hotelId,
            trigger: triggerStr,
            slaMinutes: Number(escRule.slaMinutes) || 15,
            escalateTo: escRule.escalateTo || "Supervisor",
          },
        });
      }

      // 9. Mark Hotel Operational
      await tx.hotel.update({
        where: { id: hotelId },
        data: {
          onboardingCompleted: true,
          settings: {
            address: data.foundation?.address || '',
            gmapsLocation: data.foundation?.gmapsLocation || '',
            floors: data.floors || [],
            operationalBlueprint: data.operationalBlueprint || [],
          }
        },
      });

      // 10. Clear Onboarding Session draft
      await tx.onboardingSession.delete({
        where: { hotelId },
      });
    }, {
      maxWait: 20000,
      timeout: 60000,
    });

    // 11. Refresh cookies with updated onboarding completed state
    const cookieStore = await cookies();
    const updatedPayload = {
      ...session,
      onboardingCompleted: true,
    };
    const encrypted = await encrypt(updatedPayload);
    cookieStore.set({
      name: 'ready_session',
      value: encrypted,
      httpOnly: true,
      expires: new Date(Date.now() + 2 * 60 * 60 * 1000), 
      path: '/',
    });

    return NextResponse.json({
      message: 'Onboarding successfully finalized. System is operational.',
      onboardingCompleted: true,
    });
  } catch (error: any) {
    console.error('Finalization failure:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
