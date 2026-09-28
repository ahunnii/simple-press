"use client";

import type { ResolvedDonationHandle } from "~/lib/donation-handles";
import { cn } from "~/lib/utils";
import { CashAppIcon } from "~/components/icons/cashapp-icon";
import { VenmoIcon } from "~/components/icons/venmo-icon";
import { BrandedQrCode } from "~/components/shared/branded-qr-code";

import { UmscButton } from "../shared/umsc-button";

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
    <div className="flex flex-col items-center gap-4 border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-6 text-center">
      <span className="grid size-11 place-items-center rounded-full border border-[var(--umsc-line)] text-[var(--umsc-ink)]">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="umsc-sans text-[15px] font-semibold text-[var(--umsc-ink)]">
          {handle.label}
        </p>
        <p className="umsc-sans mt-0.5 text-[15px] text-[var(--umsc-muted)]">
          {handle.displayHandle}
        </p>
      </div>

      <BrandedQrCode value={handle.url} logoUrl={logoUrl} className="size-44" />

      <UmscButton as="link" href={handle.url} external variant="ghost">
        {`Open ${handle.label}`}
      </UmscButton>
    </div>
  );
}

/**
 * UmscDonateOtherWays — Default's Venmo/Cash App cards in umsc's shelf face:
 * white hairline cards, the handle in the product-name face, a scannable QR
 * code and a ghost pill deep link (new tab). One per handle the owner has
 * configured; a single handle sits alone rather than as half of a 2-up.
 */
export function UmscDonateOtherWays({
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
          ? "w-full max-w-[22rem]"
          : "grid grid-cols-1 gap-6 sm:grid-cols-2",
      )}
    >
      {handles.map((handle) => (
        <HandleCard key={handle.key} handle={handle} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
