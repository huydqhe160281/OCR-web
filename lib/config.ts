import { z } from "zod";

const booleanEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => value === true || value === "true");

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .optional()
    .transform((value) => value?.replace(/^["']|["']$/g, "").trim() || undefined),
  GEMINI_OCR_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_OCR_MODEL_FALLBACK: z.string().default("gemini-2.0-flash,gemini-1.5-flash"),
  GEMINI_STRUCTURE_MODEL: z.string().default("gemini-2.5-pro"),
  GEMINI_STRUCTURE_MODEL_FALLBACK: z.string().default("gemini-2.0-flash,gemini-1.5-pro"),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(25),
  MAX_PAGES: z.coerce.number().int().positive().default(50),
  JOB_TTL_HOURS: z.coerce.number().int().positive().default(24),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  LAYOUT_EXPORT_V2: booleanEnv.default(false),
  MAX_LAYOUT_VERIFY_RETRIES: z.coerce.number().int().nonnegative().default(2),
  NUMERIC_TOLERANCE_RATIO: z.coerce.number().positive().default(0.02),
  RETRY_CROP_PADDING: z.coerce.number().nonnegative().default(0.05),
  REGION_LEFT_MAX: z.coerce.number().positive().max(1).default(0.33),
  REGION_CENTER_MAX: z.coerce.number().positive().max(1).default(0.66),
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

export function resetConfigCache(): void {
  cached = null;
}

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
    retryBackoffMs: [2000, 5000, 10000, 15000] as const,
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

export function assertProductionKvConfigured(): void {
  if (process.env.VERCEL !== "1") {
    return;
  }

  const config = getConfig();
  if (config.KV_REST_API_URL && config.KV_REST_API_TOKEN) {
    return;
  }

  throw new Error(
    "[job-store] KV not configured on Vercel — configure Upstash Redis / Vercel KV (KV_REST_API_URL, KV_REST_API_TOKEN).",
  );
}

export const BATCH_SIZE = 5;
export const MAX_CONCURRENT_BATCHES = 3;
