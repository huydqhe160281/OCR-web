import { describe, expect, it } from "vitest";
import {
  BlockConfidence,
  BlockLanguage,
  OcrBlockType,
  type OcrBlock,
} from "@/lib/types";
import { buildDocxBuffer } from "@/lib/export/docx-builder";

describe("buildDocxBuffer", () => {
  it("builds docx for heading paragraph and table", async () => {
    const blocks: OcrBlock[] = [
      {
        page: 1,
        type: OcrBlockType.HEADING,
        level: 1,
        text: "Title",
        language: BlockLanguage.VI,
        confidence: BlockConfidence.HIGH,
      },
      {
        page: 1,
        type: OcrBlockType.PARAGRAPH,
        text: "Body text",
        confidence: BlockConfidence.HIGH,
      },
      {
        page: 2,
        type: OcrBlockType.TABLE,
        text: "Table",
        rows: [
          ["A", "B"],
          ["1", "2"],
        ],
        confidence: BlockConfidence.MEDIUM,
      },
    ];

    const buffer = await buildDocxBuffer(blocks);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });
});
