import { describe, expect, it } from "vitest";
import { buildBlobPathname } from "@/lib/blob-pathname";

describe("buildBlobPathname", () => {
  it("uses uuid path with original extension", () => {
    const path = buildBlobPathname("VPP (21-10-2025).pdf");
    expect(path).toMatch(/^uploads\/[0-9a-f-]{36}\.pdf$/);
  });

  it("falls back to .bin when extension is unsafe", () => {
    const path = buildBlobPathname("report");
    expect(path).toMatch(/^uploads\/[0-9a-f-]{36}\.bin$/);
  });
});
