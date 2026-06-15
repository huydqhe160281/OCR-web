import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api/parse-request";
import { bulkJobActionSchema } from "@/lib/api/schemas";
import {
  buildBulkDocxZip,
  buildZipContentDisposition,
} from "@/lib/jobs/bulk-download";
import { deleteJob, getJob } from "@/lib/jobs/job-store";

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = await parseJsonBody(request, bulkJobActionSchema);
  if ("error" in parsed) {
    return parsed.error;
  }

  const { ids, action } = parsed.data;
  const uniqueIds = [...new Set(ids)];

  if (action === "delete") {
    const deleted: string[] = [];
    const notFound: string[] = [];

    for (const id of uniqueIds) {
      const job = await getJob(id);
      if (!job) {
        notFound.push(id);
        continue;
      }
      const ok = await deleteJob(id);
      if (ok) {
        deleted.push(id);
      } else {
        notFound.push(id);
      }
    }

    return NextResponse.json({ deleted, notFound });
  }

  const { buffer, included, skipped } = await buildBulkDocxZip(uniqueIds);

  if (included.length === 0) {
    return NextResponse.json(
      {
        error: "No completed jobs with DOCX output in selection",
        skipped,
      },
      { status: 400 },
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": buildZipContentDisposition(),
      "Content-Length": String(buffer.length),
      "X-OCR-Included-Count": String(included.length),
      "X-OCR-Skipped-Count": String(skipped.length),
    },
  });
}
