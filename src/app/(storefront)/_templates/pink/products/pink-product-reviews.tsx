"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

import { ProductReviews } from "~/components/product-reviews";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { PINK_SCOPE_CLASS } from "../layout/pink-scope";

type Props = {
  productId: string;
  productName: string;
};

/**
 * Product reviews (review 2026-07-29, F1) — design.md has no section spec
 * for this; reviews were simply missing from pink (and vii/happy-bamboo/
 * bamboo/noise) while default/elegant/modern had them. Mounted below the
 * story band, flag-gated on `reviews` exactly like those three siblings.
 * The heading below is the same kind of structural microcopy as default's
 * "What customers are saying" — not owner-editable content, so no template
 * field/section is needed here (matches the sibling implementations).
 *
 * `ProductReviews`/`WriteReviewDialog` are shared components built directly
 * from shadcn primitives (`Card`, `Button`, `Badge`, `Progress`, `Select`)
 * with no className props of their own. Those primitives read Tailwind's
 * semantic CSS variables (`--card`, `--primary`, `--border`, …), so this
 * wrapper remaps them onto pink's own tokens via an inline style — the same
 * technique `pink-account-layout.tsx` uses through the global `.pink-account`
 * class, reproduced here inline since this file can't add a class to
 * globals.css. The shadcn `<Select>` (reviews sort control) portals its
 * dropdown to `document.body`, outside this wrapper's DOM subtree; the
 * `sortSelectContentClassName` prop (added to `ProductReviews`) carries
 * `PINK_SCOPE_CLASS` + `rounded-none` to scope the dropdown's styling back
 * into pink's palette and remove its border radius.
 */
const PINK_SHADCN_VARS: CSSProperties = {
  ["--background" as string]: "var(--pink-paper)",
  ["--foreground" as string]: "var(--pink-ink)",
  ["--card" as string]: "var(--pink-white)",
  ["--card-foreground" as string]: "var(--pink-ink)",
  ["--popover" as string]: "var(--pink-white)",
  ["--popover-foreground" as string]: "var(--pink-ink)",
  ["--primary" as string]: "var(--pink-rose)",
  ["--primary-foreground" as string]: "var(--pink-on-accent)",
  ["--secondary" as string]: "var(--pink-panel)",
  ["--secondary-foreground" as string]: "var(--pink-ink)",
  ["--muted" as string]: "var(--pink-panel)",
  ["--muted-foreground" as string]: "var(--pink-muted)",
  ["--accent" as string]: "var(--pink-panel)",
  ["--accent-foreground" as string]: "var(--pink-ink)",
  ["--destructive" as string]: "var(--pink-error)",
  ["--border" as string]: "var(--pink-line)",
  ["--input" as string]: "var(--pink-line-strong)",
  ["--ring" as string]: "var(--pink-rose)",
  ["--radius" as string]: "0px",
};

export function PinkProductReviewsSection({ productId, productName }: Props) {
  const { isEnabled } = useStorefrontFlags();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  if (!isEnabled("reviews")) return null;

  return (
    <section
      aria-label="Reviews"
      className="border-t px-5 py-16 md:px-10"
      style={{ borderColor: "var(--pink-line)", ...PINK_SHADCN_VARS }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8">
          <h2
            className="pink-display mt-2"
            style={{ fontSize: "clamp(1.5rem, 2.6vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em" }}
          >
            What people are saying
          </h2>
        </div>

        <ProductReviews
          productId={productId}
          sortSelectContentClassName={`${PINK_SCOPE_CLASS} rounded-none`}
          onWriteReviewClick={() => setReviewDialogOpen(true)}
        />
        <WriteReviewDialog
          productId={productId}
          productName={productName}
          isOpen={reviewDialogOpen}
          onClose={() => setReviewDialogOpen(false)}
          onSuccess={() => setReviewDialogOpen(false)}
        />
      </div>
    </section>
  );
}
