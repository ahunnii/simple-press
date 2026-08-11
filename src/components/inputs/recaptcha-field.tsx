"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { useRecaptchaAutoRefresh } from "~/lib/captcha/use-recaptcha-v3";

/**
 * Google's required attribution.
 *
 * The v3 badge is hidden on every SimplePress form (there is no widget to
 * show), and Google's terms permit that only if this disclosure appears in
 * the user flow instead. Exported so `RecaptchaWidget` renders the identical
 * text rather than keeping a second copy that can drift.
 */
export function RecaptchaDisclosure({ className }: { className?: string }) {
  return (
    <p
      className={`text-muted-foreground text-xs leading-relaxed ${className ?? ""}`}
    >
      This site is protected by reCAPTCHA and the Google{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:no-underline"
      >
        Privacy Policy
      </a>{" "}
      and{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:no-underline"
      >
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}

export type RecaptchaHandle = {
  /**
   * Mint a fresh token immediately and fire `onVerify` with it. Resolves
   * `null` if minting failed (in which case `onError` fires instead).
   *
   * Optional for consumers — the field mints on its own (see the component
   * docblock). Forms that submit through a plain async handler may still
   * await this at submit time for a maximally fresh token.
   */
  execute: () => Promise<string | null>;
  /**
   * Alias of `execute`. v3 has no widget state to clear, so "reset" simply
   * means "mint a replacement" — which is exactly what a retry needs, since
   * the previous token was already consumed at `/siteverify`.
   */
  reset: () => Promise<string | null>;
};

type RecaptchaFieldProps = {
  /**
   * The reCAPTCHA action this form declares, asserted server-side. One site
   * key serves every form on the platform, so without a per-form action a
   * token minted on the public contact form would replay against sign-up.
   */
  action: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  /** Accepted for call-site compatibility; v3 auto-refreshes before expiry. */
  onExpire?: () => void;
  /** Accepted for call-site compatibility; there is no widget to label. */
  label?: string;
  /** Accepted for call-site compatibility; there is no widget to mark. */
  required?: boolean;
  /** Stable id for the field container — used for aria-describedby wiring. */
  fieldId?: string;
  /** Id of an error element to reference via aria-describedby. */
  errorId?: string;
  /** Inline error message; rendered in a role="alert" element when provided. */
  error?: string;
};

/**
 * Invisible reCAPTCHA v3 field — the drop-in replacement for `HCaptchaField`.
 *
 * **The behavioral difference that matters:** hCaptcha handed the user a
 * puzzle and the form waited for them to solve it. v3 has nothing to solve,
 * so this component *mints* tokens on its own — on mount, then on a ~90s
 * refresh cycle and whenever the tab becomes visible again (see
 * `useRecaptchaAutoRefresh` for why all three are required).
 *
 * That auto-minting is not a convenience. No call site in this repo ever
 * calls the imperative `execute()`; every one of the ~17 forms holds the
 * token from `onVerify` in state and gates its submit button on it. A field
 * that only minted on demand would leave every one of those buttons disabled
 * forever, and would break platform signup and invite-claim outright.
 *
 * Renders no widget — only Google's required disclosure, since the v3 badge
 * is hidden. `label` and `required` are accepted so the ~17 call sites need
 * nothing beyond an import rename, but there is no control left to label.
 */
export const RecaptchaField = forwardRef<RecaptchaHandle, RecaptchaFieldProps>(
  ({ action, onVerify, onError, fieldId, errorId, error }, ref) => {
    // Held in refs so `handleToken` stays referentially stable: it feeds the
    // auto-refresh effect, which would otherwise restart on every render of
    // a parent that passes inline callbacks (all of them do).
    const onVerifyRef = useRef(onVerify);
    const onErrorRef = useRef(onError);
    useEffect(() => {
      onVerifyRef.current = onVerify;
      onErrorRef.current = onError;
    }, [onVerify, onError]);

    const handleToken = useCallback((token: string | null) => {
      if (token) {
        onVerifyRef.current(token);
      } else {
        // Surface the failure so the consumer clears its staged token rather
        // than submitting one the server will reject.
        onErrorRef.current?.();
      }
    }, []);

    const { mint } = useRecaptchaAutoRefresh(action, handleToken);

    useImperativeHandle(ref, () => ({ execute: mint, reset: mint }), [mint]);

    const resolvedErrorId = error
      ? (errorId ?? (fieldId ? `${fieldId}-error` : undefined))
      : undefined;

    return (
      <div
        className="space-y-2"
        id={fieldId}
        role="group"
        aria-describedby={resolvedErrorId}
      >
        <RecaptchaDisclosure />
        {error && resolvedErrorId && (
          <p id={resolvedErrorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

RecaptchaField.displayName = "RecaptchaField";
