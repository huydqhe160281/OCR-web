import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { JobErrorCode } from "../errors";
import { parsePdf } from "./pdf-parser";

describe("parsePdf", () => {
  it("routes blank pdf to gemini ocr input", async () => {
    const pdf = await PDFDocument.create();
    const bytes = await pdf.save();

    const result = await parsePdf(Buffer.from(bytes));
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.nativeBlocks).toHaveLength(0);
    expect(result.ocrInputs).toHaveLength(1);
  });

  it("rejects corrupt pdf", async () => {
    await expect(parsePdf(Buffer.from("not-a-pdf"))).rejects.toMatchObject({
      code: JobErrorCode.PARSE_FAILED,
    });
  });
});
