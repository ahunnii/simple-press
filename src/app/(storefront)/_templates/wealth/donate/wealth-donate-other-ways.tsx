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
    <li className="wealth-donate-way wealth-on-surface">
      <span className="wealth-donate-way__icon" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="wealth-h3">{handle.label}</h3>
        <p className="wealth-donate-way__handle">{handle.displayHandle}</p>
      </div>

      <div className="wealth-donate-way__qr">
        <BrandedQrCode
          value={handle.url}
          logoUrl={logoUrl}
          className="size-40"
        />
      </div>

      <WealthLedgeButton href={handle.url} variant="outline" external>
        Open {handle.label}
      </WealthLedgeButton>
    </li>
  );
}

/**
 * Wealth's Venmo/Cash App cards (2026-10-12 redesign) — one square surface
 * card per handle the owner has configured, each with a deep link and a
 * scannable QR code. Rendered by `WealthDonatePage` only when
 * `resolveDonationHandles(business)` is non-empty and the `donate.other-ways`
 * section is visible, mirroring `PinkDonateOtherWays`/`DefaultDonateOtherWays`.
 * The cards share a wrapping row (`.wealth-donate-ways`): one handle is a
 * single centered card (`--single`), two sit side by side — no half-empty
 * 2-up grid.
 */
export function WealthDonateOtherWays({
  handles,
  logoUrl,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
}) {
  return (
    <ul
      className={
        handles.length === 1
          ? "wealth-donate-ways wealth-donate-ways--single"
          : "wealth-donate-ways"
      }
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </ul>
  );
}
