import { prisma } from './prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Helper to convert local file to generative part
function fileToGenerativePart(filePath: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
}

// Helper to merge arrays avoiding duplicate key values
const mergeArrays = (existing: any[], extracted: any[], keyName = 'name') => {
  const merged = [...existing];
  (extracted || []).forEach((item) => {
    const exists = merged.some(
      (e) => String(e[keyName]).toLowerCase() === String(item[keyName]).toLowerCase()
    );
    if (!exists) {
      merged.push(item);
    }
  });
  return merged;
};

export async function processDocumentInline(documentId: number, hotelId: number) {
  console.log(`[DocumentProcessor] Starting inline processing for document ID: ${documentId}, hotel ID: ${hotelId}...`);
  
  const doc = await prisma.hotelDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new Error(`Document with ID ${documentId} not found.`);
  }

  // Update status to processing
  await prisma.hotelDocument.update({
    where: { id: doc.id },
    data: { status: 'PROCESSING' },
  });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }

    // Initialize Gemini Client
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    let filePart;
    if (doc.filePath.startsWith('data:')) {
      const base64Data = doc.filePath.split(',')[1];
      filePart = {
        inlineData: {
          data: base64Data,
          mimeType: doc.mimeType,
        },
      };
    } else {
      const absolutePath = path.resolve(doc.filePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at path: ${absolutePath}`);
      }
      filePart = fileToGenerativePart(absolutePath, doc.mimeType);
    }

    console.log(`[DocumentProcessor] Querying Gemini for structured extraction...`);

    const prompt = `
You are a senior Hotel Operations Auditor AI. Perform a strategic document scan on the attached document to extract operational database entries.
Read the text thoroughly. If the document mentions check-in/checkout rules, shift handovers, visitor guidelines, pet/smoking rules, cancellations, or emergency instructions, extract and map them to the exact keys specified below.

Your response must be a single valid JSON object matching this exact schema. If a section is not mentioned in the text, leave its array empty [] (or leave its fields empty/null for objects). Do not include markdown codeblocks (\`\`\`) or pre/post text.

JSON Schema:
{
  "foundation": {
    "name": "Extract hotel name if mentioned, otherwise leave empty \"\"",
    "type": "Extract one of: \"Resort\", \"Boutique\", \"Business\", \"Airport\", \"Hostel\", or leave empty \"\"",
    "address": "Extract complete address if mentioned, otherwise leave empty \"\"",
    "timezone": "Extract timezone (e.g. \"Asia/Manila\", \"UTC\") if mentioned, otherwise leave empty \"\"",
    "totalRooms": "Extract total number of rooms as a number, or null/0 if not mentioned",
    "totalFloors": "Extract total number of floors as a number, or null/0 if not mentioned"
  },
  "departments": [
    // Map extracted departments. Standard names: "Housekeeping", "Front Desk", "Maintenance", "Food & Beverage", "Security"
    { "name": "Housekeeping" | "Front Desk" | "Maintenance" | "Food & Beverage" | "Security" | string, "description": "Short description of duties." }
  ],
  "roomTypes": [
    { 
      "name": "Deluxe King" | "Superior Room" | string, 
      "capacity": number, 
      "beds": [
        { "type": "King Bed" | "Queen Bed" | "Double Bed" | "Single Bed" | string, "count": number }
      ],
      "amenities": [string] 
    }
  ],
  "amenities": [
    { "name": "WiFi" | string, "description": "Description." }
  ],
  "facilities": [
    { 
      "name": "Swimming Pool" | "Restaurant" | "Gym" | "Bar" | "Spa" | "Conference Hall" | string, 
      "description": "Description.", 
      "capacity": number,
      "operatingHours": { "open": "HH:MM", "close": "HH:MM" },
      "details": { "menu": "If a restaurant/bar menu is mentioned, extract items here as text, otherwise empty" }
    }
  ],
  "policies": [
    // MUST map rules into these exact topics if found in the text:
    // - "Check-in & Check-out" (for check-in times, checkout times, key procedures)
    // - "Shift Handover" (for shift checklists, roster handovers, scheduling policies)
    // - "Visitor Registration" (for visitor logins, overnight policies, room capacity limits)
    // - "Pets & Smoking" (for pet fee policies, smoking rules, penalty guidelines)
    // - "Cancellation & Refunds" (for cancel timelines, refund rates, deposits)
    // - "<DepartmentName> Operating Rules" (e.g. "Housekeeping Operating Rules", "Front Desk Operating Rules")
    { "topic": "Check-in & Check-out" | "Shift Handover" | "Visitor Registration" | "Pets & Smoking" | "Cancellation & Refunds" | string, "rule": "Full rules and details extracted from the text." }
  ],
  "faqs": [
    { "question": string, "answer": string }
  ],
  "emergencyProcedures": [
    // MUST map procedures into these exact two titles if found in the text:
    // - "Fire Evacuation" (for evacuation steps, assembly points)
    // - "Medical Emergency" (for medical protocol steps, paramedic contacts)
    { "title": "Fire Evacuation" | "Medical Emergency", "steps": [string], "contactInfo": "Direct phone extensions or external numbers" }
  ],
  "phase2": {
    "departments": [
      // Map department shift timetables and task lists if mentioned in the document
      {
        "name": string,
        "description": string,
        "workerCount": number,
        "shifts": [
          { "name": string, "open": "HH:MM", "close": "HH:MM" }
        ],
        "tasks": [string]
      }
    ],
    "hierarchy": [
      // Map reporting roles hierarchies (parent is manager's role)
      { "name": string, "role": string, "parent": string }
    ],
    "employees": [
      // Map employee names, roles, departments, email, and mobile numbers
      { "firstName": string, "lastName": string, "email": string, "mobileNumber": string, "department": string, "role": string }
    ]
  }
}
`;

    const result = await model.generateContent([prompt, filePart]);
    const responseText = result.response.text();
    console.log(`[DocumentProcessor] Received response from Gemini. Parsing JSON...`);

    const extractedData = JSON.parse(responseText);

    // Fetch or initialize Onboarding Session
    const session = await prisma.onboardingSession.findUnique({
      where: { hotelId: Number(hotelId) },
    });

    let currentData: any = {
      foundation: {
        name: "",
        type: "Resort",
        totalRooms: 100,
        totalFloors: 4,
        timezone: "UTC",
        address: "",
        gmapsLocation: "",
      },
      departments: [],
      roomTypes: [],
      amenities: [],
      facilities: [],
      policies: [],
      faqs: [],
      emergencyProcedures: [],
    };

    if (session) {
      currentData = session.data as any;
    }

    // --- Merge Foundation Details ---
    const currentFoundation = currentData.foundation || {};
    const extractedFoundation = extractedData.foundation || {};
    const updatedFoundation = {
      name: currentFoundation.name || extractedFoundation.name || "",
      type: currentFoundation.type || extractedFoundation.type || "Resort",
      address: currentFoundation.address || extractedFoundation.address || "",
      gmapsLocation: currentFoundation.gmapsLocation || extractedFoundation.gmapsLocation || "",
      timezone: currentFoundation.timezone || extractedFoundation.timezone || "UTC",
      totalRooms: currentFoundation.totalRooms || Number(extractedFoundation.totalRooms) || 100,
      totalFloors: currentFoundation.totalFloors || Number(extractedFoundation.totalFloors) || 4,
    };

    // --- Merge Room Types & format beds structure for UI ---
    const processedRoomTypes = (extractedData.roomTypes || []).map((r: any) => {
      const bedsObj: Record<string, number> = {};
      (r.beds || []).forEach((b: any) => {
        if (b.type && b.count) {
          bedsObj[b.type] = Number(b.count);
        }
      });
      // Fallback if empty
      if (Object.keys(bedsObj).length === 0) {
        bedsObj["King Bed"] = 1;
      }
      const bedSummary = Object.entries(bedsObj)
        .filter(([_, count]) => Number(count) > 0)
        .map(([type, count]) => `${count} ${type}${Number(count) > 1 ? "s" : ""}`)
        .join(", ") || "No beds defined";

      return {
        name: r.name,
        capacity: Number(r.capacity) || 2,
        beds: bedsObj,
        bedTypes: bedSummary,
        amenities: r.amenities || ["WiFi"]
      };
    });

    // --- Merge Facilities ---
    const processedFacilities = (extractedData.facilities || []).map((f: any) => {
      return {
        name: f.name,
        description: f.description || `Property ${f.name} zone.`,
        capacity: Number(f.capacity) || 50,
        operatingHours: {
          open: f.operatingHours?.open || "08:00",
          close: f.operatingHours?.close || "22:00"
        },
        details: {
          menu: f.details?.menu || ""
        }
      };
    });

    // --- Merge Phase 2 Workforce Planning ---
    const currentPhase2 = currentData.phase2 || {
      step: 1,
      departments: [],
      hierarchy: [],
      employees: [],
      permissions: {}
    };

    const extractedPhase2 = extractedData.phase2 || {};
    const updatedPhase2 = {
      step: currentPhase2.step || 1,
      departments: mergeArrays(currentPhase2.departments || [], extractedPhase2.departments || [], 'name'),
      hierarchy: mergeArrays(currentPhase2.hierarchy || [], extractedPhase2.hierarchy || [], 'role'),
      employees: mergeArrays(currentPhase2.employees || [], extractedPhase2.employees || [], 'email'),
      permissions: {
        ...(currentPhase2.permissions || {}),
        ...(extractedPhase2.permissions || {})
      }
    };

    // --- Merge All Arrays and save back to Onboarding Session ---
    const updatedData = {
      foundation: updatedFoundation,
      departments: mergeArrays(currentData.departments || [], extractedData.departments || [], 'name'),
      roomTypes: mergeArrays(currentData.roomTypes || [], processedRoomTypes, 'name'),
      amenities: mergeArrays(currentData.amenities || [], extractedData.amenities || [], 'name'),
      facilities: mergeArrays(currentData.facilities || [], processedFacilities, 'name'),
      policies: mergeArrays(currentData.policies || [], extractedData.policies || [], 'topic'),
      faqs: mergeArrays(currentData.faqs || [], extractedData.faqs || [], 'question'),
      emergencyProcedures: mergeArrays(currentData.emergencyProcedures || [], extractedData.emergencyProcedures || [], 'title'),
      phase2: updatedPhase2
    };

    // Save onboarding session
    await prisma.onboardingSession.upsert({
      where: { hotelId: Number(hotelId) },
      create: {
        hotelId: Number(hotelId),
        step: 1,
        data: updatedData,
      },
      update: {
        data: updatedData,
      },
    });

    // Update document status
    await prisma.hotelDocument.update({
      where: { id: doc.id },
      data: {
        status: 'COMPLETED',
        extractedText: responseText,
      },
    });

    console.log(`[DocumentProcessor] Successfully completed processing for document ID: ${documentId}`);
  } catch (err: any) {
    console.error(`[DocumentProcessor] Processing failed for document ID: ${documentId}:`, err);

    await prisma.hotelDocument.update({
      where: { id: doc.id },
      data: {
        status: 'FAILED',
        extractedText: err.message || String(err),
      },
    });
    throw err;
  }
}
