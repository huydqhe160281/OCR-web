import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobErrorCode } from "@/lib/errors";
import type { OcrInput } from "@/lib/types";

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  getConfig: () => ({
    GEMINI_API_KEY: "test-key",
    GEMINI_OCR_MODEL: "gemini-2.5-flash",
    GEMINI_OCR_MODEL_FALLBACK: "gemini-2.0-flash",
    GEMINI_STRUCTURE_MODEL: "gemini-2.5-pro",
    GEMINI_STRUCTURE_MODEL_FALLBACK: "gemini-2.0-flash",
    retryBackoffMs: [10, 20],
    REGION_LEFT_MAX: 0.33,
    REGION_CENTER_MAX: 0.66,
  }),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = vi.fn().mockReturnValue({ generateContent });
  },
}));

const { ocrInputs, ocrLayoutInputs } = await import("@/lib/ocr/gemini-client");

describe("ocrInputs", () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it("fails when Gemini returns empty blocks for scan input", async () => {
    generateContent.mockResolvedValue({
      response: { text: () => "[]" },
    });

    const inputs: OcrInput[] = [
      {
        page: 1,
        mimeType: "image/png",
        data: Buffer.from("png"),
        label: "page-1",
      },
    ];

    await expect(ocrInputs(inputs, 1, 1)).rejects.toMatchObject({
      code: JobErrorCode.OCR_FAILED,
    });
  });
});

describe("ocrLayoutInputs", () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it("returns layout blocks with bbox and region from mocked Gemini JSON", async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            {
              page: 1,
              type: "paragraph",
              text: "Seller name",
              bbox: { x: 0.05, y: 0.1, w: 0.3, h: 0.05 },
              confidence: "high",
            },
          ]),
      },
    });

    const inputs: OcrInput[] = [
      {
        page: 1,
        mimeType: "image/png",
        data: Buffer.from("png"),
        label: "page-1",
      },
    ];

    const blocks = await ocrLayoutInputs(inputs, 1, 1);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.bbox).toEqual({ x: 0.05, y: 0.1, w: 0.3, h: 0.05 });
    expect(blocks[0]?.region).toBe("left");
  });

  it("falls back to next model after 503 on primary", async () => {
    const unavailable = new Error("[503 Service Unavailable] high demand");
    generateContent
      .mockRejectedValueOnce(unavailable)
      .mockRejectedValueOnce(unavailable)
      .mockRejectedValueOnce(unavailable)
      .mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify([
              {
                page: 1,
                type: "paragraph",
                text: "Recovered",
                bbox: { x: 0.5, y: 0.1, w: 0.2, h: 0.05 },
              },
            ]),
        },
      });

    const inputs: OcrInput[] = [
      {
        page: 1,
        mimeType: "image/png",
        data: Buffer.from("png"),
        label: "page-1",
      },
    ];

    const blocks = await ocrLayoutInputs(inputs, 1, 1);
    expect(blocks[0]?.text).toBe("Recovered");
    expect(generateContent.mock.calls.length).toBeGreaterThan(1);
  });
});
