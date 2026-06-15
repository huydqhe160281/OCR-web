"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildDocxDownloadPath } from "@/lib/blob";
import { formatDateTimeUtc } from "@/lib/format-datetime";
import { JobStatus, type Job } from "@/lib/types";
import { ProgressBar } from "./progress-bar";

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const allSelected = jobs.length > 0 && selected.size === jobs.length;
  const selectedJobs = useMemo(
    () => jobs.filter((job) => selected.has(job.id)),
    [jobs, selected],
  );
  const downloadableCount = selectedJobs.filter(
    (job) => job.status === JobStatus.COMPLETED,
  ).length;

  const toggleOne = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(jobs.map((job) => job.id)));
  };

  const clearSelection = (): void => {
    setSelected(new Set());
  };

  const runBulkDelete = async (): Promise<void> => {
    if (selected.size === 0) {
      return;
    }
    const confirmed = window.confirm(
      `Xóa ${selected.size} job đã chọn? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          action: "delete",
        }),
      });
      if (!response.ok) {
        return;
      }
      clearSelection();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const runBulkDownload = async (): Promise<void> => {
    if (downloadableCount === 0) {
      return;
    }

    setBusy(true);
    try {
      const completedIds = selectedJobs
        .filter((job) => job.status === JobStatus.COMPLETED)
        .map((job) => job.id);

      const response = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: completedIds,
          action: "download",
        }),
      });

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ocr-outputs-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No jobs yet. Upload a document to start.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Chọn tất cả
        </label>
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">{selected.size} đã chọn</span>
            <button
              type="button"
              disabled={busy || downloadableCount === 0}
              onClick={() => void runBulkDownload()}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tải DOCX ({downloadableCount})
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runBulkDelete()}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              Xóa
            </button>
          </div>
        ) : null}
      </div>

      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {jobs.map((job) => (
          <li key={job.id} className="p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(job.id)}
                onChange={() => toggleOne(job.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
                aria-label={`Select ${job.fileName}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {job.fileName}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {job.status} · {formatDateTimeUtc(job.createdAt)}
                    </p>
                    {job.status === JobStatus.PROCESSING ||
                    job.status === JobStatus.QUEUED ? (
                      <div className="mt-3">
                        <ProgressBar
                          current={job.progress.current}
                          total={job.progress.total}
                        />
                      </div>
                    ) : null}
                    {job.error ? (
                      <p className="mt-2 line-clamp-2 text-xs text-red-600">{job.error}</p>
                    ) : null}
                  </div>
                  {job.status === JobStatus.COMPLETED ? (
                    <a
                      href={buildDocxDownloadPath(job.id)}
                      className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      DOCX
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
