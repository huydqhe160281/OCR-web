import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
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

const MIN_NATIVE_TEXT_LENGTH = 32;

function splitTextIntoBlocks(text: string, pageCount: number): OcrBlock[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [];
  }

  const pages = Math.max(pageCount, 1);
  const perPage = Math.max(1, Math.ceil(paragraphs.length / pages));

  return paragraphs.map((paragraph, index) => ({
    page: Math.min(pages, Math.floor(index / perPage) + 1),
    type: OcrBlockType.PARAGRAPH,
    text: paragraph,
    language: BlockLanguage.UNKNOWN,
    confidence: BlockConfidence.HIGH,
  }));
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    return textResult.text?.trim() ?? "";
  } catch {
    return "";
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

  const extractedText = await extractPdfText(buffer);

  const nativeBlocks =
    extractedText.length >= MIN_NATIVE_TEXT_LENGTH
      ? splitTextIntoBlocks(extractedText, pageCount)
      : [];

  const ocrInputs: OcrInput[] =
    nativeBlocks.length > 0
      ? []
      : [
          {
            page: 1,
            mimeType: MimeType.PDF,
            data: buffer,
            label: `pdf-full-${pageCount}pages`,
          },
        ];

  return { pageCount, nativeBlocks, ocrInputs };
}

export async function pdfPageCount(buffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}
