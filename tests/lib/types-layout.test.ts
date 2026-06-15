import { describe, expect, it } from "vitest";
import {
  LayoutRegion,
  OcrBlockType,
  type LayoutBbox,
  type OcrBlock,
} from "@/lib/types";

describe("layout types", () => {
  it("accepts OcrBlock with bbox and region", () => {
    const bbox: LayoutBbox = { x: 0.1, y: 0.2, w: 0.3, h: 0.1 };
    const block: OcrBlock = {
      page: 1,
      type: OcrBlockType.PARAGRAPH,
      text: "Seller info",
      bbox,
      region: LayoutRegion.LEFT,
    };
    expect(block.region).toBe("left");
    expect(block.bbox?.x).toBe(0.1);
  });

  it("allows v1 blocks without layout fields", () => {
    const block: OcrBlock = {
      page: 1,
      type: OcrBlockType.PARAGRAPH,
      text: "Plain",
    };
    expect(block.bbox).toBeUndefined();
  });
});
