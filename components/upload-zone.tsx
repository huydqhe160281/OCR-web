"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { buildBlobPathname } from "@/lib/blob-pathname";
import { BLOB_ACCESS } from "@/lib/blob-constants";
import { SUPPORTED_MIME_TYPES } from "@/lib/types";

const MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 25);
const MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function UploadZone() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      setError(null);

      if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
        setError(`Unsupported file type: ${file.type || "unknown"}`);
        return;
      }

      if (file.size > MAX_BYTES) {
        setError(`File exceeds ${MAX_FILE_SIZE_MB} MB limit`);
        return;
      }

      setUploading(true);
      try {
        const pathname = buildBlobPathname(file.name);
        const blob = await upload(pathname, file, {
          access: BLOB_ACCESS,
          handleUploadUrl: "/api/upload",
          contentType: file.type || undefined,
        });

        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: blob.url,
            fileName: file.name,
            mimeType: file.type,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to create job");
        }

        const { job } = (await response.json()) as { job: { id: string } };
        router.push(`/jobs/${job.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [router],
  );

  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        PDF, DOCX, JPG, PNG, WebP — max {MAX_FILE_SIZE_MB} MB
      </p>
      <label className="inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
        {uploading ? "Uploading…" : "Choose file"}
        <input
          type="file"
          className="hidden"
          accept={SUPPORTED_MIME_TYPES.join(",")}
          disabled={uploading}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
