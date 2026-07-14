import { NextResponse } from 'next/server';
import { getOrCreateDevSession, encrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated.' }, { status: 400 });
    }

    // 1. Mark hotel onboarding as uncompleted in DB
    await prisma.hotel.update({
      where: { id: session.hotelId },
      data: { onboardingCompleted: false },
    });

    // 2. Load current database values to rebuild the draft session so they don't lose data
    const hotel = await prisma.hotel.findUnique({
      where: { id: session.hotelId },
      include: {
        departments: { include: { services: true } },
        roomTypes: { include: { amenities: true } },
        facilities: true,
        policies: true,
        routingRules: true,
        priorityRules: true,
        escalationRules: true,
      }
    });

    if (hotel) {
      const draftData = {
        foundation: {
          name: hotel.name,
          type: (hotel.settings as any)?.type || "Hotel",
          timezone: hotel.timezone,
          address: (hotel.settings as any)?.address || "",
          gmapsLocation: (hotel.settings as any)?.gmapsLocation || "",
          totalRooms: hotel.totalRooms || 0,
          totalFloors: (hotel.settings as any)?.floors?.length || 0,
        },
        roomTypes: hotel.roomTypes.map(r => ({
          name: r.name,
          capacity: r.capacity,
          bedTypes: r.bedTypes,
          amenities: r.amenities.map(a => a.name)
        })),
        facilities: hotel.facilities.map(f => ({
          name: f.name,
          description: f.description,
          capacity: (f as any).capacity || 50,
          operatingHours: (f.operatingHours as any) || { open: "08:00", close: "22:00" },
          details: (f as any).details || {}
        })),
        departments: hotel.departments.map(d => ({
          name: d.name,
          description: d.description,
          workerCount: (d.operatingHours as any)?.workerCount || 0,
          shifts: (d.operatingHours as any)?.shifts || [],
          tasks: d.services.map(s => ({
            name: s.name,
            description: s.description,
            rules: (s as any).rules || ""
          }))
        })),
        floors: (hotel.settings as any)?.floors || [],
        policies: hotel.policies.map(p => ({
          topic: p.topic,
          rule: p.rule
        })),
        operationalBlueprint: (hotel.settings as any)?.operationalBlueprint || [],
        blueprint: {
          routing: hotel.routingRules.map(r => ({ trigger: r.trigger, department: r.trigger })),
          priority: hotel.priorityRules.map(p => ({ trigger: p.trigger, priority: p.priority })),
          escalation: hotel.escalationRules.map(e => ({ trigger: e.trigger, slaMinutes: e.slaMinutes, escalateTo: e.escalateTo }))
        }
      };

      await prisma.onboardingSession.upsert({
        where: { hotelId: session.hotelId },
        update: { step: 6, data: draftData },
        create: { hotelId: session.hotelId, step: 6, data: draftData },
      });
    }

    // 3. Reset ready_session cookie onboardingCompleted state
    const cookieStore = await cookies();
    const updatedPayload = {
      ...session,
      onboardingCompleted: false,
    };
    const encrypted = await encrypt(updatedPayload);
    cookieStore.set({
      name: 'ready_session',
      value: encrypted,
      httpOnly: true,
      expires: new Date(Date.now() + 2 * 60 * 60 * 1000), 
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset failed:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
