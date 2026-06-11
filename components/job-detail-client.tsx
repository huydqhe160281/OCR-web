"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { buildDocxDownloadPath } from "@/lib/blob";
import type { Job } from "@/lib/types";
import { PreviewPanel } from "@/components/preview-panel";
import { ProgressBar } from "@/components/progress-bar";

interface JobDetailClientProps {
  initialJob: Job;
}

export function JobDetailClient({ initialJob }: JobDetailClientProps) {
  const [job, setJob] = useState(initialJob);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/jobs/${job.id}`);
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { job: Job };
    setJob(payload.job);
  }, [job.id]);

  useEffect(() => {
    if (job.status === "completed" || job.status === "failed") {
      return;
    }

    const timer = setInterval(() => {
      void refresh();
    }, 2000);

    return () => clearInterval(timer);
  }, [job.status, refresh]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-xl font-bold">{job.fileName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Status: {job.status}
          {job.errorCode ? ` (${job.errorCode})` : ""}
        </p>
        {(job.status === "processing" || job.status === "queued") && (
          <div className="mt-4">
            <ProgressBar current={job.progress.current} total={job.progress.total} />
          </div>
        )}
        {job.error ? <p className="mt-3 text-sm text-red-600">{job.error}</p> : null}
      </header>

      {job.status === "completed" ? (
        <a
          href={buildDocxDownloadPath(job.id)}
          className="mb-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Download DOCX
        </a>
      ) : null}

      {job.blocks && job.blocks.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Preview</h2>
          {job.blocksPreviewTruncated ? (
            <p className="mb-3 text-sm text-amber-700">
              Preview shows the first {job.blocks.length} of {job.blocksTotalCount}{" "}
              blocks. Download DOCX for the full document.
            </p>
          ) : null}
          <PreviewPanel blocks={job.blocks} />
        </section>
      ) : null}
    </main>
  );
}
