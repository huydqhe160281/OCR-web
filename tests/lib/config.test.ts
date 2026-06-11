import { describe, expect, it, vi } from "vitest";

describe("getConfig", () => {
  it("rejects missing GEMINI_API_KEY", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.resetModules();
    const { getConfig } = await import("@/lib/config");
    expect(() => getConfig()).toThrow(/GEMINI_API_KEY/);
    vi.unstubAllEnvs();
  });
});
