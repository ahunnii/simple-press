"use client";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

import { PinkHairlineGrid } from "../shared/pink-hairline-grid";

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
    <div
      className="flex flex-col items-center gap-4 p-8 text-center"
      style={{ background: "var(--pink-white)", border: "1px solid var(--pink-line)" }}
    >
      <span
        className="grid h-12 w-12 place-items-center"
        style={{ background: "var(--pink-panel)", color: "var(--pink-rose)" }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="pink-display" style={{ fontSize: "16px", fontWeight: 600 }}>
          {handle.label}
        </p>
        <p className="mt-0.5 text-[14px]" style={{ color: "var(--pink-subtle)" }}>
          {handle.displayHandle}
        </p>
      </div>

      <BrandedQrCode
        value={handle.url}
        logoUrl={logoUrl}
        className="size-44"
        style={{ border: "1px solid var(--pink-line)" }}
      />

      <a
        href={handle.url}
        target="_blank"
        rel="noopener noreferrer"
        className="pink-btn pink-btn-ghost pink-btn-sm"
      >
        Open {handle.label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}

/**
 * PinkArt's styled Venmo/Cash App cards — one per handle the owner has
 * configured, each with a deep link and a scannable QR code. Rendered by
 * `PinkDonatePage` only when `resolveDonationHandles(business)` is
 * non-empty, mirroring `DefaultDonateOtherWays`.
 */
export function PinkDonateOtherWays({
  handles,
  logoUrl,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
}) {
  return (
    <PinkHairlineGrid columnsClassName="grid-cols-1 sm:grid-cols-2">
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </PinkHairlineGrid>
  );
}
