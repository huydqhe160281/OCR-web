import { describe, expect, it } from "vitest";
import { buildDocxContentDisposition } from "@/lib/blob";

describe("buildDocxContentDisposition", () => {
  it("uses ASCII filename= with UTF-8 filename* for Vietnamese names", () => {
    const header = buildDocxContentDisposition("HĐ MIa ca (16-12-2025).pdf");
    expect(header).toMatch(/^attachment; filename="[^"]*"; filename\*=UTF-8''/);
    expect(header).not.toMatch(/filename="[^"]*Đ/);
    expect(header).toContain(
      encodeURIComponent("HĐ MIa ca (16-12-2025).docx"),
    );
  });
});
