import { put } from "@vercel/blob";
import type { OcrBlock } from "./types";

export async function uploadOutputDocx(
  jobId: string,
  buffer: Buffer,
): Promise<string> {
  const blob = await put(`outputs/${jobId}.docx`, buffer, {
    access: "public",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return blob.url;
}

export async function fetchBlobBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function blocksToPreviewMarkdown(blocks: OcrBlock[]): string {
  return blocks
    .map((block) => {
      const warn =
        block.confidence === "low" ? " ⚠️ _low confidence_" : "";
      if (block.type === "heading") {
        const level = block.level ?? 1;
        return `${"#".repeat(level)} ${block.text}${warn}`;
      }
      if (block.type === "table" && block.rows) {
        const header = block.rows[0] ?? [];
        const sep = header.map(() => "---");
        const body = block.rows.slice(1);
        return [
          `| ${header.join(" | ")} |${warn}`,
          `| ${sep.join(" | ")} |`,
          ...body.map((row) => `| ${row.join(" | ")} |`),
        ].join("\n");
      }
      return `${block.text}${warn}`;
    })
    .join("\n\n");
}
