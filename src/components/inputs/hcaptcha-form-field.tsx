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
};

export const HCaptchaField = forwardRef<HCaptchaHandle, HCaptchaFieldProps>(
  ({ onVerify, onError, onExpire, size = "normal", label, required }, ref) => {
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

    return (
      <div className="space-y-2">
        {label && (
          <Label>
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
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
      </div>
    );
  },
);

HCaptchaField.displayName = "HCaptchaField";
