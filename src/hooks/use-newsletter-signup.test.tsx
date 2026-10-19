import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNewsletterSignup } from "./use-newsletter-signup";

let emailMarketing = true;
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => key === "emailMarketing" && emailMarketing,
  }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    newsletter: {
      subscribe: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

const useRecaptchaV3 = vi.fn();
vi.mock("~/lib/captcha/use-recaptcha-v3", () => ({
  useRecaptchaV3: (opts: unknown) => {
    useRecaptchaV3(opts);
    return { execute: vi.fn(), warm: warmSpy };
  },
}));
const warmSpy = vi.fn();

describe("useNewsletterSignup", () => {
  beforeEach(() => {
    emailMarketing = true;
    useRecaptchaV3.mockClear();
    warmSpy.mockClear();
  });

  it("defaults to warming reCAPTCHA on mount", () => {
    renderHook(() => useNewsletterSignup());
    expect(useRecaptchaV3).toHaveBeenCalledWith({
      enabled: true,
      warm: "mount",
    });
  });

  it('passes warm: "interaction" through and exposes warmCaptcha', () => {
    const { result } = renderHook(() =>
      useNewsletterSignup({ warm: "interaction" }),
    );
    expect(useRecaptchaV3).toHaveBeenCalledWith({
      enabled: true,
      warm: "interaction",
    });
    result.current.warmCaptcha();
    expect(warmSpy).toHaveBeenCalledTimes(1);
  });

  it("reports disabled when email marketing is off", () => {
    emailMarketing = false;
    const { result } = renderHook(() =>
      useNewsletterSignup({ warm: "interaction" }),
    );
    expect(result.current.status).toBe("disabled");
  });
});
