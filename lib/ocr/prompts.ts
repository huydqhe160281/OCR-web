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

export function buildStructurePrompt(blockCount: number): string {
  return `Review and refine ${blockCount} OCR blocks. Improve table structure and Japanese/Vietnamese language tags. Return the full corrected JSON array only.`;
}

export function parseOcrJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}
