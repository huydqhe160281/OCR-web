import { describe, expect, it } from "vitest";
import { mergeBlocks } from "@/lib/merge-blocks";
import {
  BlockConfidence,
  LayoutRegion,
  OcrBlockType,
  type OcrBlock,
} from "@/lib/types";

describe("mergeBlocks", () => {
  it("orders blocks by page then type in v1 mode", () => {
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

    const merged = mergeBlocks(native, ocr, false);
    expect(merged.map((b) => b.page)).toEqual([1, 2]);
  });

  it("assigns synthetic bbox to native blocks in layout mode", () => {
    const native: OcrBlock[] = [
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "native",
      },
    ];
    const ocr: OcrBlock[] = [
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "ocr",
        bbox: { x: 0.5, y: 0.1, w: 0.2, h: 0.05 },
        region: LayoutRegion.CENTER,
      },
    ];

    const merged = mergeBlocks(native, ocr, true);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.bbox).toBeDefined();
    expect(merged[0]?.region).toBe(LayoutRegion.LEFT);
  });
});
