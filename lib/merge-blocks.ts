import type { OcrBlock } from "./types";

function blockSortKey(block: OcrBlock): string {
  const level = block.level ?? 0;
  return `${String(block.page).padStart(6, "0")}-${block.type}-${level}`;
}

export function mergeBlocks(
  nativeBlocks: OcrBlock[],
  ocrBlocks: OcrBlock[],
): OcrBlock[] {
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
