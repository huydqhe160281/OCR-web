import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { getConfig } from "../config";
import {
  BlockConfidence,
  BlockLanguage,
  MimeType,
  OcrBlockType,
  type OcrBlock,
  type OcrInput,
  type ParseResult,
} from "../types";
import { JobErrorCode, JobProcessingError } from "../errors";
import { renderPdfPagePng } from "./pdf-render";

export const MIN_NATIVE_TEXT_LENGTH = 32;

function textToNativeBlocks(text: string, page: number): OcrBlock[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const parts = paragraphs.length > 0 ? paragraphs : [trimmed];

  return parts.map((paragraph) => ({
    page,
    type: OcrBlockType.PARAGRAPH,
    text: paragraph,
    language: BlockLanguage.UNKNOWN,
    confidence: BlockConfidence.HIGH,
  }));
}

async function extractPerPageText(buffer: Buffer): Promise<Map<number, string>> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    return new Map(
      textResult.pages.map((page) => [page.num, page.text?.trim() ?? ""]),
    );
  } catch {
    return new Map();
  } finally {
    await parser.destroy();
  }
}

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  let pageCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    pageCount = pdfDoc.getPageCount();
  } catch {
    throw new JobProcessingError(
      JobErrorCode.PARSE_FAILED,
      "Invalid or corrupted PDF",
    );
  }

  if (pageCount === 0) {
    throw new JobProcessingError(
      JobErrorCode.EMPTY_DOCUMENT,
      "PDF has no pages",
    );
  }

  const pageText = await extractPerPageText(buffer);
  const layoutMode = getConfig().LAYOUT_EXPORT_V2;
  const nativeBlocks: OcrBlock[] = [];
  const ocrInputs: OcrInput[] = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const text = pageText.get(page) ?? "";

    if (layoutMode) {
      const png = await renderPdfPagePng(buffer, page);
      ocrInputs.push({
        page,
        mimeType: MimeType.PNG,
        data: png,
        label: `pdf-page-${page}`,
      });
      continue;
    }

    if (text.length >= MIN_NATIVE_TEXT_LENGTH) {
      nativeBlocks.push(...textToNativeBlocks(text, page));
      continue;
    }

    const png = await renderPdfPagePng(buffer, page);
    ocrInputs.push({
      page,
      mimeType: MimeType.PNG,
      data: png,
      label: `pdf-page-${page}`,
    });
  }

  return { pageCount, nativeBlocks, ocrInputs };
}

export async function pdfPageCount(buffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}
