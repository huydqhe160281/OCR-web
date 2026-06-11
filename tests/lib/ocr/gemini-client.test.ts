import { describe, expect, it, vi } from "vitest";
import { JobErrorCode } from "@/lib/errors";
import type { OcrInput } from "@/lib/types";

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  getConfig: () => ({
    GEMINI_API_KEY: "test-key",
    GEMINI_OCR_MODEL: "gemini-2.5-flash",
    GEMINI_STRUCTURE_MODEL: "gemini-2.5-pro",
    retryBackoffMs: [1000, 2000, 4000],
  }),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = vi.fn().mockReturnValue({ generateContent });
  },
}));

const { ocrInputs } = await import("@/lib/ocr/gemini-client");

describe("ocrInputs", () => {
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
