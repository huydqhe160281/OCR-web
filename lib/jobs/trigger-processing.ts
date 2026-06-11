import { processJob } from "./process-job";

/**
 * Runs OCR pipeline for a job. Used by Next.js `after()` or future Inngest worker.
 */
export async function runJobProcessing(jobId: string): Promise<void> {
  await processJob(jobId);
}

/**
 * When USE_INNGEST=true, processing should be dispatched to Inngest instead of
 * inline `after()`. Wire `app/api/inngest/route.ts` when enabling background queue.
 */
export function shouldUseInngest(): boolean {
  return process.env.USE_INNGEST === "true";
}
