import { get, put } from "@vercel/blob";
import { BLOB_ACCESS } from "./blob-constants";
import type { OcrBlock } from "./types";

export async function uploadOutputDocx(
  jobId: string,
  buffer: Buffer,
): Promise<string> {
  const blob = await put(`outputs/${jobId}.docx`, buffer, {
    access: BLOB_ACCESS,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return blob.url;
}

export async function fetchBlobBuffer(url: string): Promise<Buffer> {
  const result = await get(url, { access: BLOB_ACCESS });
  if (!result) {
    throw new Error("Failed to fetch blob: not found");
  }
  const arrayBuffer = await new Response(result.stream).arrayBuffer();
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

export function buildDocxDownloadPath(jobId: string): string {
  return `/api/jobs/${jobId}/download`;
}

/** ASCII `filename=` fallback + RFC 5987 `filename*` for Unicode names. */
export function buildDocxContentDisposition(originalFileName: string): string {
  const baseName = originalFileName.replace(/\.[^.]+$/, "") || "ocr-output";
  const utf8Name = `${baseName}.docx`;
  const asciiName =
    utf8Name
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_") || "ocr-output.docx";
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`;
}
