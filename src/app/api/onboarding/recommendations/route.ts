import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST() {
  try {
    const session = await getOrCreateDevSession();
    if (!session.hotelId) {
      return NextResponse.json({ error: 'No hotel associated with user.' }, { status: 400 });
    }

    const onboardingSession = await prisma.onboardingSession.findUnique({
      where: { hotelId: session.hotelId },
    });

    if (!onboardingSession) {
      return NextResponse.json({ error: 'Onboarding session not initialized.' }, { status: 404 });
    }

    const draftData = onboardingSession.data as any;
    const departments = draftData.departments || [];
    const facilities = draftData.facilities || [];
    const roomTypes = draftData.roomTypes || [];

    if (departments.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
You are a Hotel Operations Consultant AI. Given the following hotel onboarding data:
- Selected Departments: ${JSON.stringify(departments, null, 2)}
- Active Facilities: ${JSON.stringify(facilities, null, 2)}
- Room Categories: ${JSON.stringify(roomTypes, null, 2)}

Suggest a list of 5-8 standard operational services/tasks for each active department.
Guidelines:
1. Make recommendations heavily tailored to the Active Facilities. For example, if 'Bar' is checked, suggest bar services for F&B. If 'Swimming Pool' is checked, suggest pool maintenance/towel service tasks.
2. Make suggestions relevant to guest request ticket routing.
3. Suggest a 'rules' string for each service/task specifying operating restrictions (e.g. for safety, timing, or equipment).

Your response must be a single valid JSON array matching this exact schema:
[
  {
    "department": "Housekeeping",
    "services": [
      { 
        "name": "Room Cleaning", 
        "description": "Regular cleaning of the guest room.",
        "rules": "Staff must wear gloves and complete within 30 minutes."
      }
    ]
  }
]
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const recommendations = JSON.parse(responseText);

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error('Failed to generate service recommendations:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
