"use client";

import { useEffect } from "react";
import NextError from "next/error";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Server-render errors already reached Sentry through `onRequestError`
    // (src/instrumentation.ts) — Next marks those with a `digest`. Capturing
    // them here would double-count every one. Only client-side render and
    // hydration crashes, which carry no digest, are new signal.
    if (error.digest) return;
    Sentry.captureException(error, {
      tags: { component: "global-error-boundary" },
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
