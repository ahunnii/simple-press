"use client";

import type { OliveButtonSize, OliveButtonVariant } from "../shared";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav";

import { OliveButton } from "../shared";

type Props = {
  href: string;
  label: string;
  /** Full field key whose value is exactly `label` (live text in the editor). */
  labelFieldKey?: string;
  variant?: OliveButtonVariant;
  size?: OliveButtonSize;
  className?: string;
};

/**
 * OliveGatedButton — a field-driven call-to-action that respects feature
 * flags (baseline B2.5).
 *
 * Client-side only so it can read the storefront flags (the optional-page
 * routes' `business` payload carries none). When the owner's href points at
 * a flag-disabled feature — say `/shop` with products off — the button is
 * hidden, never swapped for another destination. A blank href or a blank
 * label hides it too. Absolute URLs open in a new tab.
 */
export function OliveGatedButton({
  href,
  label,
  labelFieldKey,
  variant = "primary",
  size,
  className,
}: Props) {
  const { isEnabled } = useStorefrontFlags();

  const target = href.trim();
  if (!target || !label.trim()) return null;
  const flag = navHrefOffFlag(target, isEnabled);
  if (flag !== null && !isEnabled(flag)) return null;

  const external = /^https?:\/\//i.test(target);

  return (
    <OliveButton
      variant={variant}
      size={size}
      href={target}
      className={className}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <span {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}>{label}</span>
      {external ? <span className="sr-only"> (opens in new tab)</span> : null}
    </OliveButton>
  );
}
