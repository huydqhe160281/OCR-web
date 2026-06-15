import { describe, expect, it } from "vitest";
import { parseVietnameseNumber } from "@/lib/ocr/parse-vn-number";

describe("parseVietnameseNumber", () => {
  it("parses thousand-separated VN amounts", () => {
    expect(parseVietnameseNumber("1.000.000")).toBe(1_000_000);
    expect(parseVietnameseNumber("2.632.167")).toBe(2_632_167);
  });

  it("parses decimal comma amounts", () => {
    expect(parseVietnameseNumber("526.433,42")).toBeCloseTo(526_433.42, 2);
    expect(parseVietnameseNumber("5,0000")).toBeCloseTo(5, 4);
  });

  it("parses percentages", () => {
    expect(parseVietnameseNumber("8%")).toBe(8);
  });

  it("returns null for empty or non-numeric text", () => {
    expect(parseVietnameseNumber("")).toBeNull();
    expect(parseVietnameseNumber("N/A")).toBeNull();
  });
});
