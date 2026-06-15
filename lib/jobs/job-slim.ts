import type { Job, OcrBlock } from "../types";

const DEFAULT_PREVIEW_BLOCKS = 50;

function stripLayoutFields(block: OcrBlock): OcrBlock {
  const rest = { ...block };
  delete (rest as Partial<OcrBlock>).bbox;
  delete (rest as Partial<OcrBlock>).region;
  return rest;
}

export function slimJobForStorage(
  job: Job,
  maxPreview = DEFAULT_PREVIEW_BLOCKS,
): Job {
  const slimBlocks = job.blocks?.map(stripLayoutFields);

  if (!slimBlocks || slimBlocks.length <= maxPreview) {
    if (!job.blocks) {
      return job;
    }
    return { ...job, blocks: slimBlocks };
  }

  return {
    ...job,
    blocks: slimBlocks.slice(0, maxPreview),
    blocksPreviewTruncated: true,
    blocksTotalCount: slimBlocks.length,
  };
}
