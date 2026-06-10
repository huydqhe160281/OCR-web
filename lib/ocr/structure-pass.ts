import { BlockLanguage, type OcrBlock } from "../types";
import { refineBlocks } from "./gemini-client";

function japaneseRatio(blocks: OcrBlock[]): number {
  if (blocks.length === 0) {
    return 0;
  }
  const jaCount = blocks.filter(
    (block) =>
      block.language === BlockLanguage.JA ||
      block.language === BlockLanguage.MIXED,
  ).length;
  return jaCount / blocks.length;
}

function hasTables(blocks: OcrBlock[]): boolean {
  return blocks.some((block) => block.type === "table");
}

export async function maybeStructurePass(
  blocks: OcrBlock[],
): Promise<OcrBlock[]> {
  if (blocks.length === 0) {
    return blocks;
  }

  const needsPro = hasTables(blocks) || japaneseRatio(blocks) > 0.6;
  if (!needsPro) {
    return blocks;
  }

  return refineBlocks(blocks);
}
