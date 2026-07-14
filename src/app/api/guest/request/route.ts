import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assignTaskDynamically } from '@/lib/dispatcher';
import { formatPHTDate } from '@/lib/time';

const promptTemplate = (text: string) => `
You are the READY AI Smart Dispatcher. Guest request: "${text}"
Evaluate and extract:
1. "department": One of: ["Front Desk", "Housekeeping", "Maintenance", "Food & Beverage", "Security", "Laundry"].
2. "taskName": Concise summary.
3. "difficulty": Workload intensity 1-5.
4. "priority": "LOW", "MEDIUM", "HIGH", or "CRITICAL".
5. "slaMinutes": Recommended SLA target in minutes.

Return a single valid JSON object:
{
  "department": "Housekeeping",
  "taskName": "Extra Pillows Delivery",
  "difficulty": 2,
  "priority": "LOW",
  "slaMinutes": 15
}
`;

async function routeWithGemini(text: string, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(promptTemplate(text));
  return JSON.parse(result.response.text());
}

async function routeWithOpenAI(text: string, apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: promptTemplate(text) }],
      temperature: 0.1
    })
  });
  if (!res.ok) {
    throw new Error(`OpenAI API request failed: status ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI completion response.");
  return JSON.parse(content);
}

function routeWithLocalHeuristics(text: string) {
  const lText = text.toLowerCase();
  let department = "Front Desk";
  let taskName = "Guest Assistance Request";
  let difficulty = 2;
  let priority = "MEDIUM";
  let slaMinutes = 30;

  if (lText.includes("clean") || lText.includes("towel") || lText.includes("pillow") || lText.includes("soap") || lText.includes("shampoo") || lText.includes("bed") || lText.includes("sheet")) {
    department = "Housekeeping";
    taskName = "Housekeeping Service Request";
    slaMinutes = 20;
  } else if (lText.includes("leak") || lText.includes("clog") || lText.includes("toilet") || lText.includes("ac") || lText.includes("aircon") || lText.includes("light") || lText.includes("tv") || lText.includes("remote") || lText.includes("broken")) {
    department = "Maintenance";
    taskName = "Maintenance Repair Request";
    priority = "HIGH";
    slaMinutes = 45;
  } else if (lText.includes("food") || lText.includes("drink") || lText.includes("water") || lText.includes("beer") || lText.includes("wine") || lText.includes("coke") || lText.includes("menu") || lText.includes("breakfast") || lText.includes("dinner")) {
    department = "Food & Beverage";
    taskName = "F&B Delivery Request";
    priority = "HIGH";
    slaMinutes = 20;
  } else if (lText.includes("laundry") || lText.includes("wash") || lText.includes("dry") || lText.includes("iron")) {
    department = "Laundry";
    taskName = "Laundry Service Request";
    slaMinutes = 60;
  } else if (lText.includes("safe") || lText.includes("lock") || lText.includes("lost") || lText.includes("suspicious") || lText.includes("theft") || lText.includes("danger")) {
    department = "Security";
    taskName = "Security Verification";
    priority = "CRITICAL";
    slaMinutes = 10;
  }

  return { department, taskName, difficulty, priority, slaMinutes };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tagId, requestType, serviceName, deptName, items, text } = body;

    if (!tagId || !requestType) {
      return NextResponse.json({ error: 'Missing tag ID or request type.' }, { status: 400 });
    }

    const tag = await prisma.nfcTag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      return NextResponse.json({ error: 'NFC configuration not found.' }, { status: 404 });
    }

    const hotelId = tag.hotelId;
    const room = tag.roomNumber;
    
    // Collision-free ticketId generation combining last 4 digits of timestamp and a random number
    const ticketId = `TKT-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}-${hotelId}`;

    let taskName = '';
    let targetDept = deptName || 'Housekeeping';
    let difficulty = 2;
    let priority = 'MEDIUM';
    let slaMinutes = 30;

    if (requestType === 'service') {
      if (!serviceName) {
        return NextResponse.json({ error: 'Missing service name.' }, { status: 400 });
      }
      taskName = serviceName;
      // Resolve priority and SLA based on hotel's priority rules if available
      const rule = await prisma.priorityRule.findFirst({
        where: { hotelId, trigger: { equals: serviceName, mode: 'insensitive' } }
      });
      if (rule) {
        priority = rule.priority;
      }
      const esc = await prisma.escalationRule.findFirst({
        where: { hotelId, trigger: { equals: serviceName, mode: 'insensitive' } }
      });
      if (esc) {
        slaMinutes = esc.slaMinutes;
      }
    } else if (requestType === 'order') {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'Missing food order items.' }, { status: 400 });
      }
      const orderSummary = items.map((i: any) => `${i.name} x${i.quantity}`).join(', ');
      taskName = `F&B Order: ${orderSummary}`;
      targetDept = 'Food & Beverage';
      difficulty = 3;
      priority = 'HIGH';
      slaMinutes = 20;
    } else if (requestType === 'others') {
      if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: 'Please describe your request.' }, { status: 400 });
      }

      // Dynamic smart dispatcher with fallback cascade (Gemini -> OpenAI -> Local Heuristic)
      let parsed: any = null;

      // 1. Try Gemini Primary
      const geminiKey = process.env.GEMINI_ROUTING_API_KEY || process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          parsed = await routeWithGemini(text, geminiKey);
        } catch (err) {
          console.warn("Gemini dispatcher failed, trying OpenAI...", err);
        }
      }

      // 2. Try OpenAI Fallback
      if (!parsed && process.env.OPENAI_API_KEY) {
        try {
          parsed = await routeWithOpenAI(text, process.env.OPENAI_API_KEY);
        } catch (err) {
          console.warn("OpenAI dispatcher failed, falling back to heuristics...", err);
        }
      }

      // 3. Try Local Heuristics Fallback
      if (!parsed) {
        parsed = routeWithLocalHeuristics(text);
      }

      taskName = parsed.taskName || 'Guest Assistance Request';
      targetDept = parsed.department || 'Front Desk';
      difficulty = Number(parsed.difficulty) || 2;
      priority = parsed.priority || 'MEDIUM';
      slaMinutes = Number(parsed.slaMinutes) || 30;
    }

    // Workload-balanced worker assignment
    const { workerId, isOverloaded } = await assignTaskDynamically(hotelId, targetDept, {
      name: taskName,
      difficulty,
      priority,
      room,
      slaMinutes
    });

    const task = await prisma.task.create({
      data: {
        id: ticketId,
        name: taskName,
        dept: targetDept,
        room,
        difficulty,
        priority,
        slaMinutes,
        status: workerId ? 'in_progress' : 'backlog',
        createdAt: formatPHTDate(),
        workerId,
        isOverloaded,
        hotelId
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Guest request creation error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
