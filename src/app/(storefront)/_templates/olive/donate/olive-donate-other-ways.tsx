"use client";

import { ArrowUpRight } from "lucide-react";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { cn } from "~/lib/utils";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

import { OliveButton } from "../shared";

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
    <div className="olive-card olive-card-paper flex h-full flex-col items-center gap-4 p-6 text-center">
      <span
        className="grid h-11 w-11 place-items-center rounded-full"
        style={{
          backgroundColor: "var(--olive-white)",
          border: "1px solid var(--olive-hairline)",
          color: "var(--olive-leaf)",
        }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="olive-h3" style={{ fontSize: "1.0625rem" }}>
          {handle.label}
        </p>
        <p className="olive-caption">{handle.displayHandle}</p>
      </div>

      <BrandedQrCode
        value={handle.url}
        logoUrl={logoUrl}
        className="size-40"
        style={{
          backgroundColor: "var(--olive-white)",
          border: "1px solid var(--olive-hairline)",
          borderRadius: "var(--olive-card-radius)",
        }}
      />

      <OliveButton
        variant="secondary"
        size="sm"
        href={handle.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open {handle.label}
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only"> (opens in new tab)</span>
      </OliveButton>
    </div>
  );
}

/**
 * Venmo/Cash App cards — one paper `olive-card` per handle the owner has
 * configured, each with a deep link and a scannable QR code. Same behaviour
 * as Default's `DefaultDonateOtherWays`; with a single handle the card sits
 * alone at a fixed width instead of half of a 2-up grid. `stacked` puts the
 * cards in one column (used when the page places them beside the form).
 */
export function OliveDonateOtherWays({
  handles,
  logoUrl,
  stacked = false,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
  stacked?: boolean;
}) {
  const single = handles.length === 1;

  return (
    <div
      className={cn(
        single || stacked
          ? "grid w-full max-w-[22rem] grid-cols-1 gap-4"
          : "grid grid-cols-1 gap-4 sm:grid-cols-2",
      )}
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
