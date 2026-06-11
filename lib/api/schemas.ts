import { z } from "zod";
import { SUPPORTED_MIME_TYPES } from "@/lib/types";

const BLOB_HOST_PATTERN = /^([a-z0-9-]+\.)*blob\.vercel-storage\.com$/i;

function isAllowedBlobUrl(url: string): boolean {
  try {
    return BLOB_HOST_PATTERN.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export const createJobBodySchema = z.object({
  blobUrl: z
    .string()
    .url()
    .refine(isAllowedBlobUrl, {
      message: "blobUrl must be a Vercel Blob URL (*.blob.vercel-storage.com)",
    }),
  fileName: z.string().min(1).max(512),
  mimeType: z.enum(SUPPORTED_MIME_TYPES as [string, ...string[]]),
});

export type CreateJobBody = z.infer<typeof createJobBodySchema>;

export const jobIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type JobIdParam = z.infer<typeof jobIdParamSchema>;
