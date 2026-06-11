import { NextResponse } from "next/server";
import { parseParams } from "@/lib/api/parse-request";
import { jobIdParamSchema } from "@/lib/api/schemas";
import { getJob } from "@/lib/jobs/job-store";
import { runJobProcessing } from "@/lib/jobs/trigger-processing";
import { JobStatus } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export const maxDuration = 300;

export async function POST(
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

  if (job.status === JobStatus.PROCESSING) {
    return NextResponse.json({ job, message: "Already processing" });
  }

  if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
    return NextResponse.json({ job, message: "Job already finished" });
  }

  await runJobProcessing(parsed.data.id);
  const updated = await getJob(parsed.data.id);
  return NextResponse.json({ job: updated });
}
