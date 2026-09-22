import Link from "next/link";

import { Button } from "~/components/ui/button";

type Props = {
  variant: "maintenance" | "coming_soon";
};

/**
 * Shown on `/checkout` when an owner is previewing the live storefront while
 * business maintenance is still on. Payment APIs stay 503; this is the page
 * they would otherwise submit into a failing Stripe session.
 */
export function MaintenanceCheckoutNotice({ variant }: Props) {
  const label = variant === "coming_soon" ? "coming soon" : "maintenance";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Checkout is off
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          Visitors can&apos;t place orders while {label} mode is on. Turn it off
          in Settings → Maintenance Mode when you&apos;re ready to take orders.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/admin/settings/availability">
              Open Maintenance Mode
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/cart">Back to cart</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
