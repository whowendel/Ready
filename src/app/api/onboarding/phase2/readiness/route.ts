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
    const step = Number(body.step) || 1;

    const hotelId = session.hotelId;

    const onboardingSession = await prisma.onboardingSession.findUnique({
      where: { hotelId },
    });

    if (!onboardingSession) {
      return NextResponse.json({ error: 'Onboarding session not initialized.' }, { status: 404 });
    }

    const draftData = onboardingSession.data as any;
    const p2 = draftData.phase2 || {};

    const depts = p2.departments || [];
    const hierarchy = p2.hierarchy || [];
    const employees = p2.employees || [];
    const permissions = p2.permissions || {};

    // 1. Calculate Phase 2 validation metrics locally
    let deptsScore = 0;
    if (depts.length > 0) {
      let valid = 0;
      depts.forEach((d: any) => {
        const shifts = d.shifts || [];
        if (d.name?.trim().length > 0 && d.description?.trim().length > 0 && shifts.length > 0) {
          valid++;
        }
      });
      deptsScore = Math.round((valid / depts.length) * 100);
    }

    let hierarchyScore = 0;
    if (hierarchy.length > 0) {
      let validRoles = 0;
      hierarchy.forEach((h: any) => {
        if (h.name?.trim().length > 0 && h.role?.trim().length > 0) {
          validRoles++;
        }
      });
      hierarchyScore = Math.round((validRoles / hierarchy.length) * 100);
    }

    let employeeScore = 0;
    let warnings: string[] = [];
    if (depts.length > 0) {
      let staffedDepts = 0;
      depts.forEach((d: any) => {
        const hasStaff = employees.some((e: any) => e.department?.toLowerCase() === d.name?.toLowerCase());
        if (hasStaff) {
          staffedDepts++;
        } else {
          warnings.push(`Department "${d.name}" does not have any staff members assigned yet.`);
        }
      });
      employeeScore = Math.round((staffedDepts / depts.length) * 100);
    }

    let managerScore = 0;
    if (depts.length > 0) {
      let hasManagers = 0;
      depts.forEach((d: any) => {
        const hasMgr = employees.some((e: any) => 
          e.department?.toLowerCase() === d.name?.toLowerCase() && 
          e.role?.toLowerCase().includes('manager')
        );
        if (hasMgr) {
          hasManagers++;
        } else {
          warnings.push(`Department "${d.name}" is missing a designated Department Manager.`);
        }
      });
      managerScore = Math.round((hasManagers / depts.length) * 100);
    }

    const overallReadiness = Math.round((deptsScore + hierarchyScore + employeeScore + managerScore) / 4);
    const isComplete = overallReadiness >= 80 && employees.length > 0;

    // 2. Call Gemini for automated Workforce Gaps Analysis with graceful fallback
    let allWarnings = [...warnings];
    let recommendations: string[] = [];

    try {
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

      const auditPayload = {
        departments: depts,
        hierarchy,
        employeesCount: employees.length,
        employeesSample: employees.slice(0, 5),
        permissions,
      };

      const prompt = `
You are a senior Workforce Planning & Security Auditor. Analyze this draft workforce configuration for Step ${step} of Phase 2 (Employee Onboarding & Department Configuration):
${JSON.stringify(auditPayload, null, 2)}

Identify any critical staffing gaps, reporting anomalies (e.g. role without supervisor), security permission risks (e.g. receptionist having full Admin access), or worker capacity concerns.

Return a single valid JSON object matching this exact schema:
{
  "warnings": [
    "Short warning about staffing gaps, manager shortages, or permission over-privileges."
  ],
  "recommendations": [
    "Actionable hiring, role allocation, or permission tweak suggestion."
  ]
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsedGemini = JSON.parse(responseText);

      // Merge local warnings with Gemini warnings
      allWarnings = Array.from(new Set([...warnings, ...(parsedGemini.warnings || [])]));
      recommendations = parsedGemini.recommendations || [];
    } catch (apiError: any) {
      console.warn('Gemini API call failed for Phase 2, falling back to local heuristics:', apiError);
      allWarnings.push("⚠️ Gemini AI Auditor is temporarily hit by quota limits or unavailable. Falling back to local verification checklist.");
      allWarnings.push(`Error Details: ${apiError.message || String(apiError)}`);
      recommendations.push("Ensure departments have shift windows and at least 1 manager defined.");
    }

    return NextResponse.json({
      score: {
        deptsScore,
        hierarchyScore,
        employeeScore,
        managerScore,
        overallReadiness,
      },
      isComplete,
      warnings: allWarnings,
      recommendations,
    });
  } catch (error: any) {
    console.error('Failed Phase 2 audit:', error);
    return NextResponse.json({
      score: { deptsScore: 0, hierarchyScore: 0, employeeScore: 0, managerScore: 0, overallReadiness: 0 },
      isComplete: false,
      warnings: ["Unable to contact AI Auditor. Please ensure your inputs are complete."],
      recommendations: ["Ensure departments have shift windows and at least 1 manager defined."],
    });
  }
}
