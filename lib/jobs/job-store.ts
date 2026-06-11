import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { kv } from "@vercel/kv";
import { assertProductionKvConfigured, getConfig } from "../config";
import { slimJobForStorage } from "./job-slim";
import { JobStatus, type Job } from "../types";

const memoryCache = new Map<string, Job>();
let warnedDevStore = false;

function jobKey(id: string): string {
  return `ocr:job:${id}`;
}

function isKvEnabled(): boolean {
  const config = getConfig();
  return Boolean(config.KV_REST_API_URL && config.KV_REST_API_TOKEN);
}

function devJobsDir(): string {
  return path.join(process.cwd(), ".tmp", "ocr-jobs");
}

function devJobFile(id: string): string {
  return path.join(devJobsDir(), `${id}.json`);
}

function warnDevStoreOnce(): void {
  if (warnedDevStore) {
    return;
  }
  warnedDevStore = true;
  console.warn(
    "[job-store] KV not configured — persisting jobs under .tmp/ocr-jobs/",
  );
}

async function readDevJob(id: string): Promise<Job | null> {
  const cached = memoryCache.get(id);
  if (cached) {
    return cached;
  }

  try {
    const raw = await readFile(devJobFile(id), "utf8");
    const job = JSON.parse(raw) as Job;
    memoryCache.set(id, job);
    return job;
  } catch {
    return null;
  }
}

async function writeDevJob(job: Job): Promise<void> {
  warnDevStoreOnce();
  await mkdir(devJobsDir(), { recursive: true });
  await writeFile(devJobFile(job.id), JSON.stringify(job), "utf8");
  memoryCache.set(job.id, job);
}

export async function saveJob(job: Job): Promise<void> {
  assertProductionKvConfigured();

  const persisted = slimJobForStorage(job);

  if (isKvEnabled()) {
    const ttlSeconds = getConfig().JOB_TTL_HOURS * 3600;
    await kv.set(jobKey(job.id), persisted, { ex: ttlSeconds });
    return;
  }

  await writeDevJob(persisted);
}

export async function getJob(id: string): Promise<Job | null> {
  if (isKvEnabled()) {
    return (await kv.get<Job>(jobKey(id))) ?? null;
  }

  return readDevJob(id);
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

  warnDevStoreOnce();
  let ids: string[] = [];
  try {
    const files = await readdir(devJobsDir());
    ids = files.filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5));
  } catch {
    return [...memoryCache.values()]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  const jobs = (
    await Promise.all(ids.map((id) => readDevJob(id)))
  ).filter((job): job is Job => job !== null);

  return jobs
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

export async function updateJobIfStatus(
  id: string,
  expectedStatus: JobStatus,
  patch: Partial<Job>,
): Promise<Job | null> {
  const existing = await getJob(id);
  if (!existing || existing.status !== expectedStatus) {
    return null;
  }

  const updated: Job = { ...existing, ...patch };
  await saveJob(updated);
  return updated;
}

export async function tryClaimJobProcessing(id: string): Promise<boolean> {
  const updated = await updateJobIfStatus(id, JobStatus.QUEUED, {
    status: JobStatus.PROCESSING,
  });
  return updated !== null;
}
