import { describe, expect, it } from "vitest";
import { createJobBodySchema, jobIdParamSchema } from "./schemas";

describe("createJobBodySchema", () => {
  it("accepts valid job payload", () => {
    const result = createJobBodySchema.safeParse({
      blobUrl: "https://example.blob.vercel-storage.com/file.pdf",
      fileName: "report.pdf",
      mimeType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid mime type", () => {
    const result = createJobBodySchema.safeParse({
      blobUrl: "https://example.blob.vercel-storage.com/file.zip",
      fileName: "file.zip",
      mimeType: "application/zip",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing blobUrl", () => {
    const result = createJobBodySchema.safeParse({
      fileName: "a.pdf",
      mimeType: "application/pdf",
    });
    expect(result.success).toBe(false);
  });
});

describe("jobIdParamSchema", () => {
  it("accepts uuid", () => {
    const result = jobIdParamSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid", () => {
    const result = jobIdParamSchema.safeParse({ id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
