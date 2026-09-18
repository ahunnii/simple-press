"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import { api } from "~/trpc/react";
import { ProductReviews } from "~/components/product-reviews";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  productId: string;
  productName: string;
  googleReviewUrl: string;
};

/**
 * UmscProductReviews — design.md "products.reviews". Shared `ProductReviews`
 * (shadcn primitives, bridged onto umsc tokens the same way
 * `.umsc-account`/`.umsc-embed` bridge the account layout and generic-page
 * embeds) + `WriteReviewDialog`. `ProductReviews` already renders its own
 * "No reviews yet" card when the count is zero; this adds the Google-review
 * link underneath that case, per design.md.
 */
const UMSC_SHADCN_VARS: CSSProperties = {
  ["--background" as string]: "var(--umsc-paper)",
  ["--foreground" as string]: "var(--umsc-ink)",
  ["--card" as string]: "var(--umsc-white)",
  ["--card-foreground" as string]: "var(--umsc-ink)",
  ["--popover" as string]: "var(--umsc-white)",
  ["--popover-foreground" as string]: "var(--umsc-ink)",
  ["--primary" as string]: "var(--umsc-black)",
  ["--primary-foreground" as string]: "var(--umsc-paper)",
  ["--secondary" as string]: "var(--umsc-cream)",
  ["--secondary-foreground" as string]: "var(--umsc-ink)",
  ["--muted" as string]: "var(--umsc-cream)",
  ["--muted-foreground" as string]: "var(--umsc-muted)",
  ["--accent" as string]: "var(--umsc-cream)",
  ["--accent-foreground" as string]: "var(--umsc-ink)",
  ["--destructive" as string]: "var(--umsc-error)",
  ["--border" as string]: "var(--umsc-line)",
  ["--input" as string]: "var(--umsc-line)",
  ["--ring" as string]: "var(--umsc-purple)",
  ["--radius" as string]: "0.2rem",
};

export function UmscProductReviews({
  productId,
  productName,
  googleReviewUrl,
}: Props) {
  const { isEnabled } = useStorefrontFlags();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: stats } = api.review.getProductStats.useQuery({ productId });

  if (!isEnabled("reviews")) return null;

  return (
    <UmscSection
      tone="paper"
      aria-label="Reviews"
      className="border-t border-[var(--umsc-line)]"
    >
      <UmscHeading as="h2" className="mb-8">
        Customer reviews
      </UmscHeading>

      <div style={UMSC_SHADCN_VARS}>
        <ProductReviews
          productId={productId}
          sortSelectContentClassName="umsc rounded-none"
          onWriteReviewClick={() => setDialogOpen(true)}
        />
      </div>

      {stats?.totalReviews === 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <UmscGoogleReviewLink
            href={googleReviewUrl}
            className="text-[var(--umsc-ink)]"
          />
        </div>
      )}

      <WriteReviewDialog
        productId={productId}
        productName={productName}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => setDialogOpen(false)}
      />
    </UmscSection>
  );
}
