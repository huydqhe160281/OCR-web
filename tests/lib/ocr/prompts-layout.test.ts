import { describe, expect, it } from "vitest";
import {
  LAYOUT_OCR_SYSTEM_PROMPT,
  buildLayoutOcrUserPrompt,
} from "@/lib/ocr/prompts";

describe("layout OCR prompts", () => {
  it("includes bbox and decorative exclusion rules", () => {
    expect(LAYOUT_OCR_SYSTEM_PROMPT).toContain("bbox");
    expect(LAYOUT_OCR_SYSTEM_PROMPT).toContain("QR codes");
  });

  it("builds layout user prompt for page range and invoice context", () => {
    expect(buildLayoutOcrUserPrompt(1, 3)).toContain("pages 1-3");
    expect(
      buildLayoutOcrUserPrompt(2, 2, { fileName: "Hoa don GTGT.pdf" }),
    ).toContain("VAT invoice");
  });
});
