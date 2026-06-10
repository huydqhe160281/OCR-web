import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { parseParams } from "@/lib/api/parse-request";
import { jobIdParamSchema } from "@/lib/api/schemas";
import { buildDocxContentDisposition } from "@/lib/blob";
import { BLOB_ACCESS } from "@/lib/blob-constants";
import { getJob } from "@/lib/jobs/job-store";
import { JobStatus } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const resolved = await params;
  const parsed = parseParams(resolved, jobIdParamSchema);
  if ("error" in parsed) {
    return parsed.error;
  }

  const job = await getJob(parsed.data.id);
  if (!job || job.status !== JobStatus.COMPLETED || !job.outputBlobUrl) {
    return NextResponse.json({ error: "Output not available" }, { status: 404 });
  }

  const blob = await get(job.outputBlobUrl, { access: BLOB_ACCESS });
  if (!blob) {
    return NextResponse.json({ error: "Output file not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": buildDocxContentDisposition(job.fileName),
      "Content-Length": String(buffer.length),
    },
  });
}
