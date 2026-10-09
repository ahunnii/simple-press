"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { Button } from "~/components/ui/button";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav";

/**
 * The events closing band's cream pill. Client-side only so it can read the
 * storefront flags (the events route's `business` payload carries no
 * `featureFlags`): per baseline B2.5, a field-driven CTA whose href points at
 * a flag-disabled feature (e.g. an owner-set `/shop` with products off) is
 * hidden — never swapped for another destination. The default `/contact`
 * is ungated.
 */
export function BambooEventsCtaButton({
  href,
  text,
}: {
  href: string;
  text: string;
}) {
  const { isEnabled } = useStorefrontFlags();
  const flag = navHrefOffFlag(href, isEnabled);
  if (flag !== null && !isEnabled(flag)) return null;

  return (
    <Button
      size="lg"
      asChild
      className="group rounded-full bg-[var(--bam-cream)] text-[var(--bam-forest)] hover:bg-[var(--bam-cream-deep)]"
    >
      <Link href={href}>
        <span {...fieldAttr("default.events.cta-button-text")}>{text}</span>
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </Link>
    </Button>
  );
}
