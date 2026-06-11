import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobStatus } from "@/lib/types";

describe("job-store production KV gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws on Vercel when KV is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.resetModules();

    const { saveJob } = await import("@/lib/jobs/job-store");
    await expect(
      saveJob({
        id: "550e8400-e29b-41d4-a716-446655440000",
        fileName: "a.pdf",
        mimeType: "application/pdf",
        blobUrl: "https://example.blob.vercel-storage.com/a.pdf",
        status: JobStatus.QUEUED,
        progress: { current: 0, total: 0 },
        createdAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(/KV not configured on Vercel/);
  });
});

describe("tryClaimJobProcessing", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows only one processing claim", async () => {
    const { saveJob, tryClaimJobProcessing, getJob } = await import(
      "@/lib/jobs/job-store"
    );
    const job = {
      id: "660e8400-e29b-41d4-a716-446655440001",
      fileName: "b.pdf",
      mimeType: "application/pdf",
      blobUrl: "https://example.blob.vercel-storage.com/b.pdf",
      status: JobStatus.QUEUED,
      progress: { current: 0, total: 0 },
      createdAt: new Date().toISOString(),
    };

    await saveJob(job);

    const first = await tryClaimJobProcessing(job.id);
    const second = await tryClaimJobProcessing(job.id);
    const stored = await getJob(job.id);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(stored?.status).toBe(JobStatus.PROCESSING);
  });
});
