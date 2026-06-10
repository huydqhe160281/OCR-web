import { notFound } from "next/navigation";
import { getJob } from "@/lib/jobs/job-store";
import { JobDetailClient } from "@/components/job-detail-client";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ id: string }> };

export default async function JobDetailPage({ params }: PageParams) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  return <JobDetailClient initialJob={job} />;
}
