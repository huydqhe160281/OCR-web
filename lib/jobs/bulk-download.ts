import JSZip from "jszip";
import { fetchBlobBuffer } from "../blob";
import { getJob } from "./job-store";
import { JobStatus } from "../types";

function docxFileName(job: { fileName: string }): string {
  const baseName = job.fileName.replace(/\.[^.]+$/, "") || "ocr-output";
  return `${baseName}.docx`;
}

function uniqueZipEntryName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  let index = 2;
  const stem = name.replace(/\.docx$/i, "") || "ocr-output";
  while (used.has(`${stem} (${index}).docx`)) {
    index += 1;
  }
  const unique = `${stem} (${index}).docx`;
  used.add(unique);
  return unique;
}

export async function buildBulkDocxZip(jobIds: string[]): Promise<{
  buffer: Buffer;
  included: string[];
  skipped: string[];
}> {
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const included: string[] = [];
  const skipped: string[] = [];

  for (const id of jobIds) {
    const job = await getJob(id);
    if (!job || job.status !== JobStatus.COMPLETED || !job.outputBlobUrl) {
      skipped.push(id);
      continue;
    }

    const buffer = await fetchBlobBuffer(job.outputBlobUrl);
    const entryName = uniqueZipEntryName(docxFileName(job), usedNames);
    zip.file(entryName, buffer);
    included.push(id);
  }

  if (included.length === 0) {
    return { buffer: Buffer.alloc(0), included, skipped };
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return { buffer: zipBuffer, included, skipped };
}

export function buildZipContentDisposition(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `attachment; filename="ocr-outputs-${stamp}.zip"`;
}
