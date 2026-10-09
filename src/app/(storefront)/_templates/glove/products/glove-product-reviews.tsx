"use client";

import { useState } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { ProductReviews } from "~/components/product-reviews";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { gloveButtonClass } from "../shared";

type Props = {
  productId: string;
  productName: string;
  heading: string;
  prompt: string;
  body: string;
  buttonLabel: string;
};

/**
 * Reviews (B6.3, `reviews` flag): the WoodMart 2-column layout — the review
 * summary + list on the left, the write-a-review invitation on the right
 * opening the platform write-review dialog. The platform components sit
 * inside the `.glove-account` bridge so their shadcn surfaces pick up the
 * glove tokens. Renders nothing (and fires no review queries) when off.
 *
 * With zero approved reviews the platform list's own "No reviews yet" card
 * would sit beside this invitation and say the same thing twice, so the list
 * is not rendered then: one warm empty state (heading, line, button) stands in
 * for both. The count comes from the same `getProductStats` query the list
 * uses, so react-query serves both from one request.
 */
export function GloveProductReviews({
  productId,
  productName,
  heading,
  prompt,
  body,
  buttonLabel,
}: Props) {
  const { isEnabled } = useStorefrontFlags();
  const [open, setOpen] = useState(false);
  const reviewsOn = isEnabled("reviews");
  const { data: stats } = api.review.getProductStats.useQuery(
    { productId },
    { enabled: reviewsOn },
  );
  if (!reviewsOn) return null;

  const noReviews = stats?.totalReviews === 0;

  const invitation = (
    <>
      {prompt ? (
        <h3
          className="glove-display text-[20px] font-medium text-[var(--glove-ink)]"
          {...fieldAttr("glove.product.review-prompt")}
        >
          {prompt}
        </h3>
      ) : null}
      {body ? (
        <p
          className={cn(
            "text-[14px] leading-relaxed text-[var(--glove-text)]",
            prompt && "mt-2",
          )}
          {...fieldAttr("glove.product.review-body")}
        >
          {body}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={gloveButtonClass({ variant: "woo", className: "mt-5" })}
        {...fieldAttr("glove.product.review-button-label")}
      >
        {buttonLabel}
      </button>
      <WriteReviewDialog
        productId={productId}
        productName={productName}
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </>
  );

  const reviewsHeading = (
    <h2
      id="glove-reviews-heading"
      className="glove-body mb-6 text-[24px] font-normal text-[var(--glove-ink)]"
      {...(heading ? fieldAttr("glove.product.reviews-heading") : {})}
    >
      {heading || "Reviews"}
    </h2>
  );

  if (noReviews) {
    return (
      <section
        aria-labelledby="glove-reviews-heading"
        className="glove-account border-t border-[var(--glove-line)] pt-10 md:pt-12"
      >
        {reviewsHeading}
        <div className="max-w-xl rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] p-6 md:p-7">
          {invitation}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="glove-reviews-heading"
      className="glove-account grid gap-10 border-t border-[var(--glove-line)] pt-10 md:grid-cols-2 md:gap-0 md:pt-12"
    >
      <div className="min-w-0 md:pr-10">
        {reviewsHeading}
        <ProductReviews productId={productId} showWriteReview={false} />
      </div>

      <div className="min-w-0 md:border-l md:border-[var(--glove-line)] md:pl-10">
        {invitation}
      </div>
    </section>
  );
}
