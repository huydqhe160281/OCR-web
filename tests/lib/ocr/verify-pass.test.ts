import { describe, expect, it, vi } from "vitest";
import type { LayoutBbox } from "@/lib/types";

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 1000, height: 1400 }),
    extract: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("cropped-png")),
  })),
}));

const { cropImageByBbox } = await import("@/lib/ocr/verify-pass");

describe("cropImageByBbox", () => {
  it("returns cropped buffer", async () => {
    const bbox: LayoutBbox = { x: 0.1, y: 0.2, w: 0.5, h: 0.3 };
    const result = await cropImageByBbox(Buffer.from("image"), bbox, 0.05);
    expect(result.toString()).toBe("cropped-png");
  });
});
