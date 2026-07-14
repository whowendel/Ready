import { NextResponse } from 'next/server';
import { getOrCreateDevSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
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
    const body = await request.json();
    const approvedServices = body.services || []; // Array of services from Step 2

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
You are a Hotel Operations Architect AI. Build an Operations Blueprint (routing, priorities, response times, and escalation trees) for these approved services:
${JSON.stringify(approvedServices, null, 2)}

Your response must be a single valid JSON object matching this exact schema:
{
  "routing": [
    { "trigger": "Room Cleaning", "department": "Housekeeping" },
    { "trigger": "Air Conditioning Repair", "department": "Maintenance" }
  ],
  "priority": [
    { "trigger": "Room Cleaning", "priority": "LOW" },
    { "trigger": "Air Conditioning Repair", "priority": "HIGH" },
    { "trigger": "Medical Emergency", "priority": "CRITICAL" }
  ],
  "sla": [
    { "trigger": "Room Cleaning", "slaMinutes": 20 },
    { "trigger": "Air Conditioning Repair", "slaMinutes": 45 }
  ],
  "escalation": [
    { "trigger": "Room Cleaning", "slaMinutes": 30, "escalateTo": "Supervisor" },
    { "trigger": "Air Conditioning Repair", "slaMinutes": 60, "escalateTo": "Department Manager" }
  ]
}

Valid priorities: LOW, MEDIUM, HIGH, CRITICAL.
Valid escalation targets: Supervisor, Department Manager, General Manager.
Ensure every approved service has routing, priority, SLA, and escalation rules.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const blueprint = JSON.parse(responseText);

    return NextResponse.json({ blueprint });
  } catch (error: any) {
    console.error('Failed to generate operational blueprint:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
