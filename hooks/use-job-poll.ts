"use client";

import { useCallback, useEffect, useState } from "react";
import {
  JOB_POLL_MAX_DURATION_MS,
  isActiveJobStatus,
  jobPollIntervalMs,
} from "@/lib/jobs/poll-interval";
import type { Job } from "@/lib/types";

const HIDDEN_CHECK_MS = 2000;

interface UseJobPollOptions {
  jobId: string;
  status: Job["status"];
  onJob: (job: Job) => void;
}

interface UseJobPollResult {
  pollingPaused: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  resumeAutoPoll: () => void;
}

export function useJobPoll({
  jobId,
  status,
  onJob,
}: UseJobPollOptions): UseJobPollResult {
  const [pollingPaused, setPollingPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollSession, setPollSession] = useState(0);

  const active = isActiveJobStatus(status);

  const fetchJob = useCallback(async (): Promise<Job | null> => {
    const response = await fetch(`/api/jobs/${jobId}`);
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { job: Job };
    return payload.job;
  }, [jobId]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await fetchJob();
      if (next) {
        onJob(next);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchJob, onJob]);

  const resumeAutoPoll = useCallback(() => {
    setPollingPaused(false);
    setPollSession((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!active || pollingPaused) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const sessionStartedAt = Date.now();

    const scheduleNext = (elapsedMs: number): void => {
      if (cancelled) {
        return;
      }

      if (elapsedMs >= JOB_POLL_MAX_DURATION_MS) {
        setPollingPaused(true);
        return;
      }

      if (typeof document !== "undefined" && document.hidden) {
        timeoutId = setTimeout(() => {
          scheduleNext(Date.now() - sessionStartedAt);
        }, HIDDEN_CHECK_MS);
        return;
      }

      const delay = jobPollIntervalMs(elapsedMs);
      timeoutId = setTimeout(() => {
        void (async () => {
          await refresh();
          if (!cancelled) {
            scheduleNext(Date.now() - sessionStartedAt);
          }
        })();
      }, delay);
    };

    const onVisibilityChange = (): void => {
      if (cancelled || document.hidden || !active || pollingPaused) {
        return;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      void refresh().finally(() => {
        if (!cancelled) {
          scheduleNext(Date.now() - sessionStartedAt);
        }
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    scheduleNext(0);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, pollingPaused, pollSession, refresh]);

  useEffect(() => {
    if (!active) {
      setPollingPaused(false);
    }
  }, [active]);

  return {
    pollingPaused: active && pollingPaused,
    isRefreshing,
    refresh,
    resumeAutoPoll,
  };
}
