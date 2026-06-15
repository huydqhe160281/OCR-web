import {
  LayoutRegion,
  type OcrBlock,
} from "./types";
import {
  sortLayoutBlocks,
  syntheticNativeBbox,
} from "./ocr/layout-normalize";

function blockSortKey(block: OcrBlock): string {
  const level = block.level ?? 0;
  return `${String(block.page).padStart(6, "0")}-${block.type}-${level}`;
}

function mergeLinear(nativeBlocks: OcrBlock[], ocrBlocks: OcrBlock[]): OcrBlock[] {
  const byPage = new Map<number, OcrBlock[]>();

  for (const block of [...nativeBlocks, ...ocrBlocks]) {
    const existing = byPage.get(block.page) ?? [];
    existing.push(block);
    byPage.set(block.page, existing);
  }

  const pages = [...byPage.keys()].sort((a, b) => a - b);
  return pages.flatMap((page) =>
    (byPage.get(page) ?? []).sort((a, b) =>
      blockSortKey(a).localeCompare(blockSortKey(b)),
    ),
  );
}

function mergeLayout(nativeBlocks: OcrBlock[], ocrBlocks: OcrBlock[]): OcrBlock[] {
  const nativeWithLayout = nativeBlocks.map((block, index) => ({
    ...block,
    bbox: block.bbox ?? syntheticNativeBbox(block.page, index),
    region: block.region ?? LayoutRegion.LEFT,
  }));
  return sortLayoutBlocks([...nativeWithLayout, ...ocrBlocks]);
}

export function mergeBlocks(
  nativeBlocks: OcrBlock[],
  ocrBlocks: OcrBlock[],
  layoutMode = false,
): OcrBlock[] {
  return layoutMode
    ? mergeLayout(nativeBlocks, ocrBlocks)
    : mergeLinear(nativeBlocks, ocrBlocks);
}
