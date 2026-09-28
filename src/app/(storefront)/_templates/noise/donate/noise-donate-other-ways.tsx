"use client";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { cn } from "~/lib/utils";
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
    <div className="flex h-full flex-col items-center gap-4 border border-(--vn-rule) bg-(--vn-paper) p-6 text-center">
      <span className="grid h-11 w-11 place-items-center border border-(--vn-ink) text-(--vn-ink)">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-serif text-[22px] leading-none italic">
          {handle.label}
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.18em] text-(--vn-steel-mist) uppercase">
          {handle.displayHandle}
        </p>
      </div>

      <BrandedQrCode value={handle.url} logoUrl={logoUrl} className="size-44" />

      <a
        href={handle.url}
        target="_blank"
        rel="noopener noreferrer"
        className="vn-stamp text-[10px] transition-colors hover:bg-(--vn-ink) hover:text-(--vn-paper)"
      >
        Open {handle.label}
        <span aria-hidden="true">↗</span>
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}

/**
 * Venmo/Cash App cards in noise's hairline frame — one per handle the owner
 * has configured, each with a deep link and a scannable QR code. Same
 * behaviour as Default's `DefaultDonateOtherWays`: a single handle is one
 * centred card instead of half of a 2-up grid.
 */
export function NoiseDonateOtherWays({
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
