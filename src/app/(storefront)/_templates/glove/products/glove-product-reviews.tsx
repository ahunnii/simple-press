"use client";

import { useState } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
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
 * summary + list on the left, the "Be the first to review “…”" invitation on
 * the right opening the platform write-review dialog. The platform components
 * sit inside the `.glove-account` bridge so their shadcn surfaces pick up the
 * glove tokens. Renders nothing (and fires no review queries) when off.
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
  if (!isEnabled("reviews")) return null;

  return (
    <section
      aria-labelledby="glove-reviews-heading"
      className="glove-account grid gap-10 border-t border-[var(--glove-line)] pt-10 md:grid-cols-2 md:gap-0 md:pt-12"
    >
      <div className="min-w-0 md:pr-10">
        <h2
          id="glove-reviews-heading"
          className="glove-body mb-6 text-[24px] font-normal text-[var(--glove-ink)]"
          {...(heading ? fieldAttr("glove.product.reviews-heading") : {})}
        >
          {heading || "Reviews"}
        </h2>
        <ProductReviews productId={productId} showWriteReview={false} />
      </div>

      <div className="min-w-0 md:border-l md:border-[var(--glove-line)] md:pl-10">
        <h3 className="glove-display text-[20px] font-medium text-[var(--glove-ink)]">
          {prompt ? `${prompt} “${productName}”` : productName}
        </h3>
        {body ? (
          <p
            className="mt-3 text-[14px] leading-relaxed text-[var(--glove-text)]"
            {...fieldAttr("glove.product.review-body")}
          >
            {body}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={gloveButtonClass({ variant: "woo", className: "mt-6" })}
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
      </div>
    </section>
  );
}
