import { z } from "zod";
import { SUPPORTED_MIME_TYPES } from "@/lib/types";

export const createJobBodySchema = z.object({
  blobUrl: z.string().url(),
  fileName: z.string().min(1).max(512),
  mimeType: z.enum(SUPPORTED_MIME_TYPES as [string, ...string[]]),
});

export type CreateJobBody = z.infer<typeof createJobBodySchema>;

export const jobIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type JobIdParam = z.infer<typeof jobIdParamSchema>;
