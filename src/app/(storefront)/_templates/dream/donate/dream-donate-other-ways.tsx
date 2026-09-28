"use client";

import { ArrowUpRight } from "lucide-react";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { cn } from "~/lib/utils";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

import { DreamButton } from "../shared/dream-button";

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
    <div className="dream-card flex h-full flex-col items-center gap-4 text-center">
      <span
        aria-hidden="true"
        className="grid h-11 w-11 place-items-center rounded-full border border-[var(--dream-line)] text-[var(--dream-ink)]"
        style={{
          background:
            "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-sky-deep) 100%)",
        }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-[26px] leading-[1.1]">{handle.label}</h3>
        <p className="text-[14px] text-[var(--dream-soft)]">
          {handle.displayHandle}
        </p>
      </div>

      <BrandedQrCode
        value={handle.url}
        logoUrl={logoUrl}
        className="size-40"
        style={{
          padding: "6px",
          backgroundColor: "var(--dream-white)",
          border: "1px solid var(--dream-line)",
          borderRadius: "var(--dream-radius-input)",
        }}
      />

      <DreamButton href={handle.url} variant="secondary" external>
        Open {handle.label}
        <ArrowUpRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="h-4 w-4"
        />
      </DreamButton>
    </div>
  );
}

/**
 * Venmo/Cash App cards — one paper `dream-card` per handle the owner has
 * configured, each with a deep link and a scannable QR code. Same behaviour
 * as Default's `DefaultDonateOtherWays`; with a single handle the card sits
 * alone at a fixed width instead of half of a 2-up grid. `stacked` puts the
 * cards in one column (used when the page places them beside the form).
 */
export function DreamDonateOtherWays({
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
          ? "grid w-full max-w-[22rem] grid-cols-1 gap-6"
          : "grid grid-cols-1 gap-6 sm:grid-cols-2",
      )}
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
