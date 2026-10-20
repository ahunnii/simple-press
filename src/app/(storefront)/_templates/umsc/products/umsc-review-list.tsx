/* eslint-disable @next/next/no-img-element */
"use client";

import { useId, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, Star, ThumbsDown, ThumbsUp } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { UmscButton } from "../shared/umsc-button";
import { UmscRevealGroup } from "../shared/umsc-reveal";

type SortBy = "recent" | "helpful" | "rating_high" | "rating_low";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "helpful", label: "Most helpful" },
  { value: "rating_high", label: "Highest rating" },
  { value: "rating_low", label: "Lowest rating" },
];

/**
 * `review.listByProduct` has no server-side limit/cursor (it returns every
 * approved review), so "Load more" caps the render client-side over the
 * already-fetched list — same contract as the shared `ProductReviews`.
 */
const INITIAL_REVIEW_COUNT = 10;
const REVIEW_PAGE_SIZE = 10;

type Review = RouterOutputs["review"]["listByProduct"][number];

type Props = {
  productId: string;
  onWriteReviewClick: () => void;
};

/**
 * UmscStars — five gold stars (`--umsc-gold`, decorative graphic; text is
 * never gold on light). Filled stars are solid, the rest a gold outline.
 * Exposed to assistive tech as a single labelled image.
 */
function UmscStars({
  rating,
  size,
  className,
}: {
  rating: number;
  size: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Rated ${rating} out of 5`}
      className={cn("inline-flex gap-[3px] text-[var(--umsc-gold)]", className)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          style={{ width: size, height: size }}
          fill={star <= rating ? "currentColor" : "none"}
          strokeWidth={star <= rating ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

/**
 * UmscReviewList — native umsc replacement for the shared `ProductReviews`
 * on the product page. Same data contract (stats, list, sort, star filter,
 * votes, client-side load-more) in the umsc voice: Marcellus average, gold
 * stars, hairline distribution bars, cream cards in the `UmscReviewCard`
 * family, ghost/gold pill buttons.
 */
export function UmscReviewList({ productId, onWriteReviewClick }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [visibleCount, setVisibleCount] = useState(INITIAL_REVIEW_COUNT);
  const sortId = useId();

  const { data: stats } = api.review.getProductStats.useQuery({ productId });
  const { data: reviews } = api.review.listByProduct.useQuery(
    { productId, sortBy, rating: filterRating },
    // Keep the old list on screen while a new sort/filter loads so the page
    // doesn't collapse and jump.
    { placeholderData: keepPreviousData },
  );

  const clearFilter = () => {
    setFilterRating(undefined);
    setVisibleCount(INITIAL_REVIEW_COUNT);
  };

  if (!stats || !reviews) {
    return (
      <p
        role="status"
        className="umsc-sans py-12 text-center text-[15px] text-[var(--umsc-muted)]"
      >
        Loading reviews&hellip;
      </p>
    );
  }

  // Inviting empty state — skips the all-zero stats band and the controls.
  if (stats.totalReviews === 0) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-8 text-center sm:p-10">
        <UmscStars rating={0} size={22} />
        <div className="flex flex-col gap-2">
          <h3 className="umsc-serif text-[clamp(22px,2.2vw,30px)] leading-[1.15] font-normal tracking-[0.015em]">
            No reviews yet
          </h3>
          <p className="umsc-sans text-[16px] leading-[1.6] text-[var(--umsc-muted)]">
            Be the first to share your thoughts on this product.
          </p>
        </div>
        <UmscButton as="button" variant="gold" onClick={onWriteReviewClick}>
          Write a review
        </UmscButton>
      </div>
    );
  }

  const average = stats.averageRating;
  const total = stats.totalReviews;
  const visible = reviews.slice(0, visibleCount);
  const remaining = reviews.length - visibleCount;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {/* Summary band */}
      <div className="grid items-center gap-8 border-y border-[var(--umsc-line)] py-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-12">
        <div className="flex flex-col items-start gap-2 md:items-center md:text-center">
          <div className="umsc-serif text-[clamp(56px,6vw,76px)] leading-none font-normal tabular-nums">
            {average.toFixed(1)}
          </div>
          <UmscStars rating={Math.round(average)} size={20} />
          <p className="umsc-sans text-[14px] text-[var(--umsc-muted)]">
            Based on {total} review{total !== 1 ? "s" : ""}
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter reviews by rating"
          className="flex w-full max-w-[520px] flex-col gap-1"
        >
          {[5, 4, 3, 2, 1].map((rating) => {
            const count =
              stats.ratingDistribution[
                rating as keyof typeof stats.ratingDistribution
              ];
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const active = filterRating === rating;
            return (
              <button
                key={rating}
                type="button"
                aria-pressed={active}
                aria-label={`${rating}-star reviews: ${count}`}
                onClick={() => {
                  setFilterRating(active ? undefined : rating);
                  setVisibleCount(INITIAL_REVIEW_COUNT);
                }}
                className={cn(
                  "umsc-sans grid min-h-11 w-full cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] items-center gap-3 border px-2 text-[14px] text-[var(--umsc-ink)] transition-colors duration-200 hover:bg-[var(--umsc-cream)]",
                  active
                    ? "border-[var(--umsc-gold-ink)] bg-[var(--umsc-cream)]"
                    : "border-transparent",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex items-center gap-1.5 font-semibold tabular-nums"
                >
                  {rating}
                  <Star
                    className="size-[14px] text-[var(--umsc-gold)]"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="block h-1.5 overflow-hidden rounded-full bg-[var(--umsc-line)]"
                >
                  <span
                    className="block h-full rounded-full bg-[var(--umsc-gold)]"
                    style={{ width: `${percentage}%` }}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-right tabular-nums",
                    active
                      ? "font-semibold text-[var(--umsc-ink)]"
                      : "text-[var(--umsc-muted)]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <UmscButton
          as="button"
          variant="gold"
          onClick={onWriteReviewClick}
          className="w-full md:w-auto"
        >
          Write a review
        </UmscButton>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor={sortId}
              className="umsc-sans text-[13px] text-[var(--umsc-muted)]"
            >
              Sort by
            </label>
            <select
              id={sortId}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortBy);
                setVisibleCount(INITIAL_REVIEW_COUNT);
              }}
              className="umsc-sans h-11 cursor-pointer appearance-none border border-[var(--umsc-line)] bg-[var(--umsc-paper)] px-3 pr-8 text-[14px] text-[var(--umsc-ink)]"
              style={{
                backgroundImage:
                  "linear-gradient(45deg,transparent 50%,var(--umsc-gold-ink) 50%),linear-gradient(135deg,var(--umsc-gold-ink) 50%,transparent 50%)",
                backgroundPosition:
                  "calc(100% - 15px) center, calc(100% - 11px) center",
                backgroundSize: "4px 4px",
                backgroundRepeat: "no-repeat",
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {filterRating !== undefined && (
            <UmscButton
              as="button"
              variant="link"
              showArrow={false}
              onClick={clearFilter}
              className="min-h-11"
            >
              Clear filter
            </UmscButton>
          )}
        </div>

        <p
          aria-live="polite"
          aria-atomic="true"
          className="umsc-sans text-[13px] text-[var(--umsc-muted)]"
        >
          {filterRating !== undefined
            ? `${reviews.length} ${filterRating}-star review${reviews.length !== 1 ? "s" : ""}`
            : `${reviews.length} review${reviews.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* List */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-4 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-8 text-center">
          <p className="umsc-sans text-[16px] leading-[1.6] text-[var(--umsc-muted)]">
            No reviews match this rating yet.
          </p>
          <UmscButton as="button" variant="ghost" onClick={clearFilter}>
            Show all reviews
          </UmscButton>
        </div>
      ) : (
        <UmscRevealGroup threshold={0} className="flex flex-col gap-4">
          {visible.map((review, i) => (
            <div
              key={review.id}
              className="umsc-reveal-item"
              style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
            >
              <UmscReviewItem review={review} />
            </div>
          ))}
        </UmscRevealGroup>
      )}

      {remaining > 0 && (
        <div className="flex justify-center">
          <UmscButton
            as="button"
            variant="ghost"
            onClick={() => setVisibleCount((count) => count + REVIEW_PAGE_SIZE)}
          >
            Load more reviews ({remaining} remaining)
          </UmscButton>
        </div>
      )}
    </div>
  );
}

function UmscReviewItem({ review }: { review: Review }) {
  const utils = api.useUtils();
  const voteMutation = api.review.vote.useMutation({
    onSuccess: () => {
      // Refetch so helpful counts (and the "helpful" sort order) reflect the
      // vote. Stats don't depend on votes.
      void utils.review.listByProduct.invalidate();
    },
  });

  const vote = (isHelpful: boolean) =>
    voteMutation.mutate({ reviewId: review.id, isHelpful });

  // reviewDate, not createdAt: owners backdate imported reviews.
  const date = new Date(review.reviewDate);
  const images = review.images ?? [];

  const voteClass =
    "umsc-sans inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[14px] text-[var(--umsc-muted)] tabular-nums transition-colors duration-200 hover:bg-[var(--umsc-white)] hover:text-[var(--umsc-ink)] disabled:cursor-default disabled:opacity-60";

  return (
    <article className="flex flex-col gap-4 border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-6 sm:p-7">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <UmscStars rating={review.rating} size={16} />
        {review.verifiedPurchase && (
          <span className="umsc-sans inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--umsc-gold-ink)]">
            <BadgeCheck aria-hidden="true" className="size-4" />
            Verified purchase
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {review.title && (
          <h3 className="umsc-sans text-[18px] leading-[1.3] font-semibold text-[var(--umsc-ink)]">
            {review.title}
          </h3>
        )}
        {review.comment && (
          <p className="umsc-sans max-w-[66ch] text-[16px] leading-[1.6] text-[var(--umsc-ink)] sm:text-[17px]">
            {review.comment}
          </p>
        )}
      </div>

      {images.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {images.map((image, index) => (
            <li key={`${image}-${index}`}>
              <a
                href={image}
                target="_blank"
                rel="noopener noreferrer"
                className="block size-20 overflow-hidden border border-[var(--umsc-line-gold)]"
              >
                <img
                  src={image}
                  alt={
                    images.length > 1
                      ? `Photo ${index + 1} of ${images.length} from ${review.customerName}'s review`
                      : `Photo from ${review.customerName}'s review`
                  }
                  loading="lazy"
                  className="size-full object-cover"
                />
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {review.videoUrl && (
        <video
          src={review.videoUrl}
          controls
          preload="metadata"
          aria-label={`Video from ${review.customerName}'s review`}
          className="w-full max-w-md border border-[var(--umsc-line)]"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[var(--umsc-line)] pt-3">
        <p className="umsc-sans text-[14px] text-[var(--umsc-muted)]">
          <span className="font-semibold text-[var(--umsc-ink)]">
            {review.customerName}
          </span>
          {" · "}
          <time dateTime={date.toISOString()}>
            {formatDistanceToNow(date, { addSuffix: true })}
          </time>
        </p>

        <div className="-mr-3 flex items-center gap-1">
          <span className="umsc-sans mr-1 text-[14px] text-[var(--umsc-muted)]">
            Helpful?
          </span>
          <button
            type="button"
            aria-label={`Helpful: ${review.helpfulCount}`}
            onClick={() => vote(true)}
            disabled={voteMutation.isPending}
            className={voteClass}
          >
            <ThumbsUp aria-hidden="true" className="size-4" />
            {review.helpfulCount}
          </button>
          <button
            type="button"
            aria-label={`Not helpful: ${review.notHelpfulCount}`}
            onClick={() => vote(false)}
            disabled={voteMutation.isPending}
            className={voteClass}
          >
            <ThumbsDown aria-hidden="true" className="size-4" />
            {review.notHelpfulCount}
          </button>
        </div>
      </div>
    </article>
  );
}
