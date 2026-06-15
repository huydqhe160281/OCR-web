import { afterEach, describe, expect, it, vi } from "vitest";

describe("getConfig layout v2", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults LAYOUT_EXPORT_V2 to false", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("LAYOUT_EXPORT_V2", "");
    vi.resetModules();
    const { getConfig, resetConfigCache } = await import("@/lib/config");
    resetConfigCache();
    expect(getConfig().LAYOUT_EXPORT_V2).toBe(false);
  });

  it("parses layout tuning env vars", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("LAYOUT_EXPORT_V2", "true");
    vi.stubEnv("MAX_LAYOUT_VERIFY_RETRIES", "3");
    vi.stubEnv("REGION_LEFT_MAX", "0.35");
    vi.resetModules();
    const { getConfig, resetConfigCache } = await import("@/lib/config");
    resetConfigCache();
    const config = getConfig();
    expect(config.LAYOUT_EXPORT_V2).toBe(true);
    expect(config.MAX_LAYOUT_VERIFY_RETRIES).toBe(3);
    expect(config.REGION_LEFT_MAX).toBe(0.35);
  });
});
