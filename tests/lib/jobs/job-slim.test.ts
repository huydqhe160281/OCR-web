import { describe, expect, it } from "vitest";
import { slimJobForStorage } from "@/lib/jobs/job-slim";
import {
  JobStatus,
  LayoutRegion,
  OcrBlockType,
  type Job,
} from "@/lib/types";

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
      type: OcrBlockType.PARAGRAPH,
      text: `Block ${index}`,
      bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.05 },
      region: LayoutRegion.LEFT,
    })),
    createdAt: new Date().toISOString(),
  };
}

describe("slimJobForStorage", () => {
  it("keeps jobs with few blocks unchanged except layout fields stripped", () => {
    const job = makeJob(10);
    const slim = slimJobForStorage(job);
    expect(slim.blocks).toHaveLength(10);
    expect(slim.blocks?.every((block) => !("bbox" in block) && !("region" in block))).toBe(
      true,
    );
  });

  it("truncates preview blocks for large jobs", () => {
    const job = makeJob(120);
    const slim = slimJobForStorage(job, 50);
    expect(slim.blocks).toHaveLength(50);
    expect(slim.blocksPreviewTruncated).toBe(true);
    expect(slim.blocksTotalCount).toBe(120);
    expect(slim.blocks?.every((block) => !("bbox" in block))).toBe(true);
  });
});
