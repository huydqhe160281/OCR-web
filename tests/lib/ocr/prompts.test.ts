import { describe, expect, it } from "vitest";
import { JobErrorCode } from "@/lib/errors";
import { parseOcrJsonResponse } from "@/lib/ocr/prompts";

describe("parseOcrJsonResponse", () => {
  it("parses fenced JSON array", () => {
    const raw = '```json\n[{"page":1,"type":"paragraph","text":"Hello"}]\n```';
    const result = parseOcrJsonResponse(raw);
    expect(result).toEqual([
      { page: 1, type: "paragraph", text: "Hello" },
    ]);
  });

  it("parses bare JSON array", () => {
    const result = parseOcrJsonResponse('[{"page":2,"type":"heading","text":"Title"}]');
    expect(result).toEqual([{ page: 2, type: "heading", text: "Title" }]);
  });

  it("returns empty array for empty JSON array", () => {
    expect(parseOcrJsonResponse("[]")).toEqual([]);
  });

  it("throws OCR_FAILED for invalid JSON", () => {
    expect(() => parseOcrJsonResponse("not json")).toThrowError(
      expect.objectContaining({ code: JobErrorCode.OCR_FAILED }),
    );
  });

  it("throws OCR_FAILED for prose without JSON", () => {
    expect(() => parseOcrJsonResponse("Here is the extracted text...")).toThrowError(
      expect.objectContaining({ code: JobErrorCode.OCR_FAILED }),
    );
  });
});
