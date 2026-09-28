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
    <div className="bg-card flex h-full flex-col items-center gap-4 rounded-2xl border border-[var(--bam-hairline)] p-6 text-center shadow-sm sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-full border border-[var(--bam-gold)]/40 bg-[var(--bam-gold)]/10 text-[var(--bam-forest)]">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-foreground font-semibold">{handle.label}</p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {handle.displayHandle}
        </p>
      </div>

      {/* QR tile stays white on purpose — scanners need the contrast. */}
      <div className="rounded-xl border border-[var(--bam-hairline)] bg-white p-1.5">
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
        className="focus-visible:ring-ring mt-auto inline-flex h-11 items-center justify-center rounded-full border border-[var(--bam-forest)] px-6 text-sm font-semibold text-[var(--bam-forest)] transition-colors hover:bg-[var(--bam-forest)] hover:text-[var(--bam-cream)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Open {handle.label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}

/**
 * Bamboo's Venmo/Cash App cards — one per handle the owner has configured,
 * each with a deep link and a scannable QR code. Rendered by
 * `BambooDonatePage` only when `resolveDonationHandles(business)` is
 * non-empty, mirroring `DefaultDonateOtherWays`. A single handle is one
 * width-capped card instead of half of a 2-up grid. `layout="stack"` is the
 * side rail beside the card form: one card per row at lg+ (the rail is
 * narrow), 2-up below lg where the rail drops under the form at full width.
 * `"grid"` is the main column when there is no card form.
 */
export function BambooDonateOtherWays({
  handles,
  logoUrl,
  layout,
}: {
  handles: ResolvedDonationHandle[];
  logoUrl?: string | null;
  layout: "stack" | "grid";
}) {
  const single = handles.length === 1;

  return (
    <div
      className={cn(
        single
          ? cn("w-full max-w-[22rem]", layout === "stack" && "lg:max-w-none")
          : cn(
              "grid grid-cols-1 gap-6 sm:grid-cols-2",
              layout === "stack" && "lg:grid-cols-1",
            ),
      )}
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
