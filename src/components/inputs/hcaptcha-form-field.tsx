"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

import { env } from "~/env";
import { Label } from "~/components/ui/label";

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

    useImperativeHandle(ref, () => ({
      execute: () => {
        captchaRef.current?.execute();
      },
      reset: () => {
        captchaRef.current?.resetCaptcha();
      },
    }));

    if (!siteKey || process.env.NODE_ENV === "development") {
      console.warn("NEXT_PUBLIC_HCAPTCHA_SITE_KEY not configured");
      return null;
    }

    const labelId = fieldId ? `${fieldId}-label` : undefined;
    const resolvedErrorId = error ? (errorId ?? (fieldId ? `${fieldId}-error` : undefined)) : undefined;

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
            {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
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
