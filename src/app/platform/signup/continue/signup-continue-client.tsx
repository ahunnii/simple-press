"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Mail } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

/**
 * Lands here after email verification (`callbackURL` from invited-owner
 * signup). Consumes the signed onboarding draft and creates the store.
 */
export function SignupContinueClient() {
  const [status, setStatus] = useState<
    "loading" | "missing" | "creating" | "error" | "done"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resume() {
      const { data: sessionData } = await authClient.getSession();
      if (cancelled) return;

      if (!sessionData?.user?.email) {
        setStatus("missing");
        setError("Please sign in with the account you just verified.");
        return;
      }
      if (!sessionData.user.emailVerified) {
        setStatus("missing");
        setError("Please verify your email, then return to this page.");
        return;
      }

      const peek = await fetch("/api/onboarding/draft");
      if (cancelled) return;
      if (peek.status === 401 || peek.status === 403) {
        setStatus("missing");
        setError("Please verify your email, then return to this page.");
        return;
      }

      const peekData = (await peek.json()) as { draft: unknown };
      if (!peekData.draft) {
        setStatus("missing");
        setError(
          "No pending store setup was found. If you already created your store, sign in on your subdomain. Otherwise restart signup with your invitation code.",
        );
        return;
      }

      setStatus("creating");

      // Re-fetch + consume happens inside onboarding via the draft endpoint
      // consumed server-side — we POST a resume signal with the verified email.
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeFromDraft: true }),
      });

      if (cancelled) return;

      const data = (await response.json()) as {
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setError(data.error ?? "Failed to create your store");
        return;
      }

      setStatus("done");
      window.location.href = data.redirectUrl ?? "/";
    }

    void resume().catch(() => {
      if (!cancelled) {
        setStatus("error");
        setError("Something went wrong. Please try again.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finishing your store setup</CardTitle>
        <CardDescription>
          {status === "loading" || status === "creating"
            ? "Hang tight — we are creating your store now."
            : "We could not finish automatically."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(status === "loading" ||
          status === "creating" ||
          status === "done") && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === "done"
              ? "Redirecting…"
              : status === "creating"
                ? "Creating your store…"
                : "Checking your verified session…"}
          </div>
        )}

        {(status === "missing" || status === "error") && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === "missing" && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground flex items-start gap-2 text-sm">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              Check your inbox for the verification link, then open it in this
              browser so we can finish creating your store.
            </p>
            <Button asChild variant="outline">
              <Link href="/platform/signup">Restart signup</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
