import { fetchBlobBuffer, uploadOutputDocx } from "../blob";
import { getConfig } from "../config";
import { JobErrorCode, JobProcessingError } from "../errors";
import { buildDocxBuffer } from "../export/docx-builder";
import { getJob, tryClaimJobProcessing, updateJob } from "./job-store";
import { mergeBlocks } from "../merge-blocks";
import { processOcrBatches } from "../ocr/batch-processor";
import { maybeStructurePass } from "../ocr/structure-pass";
import { parseDocument } from "../parsers";
import { JobStatus, type Job } from "../types";

export async function processJob(jobId: string): Promise<void> {
  const claimed = await tryClaimJobProcessing(jobId);
  if (!claimed) {
    return;
  }

  const job = await getJob(jobId);
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

    const totalProgressUnits = Math.max(parsed.pageCount, parsed.ocrInputs.length);

    await updateJob(jobId, {
      progress: { current: 0, total: totalProgressUnits },
    });

    const ocrBlocks = await processOcrBatches(parsed.ocrInputs, async (current) => {
      await updateJob(jobId, {
        progress: { current, total: totalProgressUnits },
      });
    });

    let merged = mergeBlocks(parsed.nativeBlocks, ocrBlocks);
    merged = await maybeStructurePass(merged);

    const docxBuffer = await buildDocxBuffer(merged);
    const outputBlobUrl = await uploadOutputDocx(jobId, docxBuffer);

    await updateJob(jobId, {
      status: JobStatus.COMPLETED,
      progress: { current: totalProgressUnits, total: totalProgressUnits },
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
