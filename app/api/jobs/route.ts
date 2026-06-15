import { after, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { parseJsonBody } from "@/lib/api/parse-request";
import { createJobBodySchema } from "@/lib/api/schemas";
import { getConfig } from "@/lib/config";
import { listJobs, saveJob } from "@/lib/jobs/job-store";
import {
  runJobProcessing,
  shouldUseInngest,
} from "@/lib/jobs/trigger-processing";
import { JobStatus } from "@/lib/types";

export async function GET(): Promise<NextResponse> {
  const jobs = await listJobs(20);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    getConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server misconfigured";
    return NextResponse.json(
      { error: `OCR service unavailable: ${message}` },
      { status: 503 },
    );
  }

  const parsed = await parseJsonBody(request, createJobBodySchema);
  if ("error" in parsed) {
    return parsed.error;
  }

  const { blobUrl, fileName, mimeType } = parsed.data;

  const job = {
    id: uuidv4(),
    fileName,
    mimeType,
    blobUrl,
    status: JobStatus.QUEUED,
    progress: { current: 0, total: 0 },
    createdAt: new Date().toISOString(),
  };

  await saveJob(job);

  if (shouldUseInngest()) {
    return NextResponse.json(
      {
        error:
          "USE_INNGEST=true but Inngest route is not configured. Set USE_INNGEST=false or add app/api/inngest/route.ts.",
      },
      { status: 501 },
    );
  }

  after(async () => {
    await runJobProcessing(job.id);
  });

  return NextResponse.json({ job }, { status: 201 });
}
