import { getConfig } from "../config";
import type { OcrBlock, OcrInput } from "../types";
import { ocrInputs } from "./gemini-client";

export type ProgressCallback = (current: number, total: number) => Promise<void>;

function chunkInputs(inputs: OcrInput[], batchSize: number): OcrInput[][] {
  const chunks: OcrInput[][] = [];
  for (let i = 0; i < inputs.length; i += batchSize) {
    chunks.push(inputs.slice(i, i + batchSize));
  }
  return chunks;
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

export async function processOcrBatches(
  inputs: OcrInput[],
  onProgress?: ProgressCallback,
): Promise<OcrBlock[]> {
  if (inputs.length === 0) {
    return [];
  }

  const config = getConfig();
  const batches = chunkInputs(inputs, config.batchSize);
  const blocks: OcrBlock[] = [];
  let completed = 0;

  await runPool(batches, config.maxConcurrentBatches, async (batch, batchIndex) => {
    const pageStart = batch[0]?.page ?? batchIndex * config.batchSize + 1;
    const pageEnd = batch[batch.length - 1]?.page ?? pageStart;
    const batchBlocks = await ocrInputs(batch, pageStart, pageEnd);
    blocks.push(...batchBlocks);
    completed += batch.length;
    if (onProgress) {
      await onProgress(completed, inputs.length);
    }
  });

  return blocks.sort((a, b) => a.page - b.page || a.text.localeCompare(b.text));
}
