"use client";

import { useMemo } from "react";
import { createQrCodeSvgData } from "@better-auth-ui/core";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";

const HANDLE_ICONS: Record<ResolvedDonationHandle["key"], typeof VenmoIcon> = {
  venmo: VenmoIcon,
  cashapp: CashAppIcon,
};

function HandleCard({ handle }: { handle: ResolvedDonationHandle }) {
  const Icon = HANDLE_ICONS[handle.key];
  // Memoized the same way `OpenEmailButton` memoizes its QR code — the SVG
  // path is deterministic for a given URL, so there's no reason to
  // regenerate it on every render.
  const qrCode = useMemo(() => createQrCodeSvgData(handle.url), [handle.url]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-(--radius) border border-[#e8e8e8] p-6 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-[#e8e8e8] text-[#0a0a0a]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-medium text-[#0a0a0a]">{handle.label}</p>
        <p className="mt-0.5 text-sm text-[#6b6b6b]">{handle.displayHandle}</p>
      </div>

      <svg
        viewBox={`0 0 ${qrCode.size} ${qrCode.size}`}
        aria-hidden="true"
        focusable="false"
        className="size-32"
      >
        <path fill="white" d={`M0 0h${qrCode.size}v${qrCode.size}H0z`} />
        <path fill="black" d={qrCode.path} shapeRendering="crispEdges" />
      </svg>

      <a
        href={handle.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center justify-center rounded-(--radius) border border-[#0a0a0a] px-6 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
      >
        Open {handle.label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}

/**
 * Venmo/Cash App cards — one per handle the owner has configured, each with
 * a deep link and a scannable QR code. Rendered by `DefaultDonatePage` only
 * when `resolveDonationHandles(business)` is non-empty.
 */
export function DefaultDonateOtherWays({
  handles,
}: {
  handles: ResolvedDonationHandle[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} />
      ))}
    </div>
  );
}
