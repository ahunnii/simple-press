"use client";

import { useMemo } from "react";
import { createQrCodeSvgData } from "@better-auth-ui/core";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";

import { PinkHairlineGrid } from "../shared/pink-hairline-grid";

const HANDLE_ICONS: Record<ResolvedDonationHandle["key"], typeof VenmoIcon> = {
  venmo: VenmoIcon,
  cashapp: CashAppIcon,
};

function HandleCard({ handle }: { handle: ResolvedDonationHandle }) {
  const Icon = HANDLE_ICONS[handle.key];
  // Memoized the same way `DefaultDonateOtherWays` memoizes its QR code — the
  // SVG path is deterministic for a given URL, so there's no reason to
  // regenerate it on every render.
  const qrCode = useMemo(() => createQrCodeSvgData(handle.url), [handle.url]);

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

      <svg
        viewBox={`0 0 ${qrCode.size} ${qrCode.size}`}
        aria-hidden="true"
        focusable="false"
        className="size-32"
        style={{ border: "1px solid var(--pink-line)" }}
      >
        <path fill="white" d={`M0 0h${qrCode.size}v${qrCode.size}H0z`} />
        <path fill="black" d={qrCode.path} shapeRendering="crispEdges" />
      </svg>

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
}: {
  handles: ResolvedDonationHandle[];
}) {
  return (
    <PinkHairlineGrid columnsClassName="grid-cols-1 sm:grid-cols-2">
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} />
      ))}
    </PinkHairlineGrid>
  );
}
