"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

import { env } from "~/env";
import { Label } from "~/components/ui/label";

/**
 * Sentinel token supplied in local dev (or when the site key isn't
 * configured) so consumers that gate submit on `!captchaToken` don't get
 * permanently disabled. The server-side verifier
 * (`src/lib/captcha/verify-hcaptcha.ts`) independently skips verification
 * under the same `NODE_ENV === "development"` condition, so this token is
 * never actually checked against hCaptcha.
 */
export const HCAPTCHA_DEV_BYPASS_TOKEN = "dev-bypass-no-captcha";

export type HCaptchaHandle = {
  execute: () => void;
  reset: () => void;
};

type HCaptchaFieldProps = {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  size?: "normal" | "compact" | "invisible";
  label?: string;
  required?: boolean;
  /** Stable id for the captcha container — used to associate the label and aria-describedby */
  fieldId?: string;
  /** Id of an error element to reference via aria-describedby on the widget container */
  errorId?: string;
  /** Inline error message; rendered in a role="alert" element when provided */
  error?: string;
};

export const HCaptchaField = forwardRef<HCaptchaHandle, HCaptchaFieldProps>(
  (
    {
      onVerify,
      onError,
      onExpire,
      size = "normal",
      label,
      required,
      fieldId,
      errorId,
      error,
    },
    ref,
  ) => {
    const captchaRef = useRef<HCaptcha>(null);
    const siteKey = env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
    const isDevBypass = !siteKey || process.env.NODE_ENV === "development";

    // Keep the latest onVerify in a ref so the bypass effect below doesn't
    // need onVerify in its dependency array (consumers often pass an inline
    // function, which would otherwise re-fire the effect every render).
    const onVerifyRef = useRef(onVerify);
    useEffect(() => {
      onVerifyRef.current = onVerify;
    }, [onVerify]);

    useImperativeHandle(ref, () => ({
      execute: () => {
        if (isDevBypass) {
          onVerifyRef.current(HCAPTCHA_DEV_BYPASS_TOKEN);
          return;
        }
        captchaRef.current?.execute();
      },
      reset: () => {
        captchaRef.current?.resetCaptcha();
      },
    }));

    useEffect(() => {
      if (isDevBypass) {
        onVerifyRef.current(HCAPTCHA_DEV_BYPASS_TOKEN);
      }
      // Only re-run if the bypass condition itself changes — reading
      // onVerifyRef.current rather than onVerify directly means this effect
      // doesn't need onVerify in its dependency array.
    }, [isDevBypass]);

    if (isDevBypass) {
      console.warn(
        "NEXT_PUBLIC_HCAPTCHA_SITE_KEY not configured — using dev bypass token so captcha-gated forms remain submittable in development",
      );
      return null;
    }

    const labelId = fieldId ? `${fieldId}-label` : undefined;
    const resolvedErrorId = error
      ? (errorId ?? (fieldId ? `${fieldId}-error` : undefined))
      : undefined;

    return (
      <div
        className="space-y-2"
        id={fieldId}
        role="group"
        aria-labelledby={labelId}
        aria-describedby={resolvedErrorId}
      >
        {label && (
          <Label id={labelId}>
            {label}
            {required && (
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </Label>
        )}
        <HCaptcha
          ref={captchaRef}
          sitekey={siteKey}
          onVerify={onVerify}
          onError={onError}
          onExpire={onExpire}
          size={size}
        />
        {error && resolvedErrorId && (
          <p id={resolvedErrorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

HCaptchaField.displayName = "HCaptchaField";
