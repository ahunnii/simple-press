import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { env } from "~/env";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { db } from "~/server/db";

import { ClaimClient } from "./_components/claim-client";

type Props = {
  params: Promise<{ code: string }>;
};

/** Build a tenant storefront URL (dev localhost vs. production platform domain). */
function buildSubdomainUrl(subdomain: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return isDev
    ? `http://${subdomain}.localhost:3000`
    : `https://${subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
}

/** Shared page frame so every claim state shares the signup wizard's chrome. */
function ClaimFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Claim Your Site</h1>
        </div>
      </header>
      <main className="container mx-auto flex flex-1 items-center px-4 py-8">
        {children}
      </main>
    </div>
  );
}

export default async function ClaimPage({ params }: Props) {
  const { code } = await params;

  const invite = await db.platformInvite.findUnique({
    where: { code },
    include: { business: true },
  });

  // Invalid / unknown link, or an invite whose business was removed.
  if (!invite || !invite.business) {
    return (
      <ClaimFrame>
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader>
            <CardTitle>Invalid or expired link</CardTitle>
            <CardDescription>
              This claim link isn&apos;t valid. It may have been mistyped, or the
              site it pointed to is no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If you believe this is a mistake, contact Artisanal Futures
                support to have your claim link re-sent.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </ClaimFrame>
    );
  }

  const business = invite.business;
  const signInUrl = `${buildSubdomainUrl(business.subdomain)}/sign-in`;

  // Already claimed — point the owner at their storefront sign-in.
  if (invite.used) {
    return (
      <ClaimFrame>
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader>
            <CardTitle>Already claimed</CardTitle>
            <CardDescription>
              {business.name} has already been claimed. If that was you, just
              sign in to manage your site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                This site is live and its ownership is set.
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link href={signInUrl}>Sign in to your site</Link>
            </Button>
          </CardContent>
        </Card>
      </ClaimFrame>
    );
  }

  // Unused but expired.
  if (invite.expiresAt.getTime() < Date.now()) {
    return (
      <ClaimFrame>
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader>
            <CardTitle>Link expired</CardTitle>
            <CardDescription>
              This claim link has expired before it was used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Contact Artisanal Futures support and they can issue a fresh
                claim link for {business.name}.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </ClaimFrame>
    );
  }

  // Valid, unused, unexpired. Decide (server-side, boolean only) whether a User
  // with the invited email already exists so the client shows sign-in vs. sign-up.
  const existingUser = await db.user.findFirst({
    where: { email: { equals: invite.email, mode: "insensitive" } },
    select: { id: true },
  });

  return (
    <ClaimFrame>
      <Card className="mx-auto w-full max-w-lg">
        <ClaimClient
          code={invite.code}
          email={invite.email}
          businessName={business.name}
          subdomain={business.subdomain}
          platformDomain={env.NEXT_PUBLIC_PLATFORM_DOMAIN}
          userExists={Boolean(existingUser)}
        />
      </Card>
    </ClaimFrame>
  );
}

export const metadata = {
  title: "Claim Your Site",
};
