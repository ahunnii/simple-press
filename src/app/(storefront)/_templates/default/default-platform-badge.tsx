"use client";

import Link from "next/link";
import { Info } from "lucide-react";

type Props = {
  businessName: string;
  view: "sign-in" | "sign-up";
};

/**
 * PlatformBadge
 *
 * The single most important UX element for the auth pages.
 * Communicates clearly that:
 *   - This is a SimplePress platform account, not a per-store account
 *   - One account works everywhere
 *   - If the user already has an account at another store, they don't
 *     need to create a new one — they should just sign in
 *
 * This prevents the "I got hacked / someone made an account with my email"
 * confusion when better-auth surfaces an existing-email error on sign-up.
 */
export function DefaultPlatformBadge({ businessName, view }: Props) {
  if (view === "sign-up") {
    return (
      <div className="bg-muted/60 border-muted-foreground/20 flex gap-3 rounded-lg border p-3">
        <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-muted-foreground space-y-1 text-sm">
          <p>
            You&apos;re creating a{" "}
            <span className="text-foreground font-medium">
              SimplePress account
            </span>{" "}
            to shop at {businessName}. This account works across all SimplePress
            stores — one login, everywhere.
          </p>
          <p>
            Already have a SimplePress account?{" "}
            <Link
              href="/auth/sign-in"
              className="text-primary font-medium hover:underline"
            >
              Sign in instead
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/60 border-muted-foreground/20 flex gap-3 rounded-lg border p-3">
      <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-muted-foreground text-sm">
        Signing in with your{" "}
        <span className="text-foreground font-medium">SimplePress account</span>
        . Your account works at {businessName} and all other SimplePress stores.
      </p>
    </div>
  );
}
