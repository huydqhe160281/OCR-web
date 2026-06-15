import { fetchBlobBuffer, uploadOutputDocx } from "../blob";
import { getConfig } from "../config";
import { JobErrorCode, JobProcessingError } from "../errors";
import { buildDocxBuffer } from "../export/docx-builder";
import { buildLayoutDocxBuffer } from "../export/layout-docx-builder";
import { getJob, tryClaimJobProcessing, updateJob } from "./job-store";
import { mergeBlocks } from "../merge-blocks";
import {
  formatValidationErrors,
  runCompletenessGate,
} from "../ocr/completeness-gate";
import { processOcrBatches } from "../ocr/batch-processor";
import { maybeStructurePass } from "../ocr/structure-pass";
import { runLayoutVerifyPass } from "../ocr/verify-pass";
import { parseDocument } from "../parsers";
import { JobStatus, type Job, type OcrInput } from "../types";

function pageImageMap(inputs: OcrInput[]): Map<number, OcrInput> {
  return new Map(inputs.map((input) => [input.page, input]));
}

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
    const layoutMode = config.LAYOUT_EXPORT_V2;
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

    const ocrBlocks = await processOcrBatches(
      parsed.ocrInputs,
      async (current) => {
        await updateJob(jobId, {
          progress: { current, total: totalProgressUnits },
        });
      },
      { fileName: job.fileName },
    );

    let merged = mergeBlocks(parsed.nativeBlocks, ocrBlocks, layoutMode);

    if (layoutMode) {
      let validation = runCompletenessGate(merged, config);
      if (!validation.ok) {
        merged = await runLayoutVerifyPass(
          merged,
          validation.issues,
          pageImageMap(parsed.ocrInputs),
          job.fileName,
        );
        validation = runCompletenessGate(merged, config);
      }
      if (!validation.ok) {
        throw new JobProcessingError(
          JobErrorCode.OCR_FAILED,
          formatValidationErrors(validation.issues),
        );
      }
    } else {
      merged = await maybeStructurePass(merged);
    }

    const docxBuffer = layoutMode
      ? await buildLayoutDocxBuffer(merged)
      : await buildDocxBuffer(merged);
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
