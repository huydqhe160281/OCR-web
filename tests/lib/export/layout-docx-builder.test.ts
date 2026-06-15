import { describe, expect, it } from "vitest";
import {
  LayoutRegion,
  OcrBlockType,
  type OcrBlock,
} from "@/lib/types";
import { buildLayoutDocxBuffer } from "@/lib/export/layout-docx-builder";

describe("buildLayoutDocxBuffer", () => {
  it("builds docx with region band and full-width table", async () => {
    const blocks: OcrBlock[] = [
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "Seller",
        bbox: { x: 0.05, y: 0.1, w: 0.4, h: 0.05 },
        region: LayoutRegion.LEFT,
      },
      {
        page: 1,
        type: OcrBlockType.HEADING,
        level: 1,
        text: "HOA DON GTGT",
        bbox: { x: 0.35, y: 0.05, w: 0.3, h: 0.05 },
        region: LayoutRegion.CENTER,
      },
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "So: 195",
        bbox: { x: 0.7, y: 0.05, w: 0.2, h: 0.05 },
        region: LayoutRegion.RIGHT,
      },
      {
        page: 1,
        type: OcrBlockType.TABLE,
        text: "items",
        bbox: { x: 0.05, y: 0.4, w: 0.9, h: 0.3 },
        rows: [
          ["A", "B"],
          ["1", "2"],
        ],
      },
    ];

    const buffer = await buildLayoutDocxBuffer(blocks);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });
});
