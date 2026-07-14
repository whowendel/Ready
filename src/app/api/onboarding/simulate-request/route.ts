import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text } = body;
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Please enter a request description.' }, { status: 400 });
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
You are the READY AI Smart Dispatcher for a hotel. Read the following guest request or complaint:
"${text}"

Evaluate the text and extract:
1. "department": Choose exactly one matching department from this list: ["Front Desk", "Housekeeping", "Maintenance", "Food & Beverage", "Security", "Laundry"].
2. "taskName": A concise summary (e.g. "Towels Delivery", "AC Leaking Repair", "Lobby Noise Investigation").
3. "difficulty": A workload intensity rating from 1 to 5 (1 = Low intensity/minimal effort, 5 = Extremely intensive/heavy physical labor).
4. "priority": Urgency level: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
5. "slaMinutes": Recommened SLA target in minutes (e.g. 10, 20, 30, 45).
6. "room": Room number or location if mentioned, otherwise return "General Area".

Return a single valid JSON object matching this exact schema:
{
  "department": "Housekeeping",
  "taskName": "Extra Pillows Delivery",
  "difficulty": 2,
  "priority": "LOW",
  "slaMinutes": 15,
  "room": "104"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      ticket: {
        id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: parsed.taskName || "General Guest Assistance",
        dept: parsed.department || "Front Desk",
        room: parsed.room || "General Area",
        difficulty: Number(parsed.difficulty) || 2,
        priority: parsed.priority || "MEDIUM",
        slaMinutes: Number(parsed.slaMinutes) || 30,
        createdAt: new Date().toISOString(),
        status: "backlog", // Initial status
      }
    });
  } catch (error: any) {
    console.error('Failed to simulate guest request:', error);
    // Fallback parser in case of rate limits or failures
    return NextResponse.json({
      success: true,
      ticket: {
        id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
        name: "Guest Assistance Request",
        dept: "Front Desk",
        room: "General Area",
        difficulty: 2,
        priority: "MEDIUM",
        slaMinutes: 30,
        createdAt: new Date().toISOString(),
        status: "backlog"
      }
    });
  }
}
