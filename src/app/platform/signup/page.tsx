import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { api } from "~/trpc/server";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { WizardClient } from "./_components/wizard-client";

type Props = {
  searchParams: Promise<{ code?: string; aftoken?: string }>;
};

export default async function PlatformSignupPage({ searchParams }: Props) {
  const business = await api.business.simplifiedGet();

  if (business) {
    notFound();
  }

  const { code, aftoken } = await searchParams;
  const aftokenTrimmed = aftoken?.trim() ?? "";

  // If `aftoken` is present and verifies, use artisan flow (`?code=` is ignored for gating).
  let artisanPrefill: { email: string; businessName: string } | undefined;
  if (aftokenTrimmed) {
    const result = await api.external.verifyArtisanToken(aftokenTrimmed);
    if (!result.success) {
      return (
        <div className="flex min-h-screen flex-col bg-gray-50">
          <header className="border-b bg-white">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-xl font-bold">Create Your Store</h1>
            </div>
          </header>
          <main className="container mx-auto flex flex-1 items-center px-4 py-8">
            <Card className="mx-auto w-full max-w-lg">
              <CardHeader>
                <CardTitle>Invalid artisan link</CardTitle>
                <CardDescription>
                  This signup link could not be verified. It may have expired or
                  already been used.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.message ?? "Invalid artisan token"}
                  </AlertDescription>
                </Alert>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/platform/signup">Try regular signup</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }
    artisanPrefill = {
      email: result.email,
      businessName: result.businessName,
    };
  }

  return (
    <WizardClient
      initialCode={code}
      artisanPrefill={artisanPrefill}
      aftoken={artisanPrefill ? aftokenTrimmed : undefined}
    />
  );
}

export const metadata = {
  title: "Create Your Store",
};
