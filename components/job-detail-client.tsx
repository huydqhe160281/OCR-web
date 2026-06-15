"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { buildDocxDownloadPath } from "@/lib/blob";
import type { Job } from "@/lib/types";
import { PreviewPanel } from "@/components/preview-panel";
import { ProgressBar } from "@/components/progress-bar";
import { useJobPoll } from "@/hooks/use-job-poll";

interface JobDetailClientProps {
  initialJob: Job;
}

export function JobDetailClient({ initialJob }: JobDetailClientProps) {
  const [job, setJob] = useState(initialJob);
  const [isRetrying, setIsRetrying] = useState(false);

  const onJob = useCallback((next: Job) => {
    setJob(next);
  }, []);

  const { pollingPaused, isRefreshing, refresh, resumeAutoPoll } = useJobPoll({
    jobId: job.id,
    status: job.status,
    onJob,
  });

  const handleManualRefresh = (): void => {
    void refresh();
    if (pollingPaused) {
      resumeAutoPoll();
    }
  };

  const retryProcessing = async (): Promise<void> => {
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/jobs/${job.id}/process`, { method: "POST" });
      if (response.ok) {
        const payload = (await response.json()) as { job: Job };
        setJob(payload.job);
        resumeAutoPoll();
      }
    } finally {
      setIsRetrying(false);
    }
  };

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
        {pollingPaused ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p>
              OCR vẫn có thể đang chạy (layout v2 + retry Gemini có thể mất vài phút).
              Tự động refresh đã tạm dừng sau 10 phút để giảm tải server.
            </p>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="mt-2 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {isRefreshing ? "Đang tải…" : "Refresh trạng thái"}
            </button>
          </div>
        ) : null}
        {job.error ? <p className="mt-3 text-sm text-red-600">{job.error}</p> : null}
        {job.status === "failed" ? (
          <button
            type="button"
            onClick={() => void retryProcessing()}
            disabled={isRetrying}
            className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {isRetrying ? "Đang thử lại…" : "Thử lại OCR"}
          </button>
        ) : null}
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
