import { describe, expect, it } from "vitest";
import { slimJobForStorage } from "@/lib/jobs/job-slim";
import { JobStatus, type Job } from "@/lib/types";

function makeJob(blockCount: number): Job {
  return {
    id: "job-1",
    fileName: "doc.pdf",
    mimeType: "application/pdf",
    blobUrl: "https://example.blob.vercel-storage.com/doc.pdf",
    status: JobStatus.COMPLETED,
    progress: { current: blockCount, total: blockCount },
    blocks: Array.from({ length: blockCount }, (_, index) => ({
      page: Math.floor(index / 10) + 1,
      type: "paragraph" as const,
      text: `Block ${index}`,
    })),
    createdAt: new Date().toISOString(),
  };
}

describe("slimJobForStorage", () => {
  it("keeps jobs with few blocks unchanged", () => {
    const job = makeJob(10);
    expect(slimJobForStorage(job)).toEqual(job);
  });

  it("truncates preview blocks for large jobs", () => {
    const job = makeJob(120);
    const slim = slimJobForStorage(job, 50);
    expect(slim.blocks).toHaveLength(50);
    expect(slim.blocksPreviewTruncated).toBe(true);
    expect(slim.blocksTotalCount).toBe(120);
  });
});
