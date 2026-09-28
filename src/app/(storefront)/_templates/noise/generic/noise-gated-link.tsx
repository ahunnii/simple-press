"use client";

import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefFlag } from "~/app/(storefront)/_components/nav";

type Props = {
  href: string;
  label: string;
  /** Full field key whose value is exactly `label` (live text in the editor). */
  labelFieldKey?: string;
  /**
   * `on-dark`: the bone-filled button from the testimonials closing band.
   * `solid`: the ink `vn-stamp` used on light surfaces.
   */
  tone?: "on-dark" | "solid";
  className?: string;
};

/**
 * NoiseGatedLink — a field-driven button that respects feature flags
 * (baseline B2.5).
 *
 * Client-side so it can read the storefront flags (the optional-page routes'
 * `business` payload carries none). When the href points at a flag-disabled
 * feature — `/shop` with products off, `/donate` with donations off — the
 * button is hidden, never swapped for another destination. A blank href or
 * label hides it too. Absolute URLs open in a new tab.
 */
export function NoiseGatedLink({
  href,
  label,
  labelFieldKey,
  tone = "on-dark",
  className,
}: Props) {
  const { isEnabled } = useStorefrontFlags();

  const target = href.trim();
  if (!target || !label.trim()) return null;
  const flag = navHrefFlag(target);
  if (flag !== null && !isEnabled(flag)) return null;

  const external = /^https?:\/\//i.test(target);
  const classes = cn(
    tone === "on-dark"
      ? "vn-focus-on-dark inline-flex items-center gap-3 border border-(--vn-bone) bg-(--vn-bone) px-8 py-3.5 font-mono text-[11px] tracking-[0.24em] text-(--vn-ink) uppercase transition-opacity hover:opacity-80"
      : "vn-stamp vn-stamp-solid text-[10.5px] transition-opacity hover:opacity-80",
    className,
  );
  const content = (
    <>
      <span {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}>{label}</span>
      <span aria-hidden="true">{external ? "↗" : "→"}</span>
      {external ? <span className="sr-only"> (opens in new tab)</span> : null}
    </>
  );

  if (external) {
    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={target} className={classes}>
      {content}
    </Link>
  );
}
