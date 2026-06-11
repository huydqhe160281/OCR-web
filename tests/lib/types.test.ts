import { describe, expect, it } from "vitest";
import {
  BlockConfidence,
  BlockLanguage,
  JobStatus,
  MimeType,
  OcrBlockType,
} from "@/lib/types";

describe("types", () => {
  it("exports job status values", () => {
    expect(JobStatus.QUEUED).toBe("queued");
    expect(JobStatus.COMPLETED).toBe("completed");
  });

  it("exports supported mime types", () => {
    expect(MimeType.PDF).toBe("application/pdf");
  });

  it("models ocr block shape", () => {
    const block = {
      page: 1,
      type: OcrBlockType.PARAGRAPH,
      text: "Xin chào",
      language: BlockLanguage.VI,
      confidence: BlockConfidence.HIGH,
    };
    expect(block.text).toContain("chào");
  });
});
