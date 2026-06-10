import { kv } from "@vercel/kv";
import { getConfig } from "../config";
import type { Job } from "../types";

const memoryStore = new Map<string, Job>();
let warnedInMemory = false;

function jobKey(id: string): string {
  return `ocr:job:${id}`;
}

function isKvEnabled(): boolean {
  const config = getConfig();
  return Boolean(config.KV_REST_API_URL && config.KV_REST_API_TOKEN);
}

function warnInMemoryOnce(): void {
  if (!warnedInMemory && process.env.NODE_ENV === "development") {
    console.warn(
      "[job-store] KV not configured — using in-memory store (state lost on restart)",
    );
    warnedInMemory = true;
  }
}

export async function saveJob(job: Job): Promise<void> {
  if (isKvEnabled()) {
    const ttlSeconds = getConfig().JOB_TTL_HOURS * 3600;
    await kv.set(jobKey(job.id), job, { ex: ttlSeconds });
    return;
  }

  warnInMemoryOnce();
  memoryStore.set(job.id, job);
}

export async function getJob(id: string): Promise<Job | null> {
  if (isKvEnabled()) {
    return (await kv.get<Job>(jobKey(id))) ?? null;
  }

  return memoryStore.get(id) ?? null;
}

export async function listJobs(limit = 20): Promise<Job[]> {
  if (isKvEnabled()) {
    const keys = await kv.keys("ocr:job:*");
    const jobs = await Promise.all(
      keys.slice(0, limit * 2).map((key) => kv.get<Job>(key)),
    );
    return jobs
      .filter((job): job is Job => job !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  return [...memoryStore.values()]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export async function updateJob(
  id: string,
  patch: Partial<Job>,
): Promise<Job | null> {
  const existing = await getJob(id);
  if (!existing) {
    return null;
  }

  const updated: Job = { ...existing, ...patch };
  await saveJob(updated);
  return updated;
}
