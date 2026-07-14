import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from './lib/queue';
import { processDocumentInline } from './lib/documentProcessor';

console.log('🚀 READY Onboarding Queue Worker started...');

const worker = new Worker(
  'document-processing',
  async (job: Job) => {
    const { documentId, hotelId } = job.data;
    console.log(`[Job ${job.id}] Processing document ID: ${documentId} for hotel ID: ${hotelId}...`);
    try {
      await processDocumentInline(Number(documentId), Number(hotelId));
      console.log(`[Job ${job.id}] Successfully processed document ID: ${documentId}`);
    } catch (err: any) {
      console.error(`[Job ${job.id}] Failed to process document ID: ${documentId}:`, err);
      throw err;
    }
  },
  { connection: redisConnectionOptions }
);

worker.on('failed', (job, err) => {
  console.error(`Worker job ${job?.id} failed:`, err);
});
