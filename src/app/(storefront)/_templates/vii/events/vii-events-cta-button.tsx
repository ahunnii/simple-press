"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav";

import { VII_BUTTON_STYLE } from "../shared/vii-button-style";

/**
 * The events closing band's button. Client-side only so it can read the
 * storefront flags (the events route's `business` payload carries no
 * `featureFlags`): per baseline B2.5, a field-driven CTA whose href points
 * at a flag-disabled feature (e.g. an owner-set `/shop` with products off)
 * is hidden — never swapped for another destination. A blank href or blank
 * label hides it too.
 */
export function ViiEventsCtaButton({
  href,
  text,
}: {
  href: string;
  text: string;
}) {
  const { isEnabled } = useStorefrontFlags();
  if (!href.trim() || !text.trim()) return null;
  const flag = navHrefOffFlag(href, isEnabled);
  if (flag !== null && !isEnabled(flag)) return null;

  return (
    <Link
      href={href}
      className="vii-cta-btn"
      // Paper focus ring: the scope's copper outline is too faint on navy.
      style={{ ...VII_BUTTON_STYLE, outlineColor: "var(--vii-paper)" }}
    >
      <span {...fieldAttr("default.events.cta-button-text")}>{text}</span>
      <ArrowRight aria-hidden="true" style={{ width: 14, height: 14 }} />
    </Link>
  );
}
