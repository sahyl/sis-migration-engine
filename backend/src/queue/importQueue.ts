import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const importQueue = new Queue("import-batches", { connection });

const BATCH_SIZE = 500;

export async function enqueueJob(jobId: string, schoolId: string, rowIds: number[]): Promise<void> {
  for (let i = 0; i < rowIds.length; i += BATCH_SIZE) {
    const batch = rowIds.slice(i, i + BATCH_SIZE);
    await importQueue.add("process-batch", { jobId, schoolId, rowIds: batch });
  }
}
