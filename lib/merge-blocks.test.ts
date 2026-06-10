import { describe, expect, it } from "vitest";
import { mergeBlocks } from "./merge-blocks";
import {
  BlockConfidence,
  OcrBlockType,
  type OcrBlock,
} from "./types";

describe("mergeBlocks", () => {
  it("orders blocks by page then type", () => {
    const native: OcrBlock[] = [
      {
        page: 2,
        type: OcrBlockType.PARAGRAPH,
        text: "native p2",
        confidence: BlockConfidence.HIGH,
      },
    ];
    const ocr: OcrBlock[] = [
      {
        page: 1,
        type: OcrBlockType.HEADING,
        level: 1,
        text: "ocr p1",
        confidence: BlockConfidence.MEDIUM,
      },
    ];

    const merged = mergeBlocks(native, ocr);
    expect(merged.map((b) => b.page)).toEqual([1, 2]);
  });
});
