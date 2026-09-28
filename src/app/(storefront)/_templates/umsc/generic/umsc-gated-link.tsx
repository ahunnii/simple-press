"use client";

import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefFlag } from "~/app/(storefront)/_components/nav";

import { UmscButton } from "../shared/umsc-button";

type Props = {
  href: string;
  label: string;
  /** Full field key whose value is exactly `label` (live text in the editor). */
  labelFieldKey?: string;
  variant?: "gold" | "ghost" | "link";
  className?: string;
};

/**
 * UmscGatedLink — a field-driven umsc button that respects feature flags
 * (baseline B2.5, P-NAV-FLAGS).
 *
 * Client-side so it can read the storefront flags (the optional-page
 * routes' `business` payload carries none). When the href points at a
 * flag-disabled feature — `/shop` with products off, `/events` with events
 * off — the button is hidden, never swapped for another destination. A
 * blank href or label hides it too. Absolute URLs open in a new tab.
 */
export function UmscGatedLink({
  href,
  label,
  labelFieldKey,
  variant = "gold",
  className,
}: Props) {
  const { isEnabled } = useStorefrontFlags();

  const target = href.trim();
  if (!target || !label.trim()) return null;
  const flag = navHrefFlag(target);
  if (flag !== null && !isEnabled(flag)) return null;

  return (
    <UmscButton
      as="link"
      href={target}
      external={/^https?:\/\//i.test(target)}
      variant={variant}
      fieldKey={labelFieldKey}
      className={className}
    >
      {label}
    </UmscButton>
  );
}
