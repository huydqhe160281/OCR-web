import { NextResponse } from "next/server";
import { parseParams } from "@/lib/api/parse-request";
import { jobIdParamSchema } from "@/lib/api/schemas";
import { getJob } from "@/lib/jobs/job-store";

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

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
