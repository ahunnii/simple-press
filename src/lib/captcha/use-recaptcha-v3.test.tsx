import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envMock = {
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "site-key" as string | undefined,
  NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS: undefined as string | undefined,
};
vi.mock("~/env", () => ({ env: envMock }));

/**
 * Scripts the hook tried to inject. `appendChild` is stubbed (not forwarded)
 * so happy-dom never attempts a real script fetch.
 */
let injected: HTMLScriptElement[] = [];
const recaptchaScripts = () => injected;

/** The script tag is injected once per page, held in module state: re-import per test. */
async function loadHook() {
  vi.resetModules();
  return (await import("./use-recaptcha-v3")).useRecaptchaV3;
}

describe("useRecaptchaV3 warm-up", () => {
  beforeEach(() => {
    envMock.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-key";
    envMock.NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS = undefined;
    injected = [];
    vi.spyOn(document.head, "appendChild").mockImplementation(((node: Node) => {
      if (node instanceof HTMLScriptElement) injected.push(node);
      return node;
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the script on mount by default ("mount")', async () => {
    const useRecaptchaV3 = await loadHook();
    renderHook(() => useRecaptchaV3());
    expect(recaptchaScripts()).toHaveLength(1);
  });

  it('does not load the script on mount in "interaction" mode', async () => {
    const useRecaptchaV3 = await loadHook();
    renderHook(() => useRecaptchaV3({ warm: "interaction" }));
    expect(recaptchaScripts()).toHaveLength(0);
  });

  it("warm() injects the script once, however often it is called", async () => {
    const useRecaptchaV3 = await loadHook();
    const { result } = renderHook(() =>
      useRecaptchaV3({ warm: "interaction" }),
    );
    result.current.warm();
    result.current.warm();
    expect(recaptchaScripts()).toHaveLength(1);
  });

  it("warm() is a no-op when disabled", async () => {
    const useRecaptchaV3 = await loadHook();
    const { result } = renderHook(() =>
      useRecaptchaV3({ enabled: false, warm: "interaction" }),
    );
    result.current.warm();
    expect(recaptchaScripts()).toHaveLength(0);
  });

  it("warm() is a no-op without a site key", async () => {
    envMock.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = undefined;
    const useRecaptchaV3 = await loadHook();
    const { result } = renderHook(() =>
      useRecaptchaV3({ warm: "interaction" }),
    );
    result.current.warm();
    expect(recaptchaScripts()).toHaveLength(0);
  });

  it("warm() is a no-op under the test bypass, and execute returns the sentinel", async () => {
    envMock.NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS = "1";
    const mod = await import("./use-recaptcha-v3");
    vi.resetModules();
    const { useRecaptchaV3, RECAPTCHA_TEST_BYPASS_TOKEN } =
      await import("./use-recaptcha-v3");
    expect(mod.RECAPTCHA_TEST_BYPASS_TOKEN).toBe(RECAPTCHA_TEST_BYPASS_TOKEN);
    const { result } = renderHook(() =>
      useRecaptchaV3({ warm: "interaction" }),
    );
    result.current.warm();
    expect(recaptchaScripts()).toHaveLength(0);
    await expect(result.current.execute("newsletter")).resolves.toBe(
      RECAPTCHA_TEST_BYPASS_TOKEN,
    );
  });
});
