import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { JobErrorCode } from "@/lib/errors";
import { MimeType } from "@/lib/types";

const { mockGetText, mockRenderPdfPagePng } = vi.hoisted(() => ({
  mockGetText: vi.fn(),
  mockRenderPdfPagePng: vi.fn(),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    getText = mockGetText;
    destroy = vi.fn();
  },
}));

vi.mock("@/lib/parsers/pdf-render", () => ({
  renderPdfPagePng: mockRenderPdfPagePng,
}));

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn(() => ({ LAYOUT_EXPORT_V2: false })),
}));

const { parsePdf } = await import("@/lib/parsers/pdf-parser");
const { getConfig } = await import("@/lib/config");

describe("parsePdf", () => {
  beforeEach(() => {
    mockGetText.mockReset();
    mockRenderPdfPagePng.mockReset();
    mockRenderPdfPagePng.mockResolvedValue(Buffer.from("png-bytes"));
  });

  it("queues one OCR input per page when no native text", async () => {
    mockGetText.mockResolvedValue({
      pages: [{ num: 1, text: "" }, { num: 2, text: "" }],
    });

    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    const bytes = await pdf.save();

    const result = await parsePdf(Buffer.from(bytes));
    expect(result.pageCount).toBe(2);
    expect(result.nativeBlocks).toHaveLength(0);
    expect(result.ocrInputs).toHaveLength(2);
    expect(result.ocrInputs[0]?.mimeType).toBe(MimeType.PNG);
    expect(result.ocrInputs[1]?.page).toBe(2);
    expect(mockRenderPdfPagePng).toHaveBeenCalledTimes(2);
  });

  it("uses native text per page and OCR only for scan pages", async () => {
    mockGetText.mockResolvedValue({
      pages: [
        {
          num: 1,
          text: "Page one has plenty of selectable native PDF text content.",
        },
        {
          num: 2,
          text: "Page two also has enough embedded text for native extraction.",
        },
        { num: 3, text: "" },
      ],
    });

    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    pdf.addPage();
    const bytes = await pdf.save();

    const result = await parsePdf(Buffer.from(bytes));
    expect(result.pageCount).toBe(3);
    expect(result.nativeBlocks.length).toBeGreaterThan(0);
    expect(result.nativeBlocks.every((block) => block.page <= 2)).toBe(true);
    expect(result.ocrInputs).toHaveLength(1);
    expect(result.ocrInputs[0]?.page).toBe(3);
    expect(mockRenderPdfPagePng).toHaveBeenCalledWith(expect.any(Buffer), 3);
  });

  it("rejects corrupt pdf", async () => {
    await expect(parsePdf(Buffer.from("not-a-pdf"))).rejects.toMatchObject({
      code: JobErrorCode.PARSE_FAILED,
    });
  });

  it("always OCR every page in layout mode even when native text exists", async () => {
    vi.mocked(getConfig).mockReturnValue({
      LAYOUT_EXPORT_V2: true,
    } as ReturnType<typeof getConfig>);

    mockGetText.mockResolvedValue({
      pages: [
        {
          num: 1,
          text: "Page one has plenty of selectable native PDF text content.",
        },
      ],
    });

    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();

    const result = await parsePdf(Buffer.from(bytes));
    expect(result.nativeBlocks).toHaveLength(0);
    expect(result.ocrInputs).toHaveLength(1);
    expect(mockRenderPdfPagePng).toHaveBeenCalledWith(expect.any(Buffer), 1);
  });
});
