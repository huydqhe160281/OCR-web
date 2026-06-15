/** First 30s: poll every 2s (responsive progress). */
export const JOB_POLL_FAST_MS = 2000;

/** 30s–2min: poll every 5s. */
export const JOB_POLL_MEDIUM_MS = 5000;

/** After 2min: poll every 10s (long OCR / Gemini retries). */
export const JOB_POLL_SLOW_MS = 10000;

/** Stop auto-poll after this duration; user can refresh manually. */
export const JOB_POLL_MAX_DURATION_MS = 10 * 60 * 1000;

const FAST_PHASE_MS = 30_000;
const MEDIUM_PHASE_MS = 120_000;

export function jobPollIntervalMs(elapsedMs: number): number {
  if (elapsedMs < FAST_PHASE_MS) {
    return JOB_POLL_FAST_MS;
  }
  if (elapsedMs < MEDIUM_PHASE_MS) {
    return JOB_POLL_MEDIUM_MS;
  }
  return JOB_POLL_SLOW_MS;
}

export function isActiveJobStatus(status: string): boolean {
  return status === "queued" || status === "processing";
}
