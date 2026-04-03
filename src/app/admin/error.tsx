"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Settings } from "lucide-react";

import { parseTrpcFromBoundaryMessage } from "~/lib/trpc/boundary-error";
import { Button } from "~/components/ui/button";
import { RefreshButton } from "~/app/_components/refresh-button";

type Props = {
  error: Error & { digest?: string };
  reset?: () => void;
};

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const trpc = parseTrpcFromBoundaryMessage(error.message);

  const isFeatureDisabled =
    trpc?.code === "FORBIDDEN" &&
    trpc?.message.includes("feature is not enabled");
  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      <div
        className="not-found-pattern pointer-events-none absolute inset-0"
        aria-hidden
      />

      <main className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <div className="bg-destructive/10 mb-4 flex items-center justify-center rounded-full p-4">
          <AlertCircle className="text-destructive size-8" aria-hidden />
        </div>

        {trpc ? (
          <>
            <p className="text-destructive mb-3 text-xs font-semibold tracking-widest uppercase">
              {trpc.code.replace(/_/g, " ")}
            </p>
            <h1 className="text-foreground mb-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Something went wrong
            </h1>
            <div className="border-border bg-muted/40 text-muted-foreground mb-10 w-full max-w-md rounded-lg border px-4 py-3 text-left text-sm">
              <p className="text-foreground font-mono text-xs font-semibold tracking-wide uppercase">
                Code
              </p>
              <p className="text-foreground mt-1 font-mono text-sm">
                {trpc.code}
              </p>
              <p className="text-foreground mt-4 font-mono text-xs font-semibold tracking-wide uppercase">
                Message
              </p>
              <p className="text-foreground mt-1 leading-relaxed">
                {trpc.message}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-destructive mb-3 text-xs font-semibold tracking-widest uppercase">
              Error
            </p>
            <h1 className="text-foreground mb-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-10 max-w-md text-base leading-relaxed sm:text-lg">
              {error.message}
            </p>
          </>
        )}

        {error.digest ? (
          <p className="text-muted-foreground/70 mb-10 font-mono text-xs">
            Digest: {error.digest}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {isFeatureDisabled ? (
            <Button size="lg" className="gap-2" asChild>
              <Link href="/admin/settings/features">
                <Settings className="size-4 shrink-0" aria-hidden />
                Enable collections
              </Link>
            </Button>
          ) : null}

          {reset ? (
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => reset()}
            >
              Try again
            </Button>
          ) : (
            <RefreshButton />
          )}
        </div>

        <p className="text-muted-foreground/80 mt-12 text-sm">
          <Link
            href="/admin/dashboard"
            className="text-primary underline-offset-2 hover:underline"
          >
            Admin dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
