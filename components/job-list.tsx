"use client";

import Link from "next/link";
import { buildDocxDownloadPath } from "@/lib/blob";
import { formatDateTimeUtc } from "@/lib/format-datetime";
import type { Job } from "@/lib/types";
import { ProgressBar } from "./progress-bar";

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No jobs yet. Upload a document to start.</p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {jobs.map((job) => (
        <li key={job.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href={`/jobs/${job.id}`}
                className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {job.fileName}
              </Link>
              <p className="mt-1 text-xs text-zinc-500">
                {job.status} · {formatDateTimeUtc(job.createdAt)}
              </p>
              {job.status === "processing" || job.status === "queued" ? (
                <div className="mt-3">
                  <ProgressBar current={job.progress.current} total={job.progress.total} />
                </div>
              ) : null}
              {job.error ? (
                <p className="mt-2 text-xs text-red-600">{job.error}</p>
              ) : null}
            </div>
            {job.status === "completed" ? (
              <a
                href={buildDocxDownloadPath(job.id)}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
              >
                DOCX
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
