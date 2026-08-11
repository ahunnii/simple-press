"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { OwnerTermsAcceptance } from "~/components/legal/owner-terms-acceptance";

type Props = {
  businessName: string;
  /**
   * Also cover the platform Terms of Service + Privacy Policy — true when the
   * account has no `User.termsAcceptedAt` on record. Same rule the claim flow
   * uses; true for most pre-existing owners, since nothing was backfilled.
   */
  includePlatformTerms: boolean;
  platformDomain: string;
};

/**
 * Retroactive terms-acceptance interstitial for `/admin`.
 *
 * Rendered in place of the entire admin chrome by `src/app/admin/layout.tsx`
 * (same shape as `MaintenanceScreen`) when a store OWNER has no recorded
 * acceptance of the Seller & Merchant Agreement. It is a SOFT block, and that
 * word carries three requirements this component has to keep honoring:
 *
 * 1. Every policy is readable — `OwnerTermsAcceptance` links each one with
 *    `target="_blank"`, so reading a document never loses this page.
 * 2. Signing out stays reachable. An owner who won't agree must still be able
 *    to leave; a screen with no exit is a trap, not a consent form.
 * 3. Accepting is one click, and lands them exactly where they were headed —
 *    the reload below keeps the current URL.
 */
export function OwnerTermsGateScreen({
  businessName,
  includePlatformTerms,
  platformDomain,
}: Props) {
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const acceptMutation = api.legal.acceptOwnerTerms.useMutation({
    onSuccess: () => {
      // A full reload rather than `router.refresh()`: the decision lives in a
      // layout server component, and a hard navigation is the one thing
      // guaranteed to re-run it with no client router cache in the way. The
      // URL is preserved, so they land on the admin page they asked for. This
      // happens exactly once per owner, so the cost is irrelevant next to the
      // risk of a stale render leaving them stuck on this screen.
      window.location.reload();
    },
    onError: (mutationError) => {
      setError(
        mutationError.message ??
          "We couldn't record your acceptance. Please try again.",
      );
    },
  });

  const busy = acceptMutation.isPending || signingOut;
  // Left true on success too — we're reloading, so the button must not
  // re-enable and invite a second submit in the meantime.
  const submitting = acceptMutation.isPending || acceptMutation.isSuccess;

  const handleAccept = () => {
    setError(null);
    if (!accepted) {
      setTermsError("Please tick the box to continue.");
      return;
    }
    setTermsError(null);
    acceptMutation.mutate({
      acceptedTerms: true,
      // Only ever sent when the checkbox actually named those documents. The
      // server ignores it for accounts that already have an acceptance on file.
      acceptedPlatformTerms: includePlatformTerms,
    });
  };

  const handleSignOut = async () => {
    setError(null);
    setSigningOut(true);
    try {
      await authClient.signOut();
      window.location.href = "/auth/sign-in";
    } catch {
      setError("Couldn't sign you out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <div className="bg-muted flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>One thing before you continue</CardTitle>
          <CardDescription>
            Nothing is wrong with your store. We added written terms for store
            owners after {businessName} was set up, so we never recorded your
            agreement to them — please review and accept them now to keep using
            your dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <OwnerTermsAcceptance
            id="admin-owner-terms-acceptance"
            checked={accepted}
            onCheckedChange={(next) => {
              setAccepted(next);
              if (next) setTermsError(null);
            }}
            includePlatformTerms={includePlatformTerms}
            disabled={busy}
            error={termsError}
            platformDomain={platformDomain}
          />

          <p className="text-muted-foreground text-sm">
            Each document opens in a new tab, so you won&apos;t lose this page
            while you read.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {/*
            The exit. An owner who does not want to agree must still be able to
            leave — do not remove this, and do not hide it behind the checkbox.
          */}
          <Button
            variant="ghost"
            onClick={() => void handleSignOut()}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            {signingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sign out
          </Button>

          <Button
            onClick={handleAccept}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Agree and continue"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
