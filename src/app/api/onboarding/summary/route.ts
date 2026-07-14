import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { mockOnboardingData } from '@/lib/mockOnboardingData';

export async function GET() {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      // Fallback to mock data if no session exists (e.g. clean dev environment)
      return NextResponse.json({ summary: mockOnboardingData, source: "mock" });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: session.hotelId },
      include: {
        departments: {
          include: { services: true }
        },
        roomTypes: {
          include: { amenities: true }
        },
        facilities: true,
        policies: true,
        routingRules: true,
        priorityRules: true,
        escalationRules: true,
      }
    });

    if (!hotel || hotel.roomTypes.length === 0) {
      // Fallback to mock data if hotel is not finalized or empty
      return NextResponse.json({ summary: mockOnboardingData, source: "mock_fallback" });
    }

    // Map database relations back to the wizard summary schema
    const summaryData = {
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
      operationalBlueprint: (hotel.settings as any)?.operationalBlueprint || [],
      policies: hotel.policies.map(p => ({
        topic: p.topic,
        rule: p.rule
      })),
      blueprint: {
        routing: hotel.routingRules.map(r => ({ trigger: r.trigger, department: r.trigger })),
        priority: hotel.priorityRules.map(p => ({ trigger: p.trigger, priority: p.priority })),
        escalation: hotel.escalationRules.map(e => ({ trigger: e.trigger, slaMinutes: e.slaMinutes, escalateTo: e.escalateTo }))
      }
    };

    return NextResponse.json({ summary: summaryData, source: "database" });
  } catch (error: any) {
    console.error('Failed to fetch summary data:', error);
    return NextResponse.json({ summary: mockOnboardingData, source: "mock_error_fallback" });
  }
}
