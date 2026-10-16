"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

type Mode = "confirm" | "unsubscribed" | "invalid" | "expired" | "unavailable";

type Props = {
  mode: Mode;
  businessName: string;
  /** Signed token for the action button (confirm / resubscribe). */
  token?: string;
  /** Address being confirmed (confirm mode only). */
  email?: string;
};

const CARD =
  "rounded-[var(--radius,0.5rem)] border border-current/15 p-8 text-center";
const HEADING = "mb-3 text-2xl font-medium tracking-tight";
const BODY = "mx-auto max-w-sm text-sm leading-relaxed opacity-75";
const BUTTON =
  "mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius,0.5rem)] border border-current px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

type ActionResult = { ok: true } | { ok: false; reason: string };

/**
 * Plain, unthemed card — the page sits inside the store's own layout, so it
 * inherits text color and radius from the template rather than shipping a
 * look of its own.
 */
export function EmailPreferencesCard({
  mode,
  businessName,
  token,
  email,
}: Props) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = (result: ActionResult) => {
    if (result.ok) {
      setDone(true);
      setError(null);
    } else {
      setError(
        result.reason === "expired"
          ? "That link has expired. Please sign up again to get a new one."
          : result.reason === "suppressed"
            ? `We can't resubscribe this address from a link. Sign up again on the ${businessName} website.`
            : "That link isn't valid anymore. Please use the latest email we sent you.",
      );
    }
  };
  const onError = (err: { message?: string }) =>
    setError(err.message ?? "Something went wrong. Please try again.");

  const confirm = api.newsletter.confirm.useMutation({ onSuccess, onError });
  const resubscribe = api.newsletter.resubscribe.useMutation({
    onSuccess,
    onError,
  });
  const pending = confirm.isPending || resubscribe.isPending;

  if (mode === "invalid" || mode === "expired" || mode === "unavailable") {
    return (
      <section className={CARD}>
        <h1 className={HEADING}>
          {mode === "expired"
            ? "This link has expired"
            : mode === "unavailable"
              ? "Email sign-up isn't available"
              : "This link isn't valid"}
        </h1>
        <p className={BODY}>
          {mode === "expired"
            ? `Confirmation links only last 7 days. Sign up again on the ${businessName} website to get a fresh one.`
            : mode === "unavailable"
              ? `${businessName} isn't accepting email sign-ups right now.`
              : "Please use the link from the latest email we sent you."}
        </p>
      </section>
    );
  }

  if (mode === "confirm") {
    if (done) {
      return (
        <section className={CARD} role="status">
          <h1 className={HEADING}>You&apos;re subscribed</h1>
          <p className={BODY}>
            Thanks! You&apos;ll now get news and offers from {businessName}. You
            can unsubscribe from any email we send.
          </p>
        </section>
      );
    }
    return (
      <section className={CARD}>
        <h1 className={HEADING}>Confirm your subscription to {businessName}</h1>
        <p className={BODY}>
          {email ? (
            <>
              Press the button to get news and offers from {businessName} at{" "}
              <span className="font-medium">{email}</span>.
            </>
          ) : (
            <>Press the button to get news and offers from {businessName}.</>
          )}
        </p>
        <button
          type="button"
          className={BUTTON}
          disabled={pending || !token}
          onClick={() => {
            if (token) confirm.mutate({ token });
          }}
        >
          {pending ? "Confirming..." : "Confirm subscription"}
        </button>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>
    );
  }

  // mode === "unsubscribed"
  if (done) {
    return (
      <section className={CARD} role="status">
        <h1 className={HEADING}>Welcome back</h1>
        <p className={BODY}>
          You&apos;re subscribed to {businessName} emails again.
        </p>
      </section>
    );
  }
  return (
    <section className={CARD}>
      <h1 className={HEADING}>
        You&apos;re unsubscribed from {businessName} emails
      </h1>
      <p className={BODY}>
        You won&apos;t receive any more marketing emails from {businessName}.
        Order and account emails aren&apos;t affected.
      </p>
      {token && (
        <>
          <p className={`${BODY} mt-6`}>Changed your mind?</p>
          <button
            type="button"
            className={BUTTON}
            disabled={pending}
            onClick={() => resubscribe.mutate({ token })}
          >
            {pending ? "Resubscribing..." : "Resubscribe"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
