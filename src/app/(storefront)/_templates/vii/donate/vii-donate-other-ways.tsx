"use client";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

import { VII_BUTTON_OUTLINE_STYLE } from "../shared/vii-button-style";

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
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        height: "100%",
        padding: "clamp(24px, 3vw, 32px)",
        background: "var(--vii-paper)",
        border: "1px solid var(--vii-hairline)",
        borderRadius: "var(--radius)",
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "1px solid var(--vii-hairline-strong)",
          color: "var(--vii-navy)",
        }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 20,
            lineHeight: 1.2,
            color: "var(--vii-navy)",
          }}
        >
          {handle.label}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--vii-ink-soft)",
          }}
        >
          {handle.displayHandle}
        </p>
      </div>

      <div
        style={{
          padding: 6,
          background: "var(--vii-paper)",
          border: "1px solid var(--vii-hairline)",
          borderRadius: "var(--radius)",
        }}
      >
        <BrandedQrCode
          value={handle.url}
          logoUrl={logoUrl}
          className="size-40"
        />
      </div>

      <a
        href={handle.url}
        target="_blank"
        rel="noopener noreferrer"
        className="vii-cta-btn"
        style={{ ...VII_BUTTON_OUTLINE_STYLE, marginTop: "auto" }}
      >
        Open {handle.label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}

/**
 * vii's Venmo/Cash App cards — one per handle the owner has configured, each
 * with a deep link and a scannable QR code. Rendered by `ViiDonatePage` only
 * when `resolveDonationHandles(business)` is non-empty, mirroring
 * `DefaultDonateOtherWays`. Cards sit left-anchored on the page edge (one
 * or two columns) rather than centered; `stacked` keeps them in a single
 * column when they share the row with the card form.
 */
export function ViiDonateOtherWays({
  handles,
  logoUrl,
  stacked = false,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
  /** In the donate page's side column (next to the card form) at lg+: one column. */
  stacked?: boolean;
}) {
  return (
    <div
      className={
        handles.length === 1
          ? "grid max-w-[22rem] grid-cols-1"
          : stacked
            ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:max-w-[22rem] lg:grid-cols-1"
            : "grid max-w-[46rem] grid-cols-1 gap-6 sm:grid-cols-2"
      }
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
