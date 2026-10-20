"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscSection } from "../shared/umsc-section";
import { UmscReviewList } from "./umsc-review-list";

type Props = {
  productId: string;
  productName: string;
  heading: string;
  googleReviewUrl: string;
};

/**
 * UmscProductReviews — design.md "products.reviews". Heading + flag gate, the
 * umsc-native `UmscReviewList` (summary, filter, sort, cards, load more),
 * `WriteReviewDialog`, and — when there are no reviews — the Google-review
 * link underneath the list's own empty state, per design.md. The dialog is
 * portaled, so it never depended on the old shadcn var bridge.
 */
export function UmscProductReviews({
  productId,
  productName,
  heading,
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
      <UmscHeading
        as="h2"
        className="mb-8"
        fieldKey="umsc.product.reviews-heading"
      >
        {heading}
      </UmscHeading>

      <UmscReviewList
        productId={productId}
        onWriteReviewClick={() => setDialogOpen(true)}
      />

      {stats?.totalReviews === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3">
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
