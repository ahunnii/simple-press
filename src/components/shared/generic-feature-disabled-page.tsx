"use client";

import Link from "next/link";
import { Info, Settings } from "lucide-react";

import { Button } from "~/components/ui/button";

export function GenericFeatureDisabledPage({
  featureName,
}: {
  featureName: string;
}) {
  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      <div
        className="not-found-pattern pointer-events-none absolute inset-0"
        aria-hidden
      />

      <main className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <div className="mb-4 flex items-center justify-center rounded-full bg-blue-100 p-4">
          <Info className="size-8 text-blue-600" aria-hidden />
        </div>

        <>
          <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Feature disabled
          </p>
          <h1 className="text-foreground mb-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {featureName} is not enabled for this business
          </h1>
          <p className="text-muted-foreground mb-10 max-w-md text-base leading-relaxed sm:text-lg">
            You are seeing this page because the {featureName} feature is not
            enabled for this business. You can enable it in{" "}
            <Link
              href="/admin/settings/features"
              className="text-primary underline-offset-2 hover:underline"
            >
              settings
            </Link>
            . If you believe this is an error, please contact support.
          </p>
        </>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button size="lg" className="gap-2" asChild>
            <Link href="/admin/settings/features">
              <Settings className="size-4 shrink-0" aria-hidden />
              Enable {featureName}
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground/80 mt-12 text-sm">
          <Link
            href="/admin"
            className="text-primary underline-offset-2 hover:underline"
          >
            Admin dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
