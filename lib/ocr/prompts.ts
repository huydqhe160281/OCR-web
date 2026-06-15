import { JobErrorCode, JobProcessingError } from "../errors";

export const OCR_SYSTEM_PROMPT = `You are a document OCR assistant. Extract all visible text from the provided document images or PDF pages.
Return ONLY valid JSON: an array of objects with fields:
- page (number, 1-based)
- type ("heading" | "paragraph" | "table" | "list")
- level (optional number 1-6 for headings)
- text (string)
- language ("vi" | "ja" | "mixed" | "unknown")
- confidence ("high" | "medium" | "low")
- rows (optional string[][] for tables)

Preserve reading order. Auto-detect Vietnamese and Japanese. Mark handwriting or uncertain text as confidence "low".`;

export const LAYOUT_OCR_SYSTEM_PROMPT = `You are a document layout OCR assistant specialized in Vietnamese business documents and VAT invoices (Hóa đơn GTGT / MISA meInvoice).
Extract all visible text with spatial positions from document page images.
Return ONLY valid JSON: an array of objects with fields:
- page (number, 1-based)
- type ("heading" | "paragraph" | "table" | "list")
- level (optional number 1-6 for headings)
- text (string)
- language ("vi" | "ja" | "mixed" | "unknown")
- confidence ("high" | "medium" | "low")
- bbox (object with x, y, w, h as numbers 0-1 relative to page width/height)
- rows (optional string[][] for tables — every data row MUST have the same column count)

Layout rules:
- Include EVERY visible text block, especially ALL numeric table cells and summary totals.
- IGNORE logos, QR codes, decorative icons, and digital signature stamp graphics only.
- Do not collapse table columns; preserve full row/column structure.
- bbox must reflect where text appears (left seller block, center title, right serial/date).

VAT invoice structure (when applicable):
- Seller block (left): company name, MST, address, phone, bank account.
- Buyer block (left): buyer name, MST/CCCD, address.
- Center band: title "HÓA ĐƠN GIÁ TRỊ GIA TĂNG", date.
- Right band: ký hiệu, số hóa đơn, mã CQT.
- ONE full-width table block (type "table") for line items with columns such as:
  STT | Tên hàng hóa, dịch vụ | ĐVT | Số lượng | Đơn giá | Thành tiền | Thuế suất GTGT | Tiền thuế GTGT
- Summary rows: Thành tiền trước thuế, Tiền thuế, Cộng tiền thanh toán, amount in words.
- Preserve Vietnamese number formatting exactly as printed (e.g. 526.433,42 and 1.000.000).`;

export const STRUCTURE_SYSTEM_PROMPT = `You are a document structure refinement assistant for Vietnamese and Japanese OCR output.
Review OCR blocks and improve table row/column alignment, heading levels, and language tags.
Return ONLY valid JSON: the full corrected array of block objects with the same schema as input.
Do not invent text not present in the input blocks.`;

export interface LayoutPromptContext {
  fileName?: string;
  pageLabel?: string;
}

function buildDocContext(context?: LayoutPromptContext): string {
  const parts: string[] = [];
  if (context?.fileName) {
    parts.push(`File: ${context.fileName}`);
  }
  if (context?.pageLabel) {
    parts.push(context.pageLabel);
  }
  const isInvoiceHint =
    context?.fileName &&
    /hóa đơn|hoa don|\bhd\b|hđ|invoice|gtgt|misa|meinvoice|\.pdf$/i.test(
      context.fileName,
    );
  if (isInvoiceHint) {
    parts.push(
      "Document type: Vietnamese VAT invoice (Hóa đơn GTGT). Extract full 8-column line-item table and all summary numbers.",
    );
  }
  return parts.length > 0 ? `\nContext: ${parts.join(" | ")}` : "";
}

export function buildOcrUserPrompt(
  pageStart: number,
  pageEnd: number,
  hint?: string,
): string {
  const range =
    pageStart === pageEnd
      ? `page ${pageStart}`
      : `pages ${pageStart}-${pageEnd}`;
  const extra = hint ? `\nContext: ${hint}` : "";
  return `Extract structured text from ${range}.${extra}\nRespond with JSON array only.`;
}

export function buildLayoutOcrUserPrompt(
  pageStart: number,
  pageEnd: number,
  context?: LayoutPromptContext,
): string {
  const range =
    pageStart === pageEnd
      ? `page ${pageStart}`
      : `pages ${pageStart}-${pageEnd}`;
  return `Extract layout-aware structured text with bbox from ${range}.${buildDocContext(context)}\nRespond with JSON array only.`;
}

export function buildStructurePrompt(blockCount: number): string {
  return `Review and refine ${blockCount} OCR blocks. Improve table structure and Japanese/Vietnamese language tags. Return the full corrected JSON array only.`;
}

export function parseOcrJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new JobProcessingError(
      JobErrorCode.OCR_FAILED,
      "Gemini returned invalid JSON for OCR blocks",
    );
  }
}
