import sharp from "sharp";
import { getConfig } from "../config";
import { JobErrorCode, JobProcessingError } from "../errors";
import type { LayoutValidationIssue } from "../errors";
import { runCompletenessGate } from "./completeness-gate";
import { ocrLayoutInputs, structureModelNames } from "./gemini-client";
import { sortLayoutBlocks } from "./layout-normalize";
import type { LayoutBbox, OcrBlock, OcrInput } from "../types";
import { OcrBlockType } from "../types";

export async function cropImageByBbox(
  image: Buffer,
  bbox: LayoutBbox,
  padding: number,
): Promise<Buffer> {
  const metadata = await sharp(image).metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const left = Math.max(0, Math.floor((bbox.x - padding) * width));
  const top = Math.max(0, Math.floor((bbox.y - padding) * height));
  const cropWidth = Math.min(
    width - left,
    Math.ceil((bbox.w + padding * 2) * width),
  );
  const cropHeight = Math.min(
    height - top,
    Math.ceil((bbox.h + padding * 2) * height),
  );
  return sharp(image)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();
}

function mergePageBlocks(
  existing: OcrBlock[],
  incoming: OcrBlock[],
  page: number,
): OcrBlock[] {
  const kept = existing.filter((block) => block.page !== page);
  const pageBlocks = incoming.filter((block) => block.page === page);
  return sortLayoutBlocks([...kept, ...pageBlocks]);
}

function pageIssues(
  issues: LayoutValidationIssue[],
  page: number,
): LayoutValidationIssue[] {
  return issues.filter((issue) => issue.page === page);
}

export async function runLayoutVerifyPass(
  blocks: OcrBlock[],
  issues: LayoutValidationIssue[],
  pageImages: Map<number, OcrInput>,
  docFileName?: string,
): Promise<OcrBlock[]> {
  const config = getConfig();
  const failedPages = [
    ...new Set(
      issues
        .map((issue) => issue.page)
        .filter((page): page is number => page !== undefined),
    ),
  ];

  let merged = blocks;
  for (const page of failedPages) {
    const source = pageImages.get(page);
    if (!source) {
      continue;
    }

    const tableBlock = merged.find(
      (block) =>
        block.page === page && block.type === OcrBlockType.TABLE && block.rows,
    );
    const bbox = tableBlock?.bbox ?? null;
    let attempt = 0;
    let pageFixed = false;

    while (attempt < config.MAX_LAYOUT_VERIFY_RETRIES && !pageFixed) {
      attempt += 1;
      const crop = bbox
        ? await cropImageByBbox(source.data, bbox, config.RETRY_CROP_PADDING)
        : source.data;

      const retried = await ocrLayoutInputs(
        [
          {
            page,
            mimeType: "image/png",
            data: crop,
            label: `verify-page-${page}-attempt-${attempt}`,
          },
        ],
        page,
        page,
        undefined,
        structureModelNames(config),
        docFileName,
      );

      merged = mergePageBlocks(merged, retried, page);
      const validation = runCompletenessGate(merged, config);
      pageFixed =
        retried.length > 0 && pageIssues(validation.issues, page).length === 0;
    }

    if (!pageFixed) {
      throw new JobProcessingError(
        JobErrorCode.OCR_FAILED,
        `Verify pass failed for page ${page}`,
      );
    }
  }

  return merged;
}
