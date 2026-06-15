import { describe, expect, it } from "vitest";
import {
  assignRegion,
  sortLayoutBlocks,
  syntheticNativeBbox,
} from "@/lib/ocr/layout-normalize";
import { LayoutRegion, OcrBlockType, type OcrBlock } from "@/lib/types";

const LEFT_MAX = 0.33;
const CENTER_MAX = 0.66;

describe("assignRegion", () => {
  it("maps x-center to left, center, right", () => {
    expect(assignRegion({ x: 0, y: 0, w: 0.2, h: 0.1 }, LEFT_MAX, CENTER_MAX)).toBe(
      LayoutRegion.LEFT,
    );
    expect(assignRegion({ x: 0.35, y: 0, w: 0.2, h: 0.1 }, LEFT_MAX, CENTER_MAX)).toBe(
      LayoutRegion.CENTER,
    );
    expect(assignRegion({ x: 0.7, y: 0, w: 0.2, h: 0.1 }, LEFT_MAX, CENTER_MAX)).toBe(
      LayoutRegion.RIGHT,
    );
  });
});

describe("sortLayoutBlocks", () => {
  it("sorts by page, y, then x", () => {
    const blocks: OcrBlock[] = [
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "b",
        bbox: { x: 0.5, y: 0.2, w: 0.1, h: 0.05 },
      },
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "a",
        bbox: { x: 0.1, y: 0.2, w: 0.1, h: 0.05 },
      },
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "top",
        bbox: { x: 0.1, y: 0.05, w: 0.1, h: 0.05 },
      },
    ];
    const sorted = sortLayoutBlocks(blocks);
    expect(sorted.map((b) => b.text)).toEqual(["top", "a", "b"]);
  });
});

describe("syntheticNativeBbox", () => {
  it("stacks native blocks vertically on the left band", () => {
    const first = syntheticNativeBbox(1, 0);
    const second = syntheticNativeBbox(1, 1);
    expect(first.y).toBeLessThan(second.y);
    expect(first.x).toBe(0);
    expect(first.w).toBe(1);
  });
});
