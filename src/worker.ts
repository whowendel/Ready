import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { prisma } from './lib/prisma';
import { redisConnectionOptions } from './lib/queue';
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

console.log('🚀 READY Onboarding Queue Worker started...');

const worker = new Worker(
  'document-processing',
  async (job: Job) => {
    const { documentId, hotelId } = job.data;
    console.log(`[Job ${job.id}] Processing document ID: ${documentId} for hotel ID: ${hotelId}...`);

    const doc = await prisma.hotelDocument.findUnique({
      where: { id: Number(documentId) },
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

      const absolutePath = path.resolve(doc.filePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found at path: ${absolutePath}`);
      }

      console.log(`[Job ${job.id}] Uploading document to Gemini 2.5 Flash for structured extraction...`);
      const filePart = fileToGenerativePart(absolutePath, doc.mimeType);

      const prompt = `
You are a senior Hotel Operations Auditor AI. Perform a strategic document scan on the attached document to extract operational database entries.
Read the text thoroughly. If the document mentions check-in/checkout rules, visitor guidelines, pet/smoking rules, cancellations, or emergency instructions, extract and map them to the exact keys specified below.

Your response must be a single valid JSON object matching this exact schema. If a section is not mentioned in the text, leave its array empty []. Do not include markdown codeblocks (\`\`\`) or pre/post text.

JSON Schema:
{
  "departments": [
    // Map extracted departments. Standard names: "Housekeeping", "Front Desk", "Maintenance", "Food & Beverage", "Security"
    { "name": "Housekeeping" | "Front Desk" | "Maintenance" | "Food & Beverage" | "Security" | string, "description": "Short description of duties." }
  ],
  "roomTypes": [
    { "name": "Deluxe King" | string, "capacity": number, "bedTypes": string, "amenities": [string] }
  ],
  "amenities": [
    { "name": "WiFi" | string, "description": "Description." }
  ],
  "facilities": [
    { "name": "Gym" | string, "description": "Description.", "operatingHours": { "open": "HH:MM", "close": "HH:MM" } }
  ],
  "policies": [
    // MUST map rules into these exact four topics if found in the text:
    // - "Check-in & Check-out" (for check-in times, checkout times, key procedures)
    // - "Visitor Registration" (for visitor logins, overnight policies, room capacity limits)
    // - "Pets & Smoking" (for pet fee policies, smoking rules, penalty guidelines)
    // - "Cancellation & Refunds" (for cancel timelines, refund rates, deposits)
    { "topic": "Check-in & Check-out" | "Visitor Registration" | "Pets & Smoking" | "Cancellation & Refunds", "rule": "Full rules and details extracted from the text." }
  ],
  "faqs": [
    { "question": string, "answer": string }
  ],
  "emergencyProcedures": [
    // MUST map procedures into these exact two titles if found in the text:
    // - "Fire Evacuation" (for evacuation steps, assembly points)
    // - "Medical Emergency" (for medical protocol steps, paramedic contacts)
    { "title": "Fire Evacuation" | "Medical Emergency", "steps": [string], "contactInfo": "Direct phone extensions or external numbers" }
  ]
}
`;

      const result = await model.generateContent([prompt, filePart]);
      const responseText = result.response.text();
      console.log(`[Job ${job.id}] Received structured output from Gemini.`);

      const extractedData = JSON.parse(responseText);

      // Fetch or initialize Onboarding Session
      const session = await prisma.onboardingSession.findUnique({
        where: { hotelId: Number(hotelId) },
      });

      let currentData: any = {
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

      // Helper to merge arrays avoiding duplicate names
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

      // Merge newly extracted data into onboarding session draft
      const updatedData = {
        departments: mergeArrays(currentData.departments || [], extractedData.departments || [], 'name'),
        roomTypes: mergeArrays(currentData.roomTypes || [], extractedData.roomTypes || [], 'name'),
        amenities: mergeArrays(currentData.amenities || [], extractedData.amenities || [], 'name'),
        facilities: mergeArrays(currentData.facilities || [], extractedData.facilities || [], 'name'),
        policies: mergeArrays(currentData.policies || [], extractedData.policies || [], 'topic'),
        faqs: mergeArrays(currentData.faqs || [], extractedData.faqs || [], 'question'),
        emergencyProcedures: mergeArrays(currentData.emergencyProcedures || [], extractedData.emergencyProcedures || [], 'title'),
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

      console.log(`[Job ${job.id}] Successfully completed processing for document ID: ${documentId}`);
    } catch (err: any) {
      console.error(`[Job ${job.id}] Processing failed:`, err);

      await prisma.hotelDocument.update({
        where: { id: doc.id },
        data: {
          status: 'FAILED',
          extractedText: err.message || String(err),
        },
      });
    }
  },
  { connection: redisConnectionOptions }
);

worker.on('failed', (job, err) => {
  console.error(`Worker job ${job?.id} failed:`, err);
});
