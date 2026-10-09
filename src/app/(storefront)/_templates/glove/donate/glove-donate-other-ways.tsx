"use client";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { cn } from "~/lib/utils";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

import { GloveButton } from "../shared";

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
    <div className="flex h-full flex-col items-center gap-4 rounded-[12px] border border-[var(--glove-line)] bg-[var(--glove-paper)] p-6 text-center [box-shadow:var(--glove-shadow-sm)] sm:p-8">
      <span className="grid size-12 place-items-center rounded-full bg-[var(--glove-mist)] text-[var(--glove-primary)]">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="glove-display text-[17px] font-medium text-[var(--glove-ink)]">
          {handle.label}
        </p>
        <p className="glove-body mt-0.5 text-[14px] text-[var(--glove-muted)]">
          {handle.displayHandle}
        </p>
      </div>

      <div className="rounded-[8px] border border-[var(--glove-line)] bg-[var(--glove-paper)] p-1.5">
        <BrandedQrCode
          value={handle.url}
          logoUrl={logoUrl}
          className="size-44"
        />
      </div>

      <GloveButton
        href={handle.url}
        external
        variant="wooOutline"
        className="mt-auto"
      >
        Open {handle.label}
      </GloveButton>
    </div>
  );
}

/**
 * Glove's Venmo / Cash App cards, one per configured handle, each with a deep
 * link and a scannable QR. Rendered by `GloveDonatePage` only when
 * `resolveDonationHandles(business)` is non-empty. A single handle is a
 * centered card instead of half of a 2-up grid.
 */
export function GloveDonateOtherWays({
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
          ? "mx-auto w-full max-w-[22rem]"
          : "grid grid-cols-1 gap-6 sm:grid-cols-2",
      )}
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
