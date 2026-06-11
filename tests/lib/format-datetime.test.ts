import { describe, expect, it } from "vitest";
import { formatDateTimeUtc } from "@/lib/format-datetime";

describe("formatDateTimeUtc", () => {
  it("formats ISO timestamps in fixed UTC layout", () => {
    expect(formatDateTimeUtc("2026-06-11T07:28:00.000Z")).toBe("2026-06-11 07:28 UTC");
  });

  it("returns the input when parsing fails", () => {
    expect(formatDateTimeUtc("not-a-date")).toBe("not-a-date");
  });
});
