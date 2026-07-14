import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assignTaskDynamically } from '@/lib/dispatcher';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.hotelId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const hotelId = session.hotelId;

    let dbClips = await prisma.pttClip.findMany({
      where: { hotelId },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json({ clips: dbClips });
  } catch (error: any) {
    console.error('Fetch PTT error:', error);
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
    const { sender, duration, text, timestamp } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing PTT transcript text.' }, { status: 400 });
    }

    let transcriptText = text;
    let base64Audio = null;

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        transcriptText = parsed.text;
        base64Audio = parsed.audio;
      }
    } catch (e) {
      // Not a JSON text, treat text as raw transcript
    }

    // Process audio using Gemini if available
    if (base64Audio && base64Audio.startsWith('data:')) {
      const matches = base64Audio.match(/^data:([^;]+);base64,(.*)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const rawBase64 = matches[2];

        const apiKey = process.env.GEMINI_ROUTING_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: 'application/json' },
            });

            const prompt = `
You are the READY AI Walkie-Talkie Coordinator. You have received a push-to-talk audio clip from a hotel worker.
Your jobs:
1. Transcribe the audio message verbatim in English (translate if it's in another language like Filipino).
2. Determine if the message indicates a new task request or update that needs ticketing.
   - For example: "Room 304 needs towels" or "Lobby light bulb is broken" -> Task request.
   - For example: "I am going on break" or "Roger that" -> NOT a task request.
3. If it is a task request, extract:
   - "taskName": A short, clear task name (e.g. "Towel Delivery", "Light Bulb Replacement").
   - "department": One of: ["Front Desk", "Housekeeping", "Maintenance", "Food & Beverage", "Security", "Laundry"].
   - "difficulty": Workload difficulty 1-5.
   - "priority": Urgency level: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
   - "slaMinutes": SLA duration in minutes.
   - "room": Room number or area (e.g. "304", "Lobby", "Basement"), otherwise default to "General Area".

Your response must be a single valid JSON object matching this exact schema:
{
  "transcript": "Verbatim transcript of the voice message",
  "isTask": boolean,
  "taskDetails": {
    "taskName": "Concise task name",
    "department": "Housekeeping",
    "difficulty": number,
    "priority": "LOW",
    "slaMinutes": number,
    "room": "Room number"
  } | null
}
`;

            const result = await model.generateContent([
              {
                inlineData: {
                  data: rawBase64,
                  mimeType: mimeType
                }
              },
              prompt
            ]);

            const parsedRes = JSON.parse(result.response.text());
            if (parsedRes.transcript) {
              transcriptText = parsedRes.transcript;
            }

            if (parsedRes.isTask && parsedRes.taskDetails) {
              const details = parsedRes.taskDetails;
              const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}-${hotelId}`;

              const { workerId, isOverloaded } = await assignTaskDynamically(hotelId, details.department, {
                name: details.taskName,
                difficulty: details.difficulty || 2,
                priority: details.priority || 'MEDIUM',
                room: details.room || 'General Area',
                slaMinutes: details.slaMinutes || 30
              });

              await prisma.task.create({
                data: {
                  id: ticketId,
                  name: details.taskName,
                  dept: details.department,
                  room: details.room || 'General Area',
                  difficulty: details.difficulty || 2,
                  priority: details.priority || 'MEDIUM',
                  slaMinutes: details.slaMinutes || 30,
                  status: workerId ? 'in_progress' : 'backlog',
                  createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  workerId,
                  isOverloaded,
                  hotelId
                }
              });
            }
          } catch (aiErr) {
            console.error('Gemini audio transcription failed:', aiErr);
          }
        }
      }
    }

    const pttSaveText = base64Audio
      ? JSON.stringify({ text: transcriptText, audio: base64Audio })
      : text;

    const clip = await prisma.pttClip.create({
      data: {
        sender: sender || 'Staff Member',
        duration: duration || '0:05',
        text: pttSaveText,
        timestamp: timestamp || 'Just now',
        hotelId
      }
    });

    return NextResponse.json({ success: true, clip });
  } catch (error: any) {
    console.error('Save PTT error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

