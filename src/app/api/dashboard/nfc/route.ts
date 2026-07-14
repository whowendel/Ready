import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotelId = session.hotelId;

    const tags = await prisma.nfcTag.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
    });

    let services = await prisma.service.findMany({
      where: {
        department: { hotelId }
      },
      include: {
        department: true
      }
    });

    if (services.length === 0) {
      // Auto-seed default services for this hotel's departments
      const depts = await prisma.department.findMany({ where: { hotelId } });
      const defaultServicesMap: Record<string, { name: string, desc: string }[]> = {
        'housekeeping': [
          { name: 'Room Cleaning', desc: 'Regular cleaning of guest room.' },
          { name: 'Linen Exchange', desc: 'Fresh bedsheets and towels.' },
          { name: 'Turndown Service', desc: 'Evening bed preparation.' },
          { name: 'Trash Collection', desc: 'Emptying room waste bins.' },
          { name: 'Restock Amenities', desc: 'Replenishing coffee, soaps, shampoos.' }
        ],
        'maintenance': [
          { name: 'Air Conditioning Repair', desc: 'Troubleshoot and fix AC unit issues.' },
          { name: 'Plumbing Repair', desc: 'Unclog drains or fix pipe leaks.' },
          { name: 'TV Repair', desc: 'Fix TV display or connection issues.' },
          { name: 'Lightbulb Replacement', desc: 'Replace burnt out lightbulbs.' }
        ],
        'front desk': [
          { name: 'Keycard Re-programming', desc: 'Re-program card if access fails.' },
          { name: 'Luggage Assistance', desc: 'Request help moving bags to room.' },
          { name: 'Wake-up Call', desc: 'Schedule morning alarm call.' }
        ],
        'food & beverage': [
          { name: 'Room Service Meal Delivery', desc: 'Deliver ordered food to room.' },
          { name: 'Table Reservation', desc: 'Book a table at hotel restaurant.' }
        ],
        'security': [
          { name: 'Noise Complaint', desc: 'Report loud disturbances.' },
          { name: 'Lost Item Report', desc: 'Report misplaced guest items.' }
        ],
        'laundry': [
          { name: 'Wash Sheets', desc: 'Laundry service for linens.' },
          { name: 'Iron Uniforms', desc: 'Pressing services.' }
        ]
      };

      for (const dept of depts) {
        const nameKey = dept.name.toLowerCase();
        const svcs = defaultServicesMap[nameKey] || [];
        for (const s of svcs) {
          await prisma.service.create({
            data: {
              departmentId: dept.id,
              name: s.name,
              description: s.desc,
              isActive: true
            }
          });
        }
      }

      // Re-fetch
      services = await prisma.service.findMany({
        where: { department: { hotelId } },
        include: { department: true }
      });
    }

    return NextResponse.json({
      success: true,
      tags,
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        dept: s.department.name
      }))
    });
  } catch (error: any) {
    console.error('Fetch NFC tags error:', error);
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
    const { action, id, roomNumber, location, displayName, services, menuItems } = body;

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ error: 'Missing tag ID.' }, { status: 400 });
      }

      await prisma.nfcTag.delete({
        where: { id, hotelId },
      });

      return NextResponse.json({ success: true, message: 'NFC Tag deleted successfully.' });
    }

    if (!roomNumber || !location || !displayName || !services) {
      return NextResponse.json({ error: 'Missing required tag parameters.' }, { status: 400 });
    }

    if (action === 'update') {
      if (!id) {
        return NextResponse.json({ error: 'Missing tag ID for update.' }, { status: 400 });
      }

      const updatedTag = await prisma.nfcTag.update({
        where: { id, hotelId },
        data: {
          roomNumber,
          location,
          displayName,
          services: services || [],
          menuItems: menuItems || null,
        },
      });

      return NextResponse.json({ success: true, tag: updatedTag });
    }

    // Default: Create
    const newTag = await prisma.nfcTag.create({
      data: {
        hotelId,
        roomNumber,
        location,
        displayName,
        services: services || [],
        menuItems: menuItems || null,
      },
    });

    return NextResponse.json({ success: true, tag: newTag });
  } catch (error: any) {
    console.error('Save NFC tag error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
