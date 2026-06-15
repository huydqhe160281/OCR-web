import { describe, expect, it } from "vitest";
import {
  JOB_POLL_FAST_MS,
  JOB_POLL_MEDIUM_MS,
  JOB_POLL_SLOW_MS,
  isActiveJobStatus,
  jobPollIntervalMs,
} from "@/lib/jobs/poll-interval";

describe("jobPollIntervalMs", () => {
  it("uses fast interval in first 30 seconds", () => {
    expect(jobPollIntervalMs(0)).toBe(JOB_POLL_FAST_MS);
    expect(jobPollIntervalMs(29_999)).toBe(JOB_POLL_FAST_MS);
  });

  it("uses medium interval between 30s and 2 minutes", () => {
    expect(jobPollIntervalMs(30_000)).toBe(JOB_POLL_MEDIUM_MS);
    expect(jobPollIntervalMs(119_999)).toBe(JOB_POLL_MEDIUM_MS);
  });

  it("uses slow interval after 2 minutes", () => {
    expect(jobPollIntervalMs(120_000)).toBe(JOB_POLL_SLOW_MS);
    expect(jobPollIntervalMs(600_000)).toBe(JOB_POLL_SLOW_MS);
  });
});

describe("isActiveJobStatus", () => {
  it("treats queued and processing as active", () => {
    expect(isActiveJobStatus("queued")).toBe(true);
    expect(isActiveJobStatus("processing")).toBe(true);
  });

  it("treats terminal states as inactive", () => {
    expect(isActiveJobStatus("completed")).toBe(false);
    expect(isActiveJobStatus("failed")).toBe(false);
  });
});
