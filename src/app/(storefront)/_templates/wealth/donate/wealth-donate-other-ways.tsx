"use client";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";

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
      style={{ background: "var(--wealth-surface)" }}
    >
      <span
        className="grid h-12 w-12 place-items-center"
        style={{ background: "var(--wealth-paper)", color: "var(--wealth-primary)" }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="wealth-section-heading" style={{ fontSize: "16px" }}>
          {handle.label}
        </p>
        <p className="mt-0.5 text-[14px]" style={{ color: "var(--wealth-muted)" }}>
          {handle.displayHandle}
        </p>
      </div>

      <BrandedQrCode
        value={handle.url}
        logoUrl={logoUrl}
        className="size-44"
        style={{ border: "1px solid var(--wealth-surface-2)" }}
      />

      <WealthLedgeButton href={handle.url} variant="outline" external>
        Open {handle.label}
      </WealthLedgeButton>
    </div>
  );
}

/**
 * Wealth's styled Venmo/Cash App cards — one per handle the owner has
 * configured, each with a deep link and a scannable QR code. Rendered by
 * `WealthDonatePage` only when `resolveDonationHandles(business)` is
 * non-empty, mirroring `PinkDonateOtherWays`/`DefaultDonateOtherWays`.
 * Restyled square/wealth-toned: `--wealth-surface` tile, mono-caps outline
 * ledge button instead of pink's ghost button.
 */
export function WealthDonateOtherWays({
  handles,
  logoUrl,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-[var(--wealth-gutter)] sm:grid-cols-2">
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
