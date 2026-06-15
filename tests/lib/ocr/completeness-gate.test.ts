import { describe, expect, it } from "vitest";
import { LayoutValidationReason } from "@/lib/errors";
import {
  isLineItemTable,
  runCompletenessGate,
  validateArithmetic,
  validateNumericCells,
  validateTableShape,
} from "@/lib/ocr/completeness-gate";
import { OcrBlockType, type OcrBlock } from "@/lib/types";

const invoiceTable: OcrBlock = {
  page: 1,
  type: OcrBlockType.TABLE,
  text: "items",
  rows: [
    ["STT", "Ten", "DVT", "So luong", "Don gia", "Thanh tien", "Thue", "Tien thue"],
    ["1", "MicaL0", "Tam", "5,0000", "526.433,42", "2.632.167", "8%", "210.573"],
    ["2", "MicaL0", "Tam", "2,0000", "866.433,33", "1.732.867", "8%", "138.630"],
  ],
};

describe("isLineItemTable", () => {
  it("flags wide tables as line items", () => {
    expect(isLineItemTable(invoiceTable)).toBe(true);
  });

  it("ignores small 2-column tables", () => {
    const block: OcrBlock = {
      page: 1,
      type: OcrBlockType.TABLE,
      text: "kv",
      rows: [
        ["Label", "Value"],
        ["A", "B"],
      ],
    };
    expect(isLineItemTable(block)).toBe(false);
  });
});

describe("validateTableShape", () => {
  it("detects jagged rows", () => {
    const block: OcrBlock = {
      ...invoiceTable,
      rows: [
        ["A", "B", "C", "D"],
        ["1", "2"],
      ],
    };
    const issues = validateTableShape(block);
    expect(issues[0]?.reason).toBe(LayoutValidationReason.TABLE_JAGGED_ROWS);
  });
});

describe("validateNumericCells", () => {
  it("detects empty numeric cells in data rows", () => {
    const block: OcrBlock = {
      ...invoiceTable,
      rows: [
        ["STT", "Ten", "DVT", "SL", "Don gia", "Thanh tien", "Thue", "Tien thue"],
        ["1", "Item", "Hop", "", "100000", "1000000", "8%", "80000"],
      ],
    };
    expect(validateNumericCells(block).length).toBeGreaterThan(0);
  });
});

describe("validateArithmetic", () => {
  it("detects qty * price mismatch with VN number format", () => {
    const block: OcrBlock = {
      ...invoiceTable,
      rows: [
        ["STT", "Ten", "DVT", "So luong", "Don gia", "Thanh tien", "Thue", "Tien thue"],
        ["1", "Item", "Tam", "5,0000", "526.433,42", "999", "8%", "80"],
      ],
    };
    const issues = validateArithmetic(block, 0.02);
    expect(issues[0]?.reason).toBe(LayoutValidationReason.ARITHMETIC_MISMATCH);
  });
});

describe("runCompletenessGate", () => {
  it("passes valid invoice table", () => {
    const result = runCompletenessGate([invoiceTable], {
      NUMERIC_TOLERANCE_RATIO: 0.02,
    });
    expect(result.ok).toBe(true);
  });
});
