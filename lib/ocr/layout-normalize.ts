import { JobErrorCode, JobProcessingError } from "../errors";
import type { AppConfig } from "../config";
import {
  LayoutRegion,
  OcrBlockType,
  type LayoutBbox,
  type OcrBlock,
} from "../types";

export function bboxXCenter(bbox: LayoutBbox): number {
  return bbox.x + bbox.w / 2;
}

export function assignRegion(
  bbox: LayoutBbox,
  regionLeftMax: number,
  regionCenterMax: number,
): LayoutRegion {
  const center = bboxXCenter(bbox);
  if (center < regionLeftMax) {
    return LayoutRegion.LEFT;
  }
  if (center < regionCenterMax) {
    return LayoutRegion.CENTER;
  }
  return LayoutRegion.RIGHT;
}

export function sortLayoutBlocks(blocks: OcrBlock[]): OcrBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.page !== b.page) {
      return a.page - b.page;
    }
    const ay = a.bbox?.y ?? 0;
    const by = b.bbox?.y ?? 0;
    if (ay !== by) {
      return ay - by;
    }
    const ax = a.bbox?.x ?? 0;
    const bx = b.bbox?.x ?? 0;
    return ax - bx;
  });
}

function parseBbox(raw: unknown): LayoutBbox | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const x = typeof record.x === "number" ? record.x : NaN;
  const y = typeof record.y === "number" ? record.y : NaN;
  const w = typeof record.w === "number" ? record.w : NaN;
  const h = typeof record.h === "number" ? record.h : NaN;
  if ([x, y, w, h].some((value) => Number.isNaN(value) || value < 0 || value > 1)) {
    return null;
  }
  return { x, y, w, h };
}

export function attachLayoutMetadata(
  block: OcrBlock,
  config: Pick<AppConfig, "REGION_LEFT_MAX" | "REGION_CENTER_MAX">,
): OcrBlock {
  if (!block.bbox) {
    return block;
  }
  return {
    ...block,
    region: assignRegion(block.bbox, config.REGION_LEFT_MAX, config.REGION_CENTER_MAX),
  };
}

export function normalizeLayoutBlocks(
  blocks: OcrBlock[],
  config: Pick<AppConfig, "REGION_LEFT_MAX" | "REGION_CENTER_MAX">,
  requireBbox: boolean,
): OcrBlock[] {
  const normalized = blocks.flatMap((block, index) => {
    if (!block.bbox && requireBbox) {
      if (block.type === OcrBlockType.TABLE) {
        throw new JobProcessingError(
          JobErrorCode.OCR_FAILED,
          `Layout table block on page ${block.page} missing bbox`,
        );
      }
      return [
        attachLayoutMetadata(
          {
            ...block,
            bbox: syntheticNativeBbox(block.page, index),
          },
          config,
        ),
      ];
    }
    if (!block.bbox) {
      return [block];
    }
    return [attachLayoutMetadata(block, config)];
  });

  return sortLayoutBlocks(normalized);
}

export function parseBboxFromRaw(raw: Record<string, unknown>): LayoutBbox | null {
  return parseBbox(raw.bbox);
}

export function syntheticNativeBbox(page: number, index: number): LayoutBbox {
  return {
    x: 0,
    y: Math.min(0.95, index * 0.08),
    w: 1,
    h: 0.08,
  };
}
