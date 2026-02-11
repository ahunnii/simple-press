import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldX, Store } from "lucide-react";

import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

export const metadata = {
  title: "Not permitted",
  description: "You don't have permission to access this page.",
};

export default async function NotPermittedPage() {
  const business = await api.business.get();
  if (!business) {
    notFound();
  }
  return (
    <div className="bg-background relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      {/* Subtle grid texture */}
      <div
        className="not-found-pattern pointer-events-none absolute inset-0"
        aria-hidden
      />
      <main className="relative z-10 flex max-w-lg flex-col items-center text-center">
        {business?.siteContent?.logoUrl && (
          <Link
            href="/"
            className="text-foreground focus:ring-primary mb-8 block rounded-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            <Image
              src={business.siteContent.logoUrl}
              alt={business.name}
              width={120}
              height={48}
              className="h-12 w-auto object-contain"
              unoptimized
            />
          </Link>
        )}
        <div className="bg-destructive/10 mb-4 flex items-center justify-center rounded-full p-4">
          <ShieldX className="text-destructive size-8" aria-hidden />
        </div>
        <p className="text-destructive mb-3 text-xs font-semibold tracking-widest uppercase">
          Error 403
        </p>
        <h1 className="text-foreground mb-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Access Denied
        </h1>
        <p className="text-muted-foreground mb-10 max-w-md text-base leading-relaxed sm:text-lg">
          You do not have permission to view this page.
        </p>
        <Button size="lg" className="gap-2" asChild>
          <Link href="/">
            <Store className="size-4 shrink-0" aria-hidden />
            Back to {business.name}
          </Link>
        </Button>
        <p className="text-muted-foreground/80 mt-12 text-sm">
          Think you should have access?{" "}
          <a
            href="mailto:support@simplepress.com"
            className="text-primary underline-offset-2 hover:underline"
          >
            Contact Support
          </a>
        </p>
      </main>
    </div>
  );
}
