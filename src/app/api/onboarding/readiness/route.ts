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

    const body = await request.json().catch(() => ({}));
    const phase = Number(body.phase) || 1;

    const onboardingSession = await prisma.onboardingSession.findUnique({
      where: { hotelId: session.hotelId },
    });

    if (!onboardingSession) {
      return NextResponse.json({ error: 'Onboarding session not initialized.' }, { status: 404 });
    }

    const draftData = onboardingSession.data as any;

    // 1. Calculate Phase Scores Locally for deterministic checkpoints
    let phaseScore = 0;
    let isComplete = false;

    if (phase === 1) {
      const f = draftData.foundation || {};
      let validCount = 0;
      if (f.name?.trim().length > 0) validCount++;
      if (f.address?.trim().length > 0) validCount++;
      if (f.gmapsLocation?.trim().length > 0) validCount++;
      if (f.timezone?.trim().length > 0) validCount++;
      phaseScore = Math.round((validCount / 4) * 100);
      isComplete = phaseScore >= 80;
    } else if (phase === 2) {
      const rooms = draftData.roomTypes || [];
      const facilities = draftData.facilities || [];

      let roomScore = 0;
      if (rooms.length > 0) {
        let validRooms = 0;
        rooms.forEach((r: any) => {
          const hasBeds = typeof r.beds === 'object' && Object.keys(r.beds || {}).length > 0;
          const hasAmenities = Array.isArray(r.amenities) && r.amenities.length > 0;
          if (r.name?.trim().length > 0 && Number(r.capacity) > 0 && hasBeds && hasAmenities) {
            validRooms++;
          }
        });
        roomScore = Math.round((validRooms / rooms.length) * 100);
      }

      let facScore = 0;
      if (facilities.length > 0) {
        let validFacs = 0;
        facilities.forEach((f: any) => {
          const hasOpen = f.operatingHours?.open?.trim().length > 0;
          const hasClose = f.operatingHours?.close?.trim().length > 0;
          const capacity = Number(f.capacity) || 0;
          if (f.name?.trim().length > 0 && f.description?.trim().length > 0 && hasOpen && hasClose && capacity > 0) {
            validFacs++;
          }
        });
        facScore = Math.round((validFacs / facilities.length) * 100);
      }

      phaseScore = Math.round((roomScore + facScore) / 2);
      isComplete = phaseScore >= 80 && rooms.length > 0 && facilities.length > 0;
    } else if (phase === 3) {
      const depts = draftData.departments || [];
      if (depts.length > 0) {
        let validDepts = 0;
        depts.forEach((d: any) => {
          const wc = Number(d.workerCount) || 0;
          const hasShifts = Array.isArray(d.shifts) && d.shifts.length > 0;
          const hasTasks = Array.isArray(d.tasks) && d.tasks.length > 0;
          if (d.name?.trim().length > 0 && wc > 0 && hasShifts && hasTasks) {
            validDepts++;
          }
        });
        phaseScore = Math.round((validDepts / depts.length) * 100);
      }
      isComplete = phaseScore >= 80 && depts.length > 0;
    } else if (phase === 4) {
      const floors = draftData.floors || [];
      const floorCount = Number(draftData.foundation?.totalFloors) || 0;
      
      let validFloors = 0;
      if (floorCount > 0 && floors.length === floorCount) {
        floors.forEach((fl: any) => {
          const hasRooms = typeof fl.rooms === 'object' && Object.keys(fl.rooms || {}).length > 0;
          const hasDepts = Array.isArray(fl.departments) && fl.departments.length > 0;
          if (hasRooms && hasDepts) {
            validFloors++;
          }
        });
        phaseScore = Math.round((validFloors / floorCount) * 100);
      }
      isComplete = phaseScore >= 80 && floorCount > 0;
    } else if (phase === 5) {
      // Phase 5: Policies only (core policies strictly required to proceed)
      const policies = draftData.policies || [];
      const checkInPolicy = policies.find((p: any) => p.topic.toLowerCase() === "check-in & check-out" && p.rule?.trim().length > 0);
      const shiftPolicy = policies.find((p: any) => p.topic.toLowerCase() === "shift handover" && p.rule?.trim().length > 0);

      phaseScore = 0;
      if (checkInPolicy) phaseScore += 50;
      if (shiftPolicy) phaseScore += 50;
      isComplete = phaseScore === 100;
    } else if (phase === 6) {
      // Phase 6: Operational Blueprint tasks configurations
      const blueprintTasks = draftData.operationalBlueprint || [];
      if (blueprintTasks.length > 0) {
        let validTasks = 0;
        blueprintTasks.forEach((t: any) => {
          const recommended = Number(t.recommendedSLA) || 30;
          const adjusted = Number(t.adjustedSLA) || 30;
          const minSLA = Math.round(recommended * 0.5);
          const maxSLA = Math.round(recommended * 1.5);
          const slaValid = adjusted >= minSLA && adjusted <= maxSLA;
          
          if (t.name?.trim().length > 0 && Number(t.manpower) > 0 && t.role?.trim().length > 0 && slaValid) {
            validTasks++;
          }
        });
        phaseScore = Math.round((validTasks / blueprintTasks.length) * 100);
      }
      isComplete = phaseScore >= 80 && blueprintTasks.length > 0;
    }

    // 2. Filter Payload and Refine Prompt so Gemini only audits the active phase scope
    let auditPayload: any = {};
    let phaseFocus = "";

    if (phase === 1) {
      auditPayload = { foundation: draftData.foundation || {} };
      phaseFocus = "Focus ONLY on the general hotel information: hotel name, type, timezone, address, and Google Maps location URL. DO NOT mention or audit policies, rooms, amenities, facilities, floors, departments, workers, shifts, FAQs, or blueprints. These do not belong in Phase 1.";
    } else if (phase === 2) {
      auditPayload = {
        roomTypes: draftData.roomTypes || [],
        amenities: draftData.amenities || [],
        facilities: draftData.facilities || []
      };
      phaseFocus = "Focus ONLY on lodging room profiles, guest capacity, bed configurations (checkbox bed types and counters), room amenities (WiFi, etc.), property facilities (pool, bar, gym, restaurant, etc.), and their capacity and operating hours. If food facilities exist (bar, restaurant, kitchen), ask for their menus. DO NOT mention or audit departments, floors, workforces, shifts, rules, policies, or blueprints.";
    } else if (phase === 3) {
      auditPayload = {
        departments: draftData.departments || [],
        services: draftData.services || []
      };
      phaseFocus = "Focus ONLY on active departments (specifically including Housekeeping, F&B, Maintenance, Front Desk, Security, Laundry), worker counts, shift schedules, tasks, and task restrictions/rules. DO NOT mention or audit hotel general profile, rooms, facilities, floors, policies, or routing blueprints.";
    } else if (phase === 4) {
      auditPayload = {
        foundation: { totalFloors: draftData.foundation?.totalFloors },
        floors: draftData.floors || []
      };
      phaseFocus = "Focus ONLY on the floor profiles: total floors count, room type distribution count on each floor, responsible departments assigned to each floor, and floor plans. DO NOT complain about general policies, worker shifts, or blueprint routing rules.";
    } else if (phase === 5) {
      auditPayload = {
        policies: draftData.policies || []
      };
      phaseFocus = "Focus ONLY on hotel policies. (Check-in/out and Shift Handover policies are strictly mandatory, others are optional but recommended). DO NOT audit floor configurations, worker counts, or SLA routing blueprints.";
    } else if (phase === 6) {
      auditPayload = {
        operationalBlueprint: draftData.operationalBlueprint || [],
        blueprint: draftData.blueprint || {}
      };
      phaseFocus = "Focus on the Operational Blueprint task parameters: manpower count, executing role, frequency, time window, classification type (Mandatory vs Guest-Requested), and SLA adjustments (Must be within +/-50% of default). DO NOT complain about general profile address or floor plans.";
    }

    // 3. Call Gemini for Operations Auditor Intelligence with graceful fallback
    let warnings: string[] = [];
    let followUpQuestions: any[] = [];
    let templates: any[] = [];

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `
You are a senior Hotel Operations Auditor. Analyze this filtered onboarding draft for Phase ${phase}:
${JSON.stringify(auditPayload, null, 2)}

Audit Focus:
${phaseFocus}

Your response must be a single valid JSON object matching this exact schema:
{
  "warnings": [
    "Short text warning about operational risks or missing details in Phase ${phase}."
  ],
  "followUpQuestions": [
    {
      "topic": "Topic Name",
      "question": "Specific audit question to fill missing details for Phase ${phase}."
    }
  ],
  "templates": [
    {
      "title": "Template Title",
      "type": "policy" | "procedure" | "workflow",
      "content": "Full template content text."
    }
  ]
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsedGemini = JSON.parse(responseText);
      
      warnings = parsedGemini.warnings || [];
      followUpQuestions = parsedGemini.followUpQuestions || [];
      templates = parsedGemini.templates || [];
    } catch (apiError: any) {
      console.warn('Gemini API call failed, falling back to local heuristics:', apiError);
      warnings = [
        "⚠️ Gemini AI Auditor is temporarily hit by quota limits or unavailable. Falling back to local verification checklist.",
        `Error Details: ${apiError.message || String(apiError)}`
      ];
      // Generate basic follow-up questions locally depending on what's missing
      if (phase === 1) {
        const f = draftData.foundation || {};
        if (!f.name) followUpQuestions.push({ topic: "Hotel Profile", question: "Please provide your Hotel Name." });
        if (!f.address) followUpQuestions.push({ topic: "Location", question: "Please provide the complete street address." });
        if (!f.gmapsLocation) followUpQuestions.push({ topic: "Location Map", question: "Please paste a valid Google Maps embed or share link." });
      }
    }

    return NextResponse.json({
      phase,
      score: phaseScore,
      isComplete,
      warnings,
      followUpQuestions,
      templates,
    });
  } catch (error: any) {
    console.error('Failed to run phase-specific readiness audit:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
