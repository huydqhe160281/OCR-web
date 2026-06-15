import type { AppConfig } from "../config";
import {
  LayoutValidationReason,
  type LayoutValidationIssue,
  type LayoutValidationResult,
} from "../errors";
import { parseVietnameseNumber } from "./parse-vn-number";
import { OcrBlockType, type OcrBlock } from "../types";

const NUMERIC_PATTERN = /^[\d.,\s%-]+$/;

function normalizeHeaderCell(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export interface LineItemColumnMap {
  quantity: number;
  unitPrice: number;
  lineAmount: number;
}

export function detectLineItemColumns(headerRow: string[]): LineItemColumnMap | null {
  const normalized = headerRow.map(normalizeHeaderCell);
  const findIndex = (patterns: RegExp[]): number =>
    normalized.findIndex((cell) => patterns.some((pattern) => pattern.test(cell)));

  const quantity = findIndex([/so luong/, /\bsl\b/, /số lượng/]);
  const unitPrice = findIndex([/don gia/, /đơn giá/]);
  const lineAmount = findIndex([/thanh tien/, /thành tiền/]);

  if (quantity < 0 || unitPrice < 0 || lineAmount < 0) {
    return null;
  }

  return { quantity, unitPrice, lineAmount };
}

export function isLineItemTable(block: OcrBlock): boolean {
  if (block.type !== OcrBlockType.TABLE || !block.rows || block.rows.length < 2) {
    return false;
  }
  const columnCount = block.rows[0]?.length ?? 0;
  if (columnCount < 4) {
    return false;
  }
  return detectLineItemColumns(block.rows[0] ?? []) !== null || columnCount >= 6;
}

export function validateTableShape(block: OcrBlock): LayoutValidationIssue[] {
  if (!block.rows || block.rows.length === 0) {
    return [];
  }
  const expected = block.rows[0]?.length ?? 0;
  const jagged = block.rows.some((row) => row.length !== expected);
  if (!jagged) {
    return [];
  }
  return [
    {
      reason: LayoutValidationReason.TABLE_JAGGED_ROWS,
      message: `Table on page ${block.page} has uneven row lengths`,
      page: block.page,
    },
  ];
}

function cellLooksNumeric(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return NUMERIC_PATTERN.test(trimmed) && /\d/.test(trimmed);
}

export function validateNumericCells(block: OcrBlock): LayoutValidationIssue[] {
  if (!isLineItemTable(block) || !block.rows) {
    return [];
  }

  const columns = detectLineItemColumns(block.rows[0] ?? []);
  const numericStart = columns?.quantity ?? 3;

  const issues: LayoutValidationIssue[] = [];
  block.rows.slice(1).forEach((row, index) => {
    const tail = row.slice(numericStart);
    const hasNumeric = tail.some(cellLooksNumeric);
    if (!hasNumeric) {
      return;
    }
    const hasEmpty = tail.some((cell) => cell.trim() === "");
    if (hasEmpty) {
      issues.push({
        reason: LayoutValidationReason.MISSING_NUMERIC_CELL,
        message: `Missing numeric cell in table row ${index + 1} on page ${block.page}`,
        page: block.page,
        rowIndex: index + 1,
      });
    }
  });
  return issues;
}

export function validateArithmetic(
  block: OcrBlock,
  toleranceRatio: number,
): LayoutValidationIssue[] {
  if (!isLineItemTable(block) || !block.rows || block.rows.length < 2) {
    return [];
  }

  const columns =
    detectLineItemColumns(block.rows[0] ?? []) ??
    ({ quantity: 3, unitPrice: 4, lineAmount: 5 } satisfies LineItemColumnMap);

  const issues: LayoutValidationIssue[] = [];
  block.rows.slice(1).forEach((row, index) => {
    if (row.length <= columns.lineAmount) {
      return;
    }
    const quantity = parseVietnameseNumber(row[columns.quantity] ?? "");
    const unitPrice = parseVietnameseNumber(row[columns.unitPrice] ?? "");
    const lineAmount = parseVietnameseNumber(row[columns.lineAmount] ?? "");
    if (quantity === null || unitPrice === null || lineAmount === null) {
      return;
    }
    const expected = quantity * unitPrice;
    const delta = Math.abs(expected - lineAmount);
    const tolerance = Math.max(Math.abs(lineAmount) * toleranceRatio, 1);
    if (delta > tolerance) {
      issues.push({
        reason: LayoutValidationReason.ARITHMETIC_MISMATCH,
        message: `Line ${index + 1} amount mismatch on page ${block.page}`,
        page: block.page,
        rowIndex: index + 1,
      });
    }
  });
  return issues;
}

export function runCompletenessGate(
  blocks: OcrBlock[],
  config: Pick<AppConfig, "NUMERIC_TOLERANCE_RATIO">,
): LayoutValidationResult {
  const issues = blocks.flatMap((block) => [
    ...validateTableShape(block),
    ...validateNumericCells(block),
    ...validateArithmetic(block, config.NUMERIC_TOLERANCE_RATIO),
  ]);
  return { ok: issues.length === 0, issues };
}

export function formatValidationErrors(issues: LayoutValidationIssue[]): string {
  const codes = [...new Set(issues.map((issue) => issue.reason))];
  return `Layout validation failed: ${codes.join(", ")}`;
}
