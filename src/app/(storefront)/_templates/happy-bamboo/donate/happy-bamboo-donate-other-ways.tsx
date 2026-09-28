"use client";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

const HANDLE_ICONS: Record<ResolvedDonationHandle["key"], typeof VenmoIcon> = {
  venmo: VenmoIcon,
  cashapp: CashAppIcon,
};

function HandleCard({
  handle,
  logoUrl,
}: {
  handle: ResolvedDonationHandle;
  logoUrl?: string | null;
}) {
  const Icon = HANDLE_ICONS[handle.key];

  return (
    <div className="border-border bg-card flex h-full flex-col items-center gap-4 rounded-2xl border p-6 text-center shadow-sm sm:p-8">
      <span className="bg-primary/10 text-primary grid h-12 w-12 place-items-center rounded-full">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold">{handle.label}</p>
        <p className="text-muted-foreground mt-0.5 text-sm break-all">
          {handle.displayHandle}
        </p>
      </div>

      <div className="border-border rounded-lg border bg-white p-1.5">
        <BrandedQrCode
          value={handle.url}
          logoUrl={logoUrl}
          className="size-44"
        />
      </div>

      <Button asChild variant="outline" className="mt-auto min-h-11">
        <a href={handle.url} target="_blank" rel="noopener noreferrer">
          Open {handle.label}
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      </Button>
    </div>
  );
}

/**
 * Happy-bamboo's Venmo/Cash App cards — one per handle the owner has
 * configured, each with a deep link and a scannable QR code. Rendered by
 * `HappyBambooDonatePage` only when `resolveDonationHandles(business)` is
 * non-empty, mirroring `DefaultDonateOtherWays`. Left-aligned on the page's
 * container edge; a single handle stays one card wide instead of half of a
 * 2-up grid.
 */
export function HappyBambooDonateOtherWays({
  handles,
  logoUrl,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
}) {
  const single = handles.length === 1;

  return (
    <div
      className={cn(
        single
          ? "w-full max-w-[22rem]"
          : "grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2",
      )}
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
