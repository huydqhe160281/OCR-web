import { fetchBlobBuffer, uploadOutputDocx } from "./blob";
import { getConfig } from "./config";
import { JobErrorCode, JobProcessingError } from "./errors";
import { buildDocxBuffer } from "./export/docx-builder";
import { updateJob } from "./jobs/job-store";
import { mergeBlocks } from "./merge-blocks";
import { processOcrBatches } from "./ocr/batch-processor";
import { maybeStructurePass } from "./ocr/structure-pass";
import { parseDocument } from "./parsers";
import { JobStatus, type Job } from "./types";

export async function processJob(jobId: string): Promise<void> {
  const job = await updateJob(jobId, { status: JobStatus.PROCESSING });
  if (!job) {
    return;
  }

  try {
    const config = getConfig();
    const buffer = await fetchBlobBuffer(job.blobUrl);
    const parsed = await parseDocument(buffer, job.mimeType, job.fileName);

    if (parsed.pageCount > config.MAX_PAGES) {
      throw new JobProcessingError(
        JobErrorCode.PAGE_LIMIT_EXCEEDED,
        `Document has ${parsed.pageCount} pages (max ${config.MAX_PAGES})`,
      );
    }

    const ocrBlocks = await processOcrBatches(parsed.ocrInputs, async (current, total) => {
      await updateJob(jobId, {
        progress: { current, total: Math.max(total, parsed.pageCount) },
      });
    });

    let merged = mergeBlocks(parsed.nativeBlocks, ocrBlocks);
    merged = await maybeStructurePass(merged);

    const docxBuffer = await buildDocxBuffer(merged);
    const outputBlobUrl = await uploadOutputDocx(jobId, docxBuffer);

    await updateJob(jobId, {
      status: JobStatus.COMPLETED,
      progress: { current: parsed.pageCount, total: parsed.pageCount },
      blocks: merged,
      outputBlobUrl,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    const errorCode =
      error instanceof JobProcessingError ? error.code : JobErrorCode.OCR_FAILED;

    await updateJob(jobId, {
      status: JobStatus.FAILED,
      error: message,
      errorCode,
      completedAt: new Date().toISOString(),
    });
  }
}

export function isTerminalStatus(job: Job): boolean {
  return job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED;
}
