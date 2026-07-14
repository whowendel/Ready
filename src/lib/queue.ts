import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const getRedisOptions = () => {
  try {
    const url = new URL(REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

export const redisConnectionOptions = getRedisOptions();

let queueInstance: Queue | null = null;

export const getDocumentQueue = (): Queue => {
  if (!queueInstance) {
    const globalForQueue = global as unknown as { documentQueue: Queue };
    queueInstance =
      globalForQueue.documentQueue ||
      new Queue('document-processing', {
        connection: redisConnectionOptions,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });

    if (process.env.NODE_ENV !== 'production') {
      globalForQueue.documentQueue = queueInstance;
    }
  }
  return queueInstance;
};

