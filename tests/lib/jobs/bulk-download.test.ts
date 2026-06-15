import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobStatus } from "@/lib/types";

const completedJob = {
  id: "880e8400-e29b-41d4-a716-446655440003",
  fileName: "invoice.pdf",
  mimeType: "application/pdf",
  blobUrl: "https://example.blob.vercel-storage.com/invoice.pdf",
  status: JobStatus.COMPLETED,
  progress: { current: 1, total: 1 },
  outputBlobUrl: "https://example.blob.vercel-storage.com/out.docx",
  createdAt: new Date().toISOString(),
};

describe("buildBulkDocxZip", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("builds zip for completed jobs and skips others", async () => {
    const { saveJob } = await import("@/lib/jobs/job-store");
    await saveJob(completedJob);
    await saveJob({
      ...completedJob,
      id: "990e8400-e29b-41d4-a716-446655440004",
      fileName: "queued.pdf",
      status: JobStatus.QUEUED,
      outputBlobUrl: undefined,
    });

    vi.doMock("@/lib/blob", () => ({
      fetchBlobBuffer: vi.fn(async () => Buffer.from("fake-docx")),
    }));

    const { buildBulkDocxZip } = await import("@/lib/jobs/bulk-download");
    const { buffer, included, skipped } = await buildBulkDocxZip([
      completedJob.id,
      "990e8400-e29b-41d4-a716-446655440004",
      "00000000-0000-4000-8000-000000000099",
    ]);

    expect(included).toEqual([completedJob.id]);
    expect(skipped).toHaveLength(2);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it("returns empty buffer when no downloadable jobs", async () => {
    const { buildBulkDocxZip } = await import("@/lib/jobs/bulk-download");
    const { buffer, included } = await buildBulkDocxZip([
      "00000000-0000-4000-8000-000000000099",
    ]);

    expect(included).toEqual([]);
    expect(buffer.length).toBe(0);
  });
});
