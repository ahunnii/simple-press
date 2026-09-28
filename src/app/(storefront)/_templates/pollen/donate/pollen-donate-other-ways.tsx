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
    <div className="flex h-full flex-col items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-6 text-center shadow-sm sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5f2ee] text-[#215935]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-base font-bold text-[#374151]">{handle.label}</p>
        <p className="mt-0.5 text-sm text-[#6b7280]">{handle.displayHandle}</p>
      </div>

      <div className="rounded-xl border border-[#e5e7eb] bg-white p-1.5">
        <BrandedQrCode
          value={handle.url}
          logoUrl={logoUrl}
          className="size-44"
        />
      </div>

      <a
        href={handle.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex h-11 items-center justify-center rounded-full border border-[#215935] px-6 text-sm font-semibold text-[#215935] transition-colors hover:bg-[#215935] hover:text-white focus-visible:ring-2 focus-visible:ring-[#215935] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Open {handle.label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}

/**
 * Pollen's styled Venmo/Cash App cards — one per handle the owner has
 * configured, each with a deep link and a scannable QR code. Rendered by
 * `PollenDonatePage` only when `resolveDonationHandles(business)` is
 * non-empty, mirroring `DefaultDonateOtherWays`. With a single handle, the
 * card is centered and width-constrained instead of half of a 2-up grid.
 */
export function PollenDonateOtherWays({
  handles,
  logoUrl,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
}) {
  const single = handles.length === 1;

  return (
    // One handle → a single centered card instead of a half-empty 2-up.
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
