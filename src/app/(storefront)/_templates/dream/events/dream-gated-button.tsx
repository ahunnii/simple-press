"use client";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefFlag } from "~/app/(storefront)/_components/nav";

import { DreamButton } from "../shared/dream-button";

type Props = {
  href: string;
  label: string;
  /** Full field key whose value is exactly `label` (live text in the editor). */
  labelFieldKey?: string;
  variant?: "primary" | "secondary";
};

/**
 * A field-driven call to action that respects feature flags (baseline B2.5).
 *
 * Client-side only so it can read the storefront flags (the optional-page
 * routes' `business` payload carries none). When the owner's href points at
 * a flag-disabled feature — say `/shop` with products off — the button is
 * hidden, never swapped for another destination. A blank href or label
 * hides it too. `DreamButton` opens absolute URLs in a new tab.
 */
export function DreamGatedButton({
  href,
  label,
  labelFieldKey,
  variant = "primary",
}: Props) {
  const { isEnabled } = useStorefrontFlags();

  const target = href.trim();
  if (!target || !label.trim()) return null;
  const flag = navHrefFlag(target);
  if (flag !== null && !isEnabled(flag)) return null;

  return (
    <DreamButton href={target} variant={variant}>
      <span {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}>{label}</span>
    </DreamButton>
  );
}
