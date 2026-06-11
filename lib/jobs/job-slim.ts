import type { Job } from "../types";

const DEFAULT_PREVIEW_BLOCKS = 50;

export function slimJobForStorage(
  job: Job,
  maxPreview = DEFAULT_PREVIEW_BLOCKS,
): Job {
  if (!job.blocks || job.blocks.length <= maxPreview) {
    return job;
  }

  return {
    ...job,
    blocks: job.blocks.slice(0, maxPreview),
    blocksPreviewTruncated: true,
    blocksTotalCount: job.blocks.length,
  };
}
