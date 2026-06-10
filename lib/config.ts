import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  GEMINI_OCR_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_STRUCTURE_MODEL: z.string().default("gemini-2.5-pro"),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(25),
  MAX_PAGES: z.coerce.number().int().positive().default(50),
  JOB_TTL_HOURS: z.coerce.number().int().positive().default(24),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type AppConfig = z.infer<typeof envSchema> & {
  maxFileSizeBytes: number;
  batchSize: number;
  maxConcurrentBatches: number;
  retryBackoffMs: readonly number[];
};

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  cached = {
    ...parsed.data,
    maxFileSizeBytes: parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024,
    batchSize: 5,
    maxConcurrentBatches: 3,
    retryBackoffMs: [1000, 2000, 4000] as const,
  };

  return cached;
}

export function getConfigOrNull(): AppConfig | null {
  try {
    return getConfig();
  } catch {
    return null;
  }
}

export const BATCH_SIZE = 5;
export const MAX_CONCURRENT_BATCHES = 3;
