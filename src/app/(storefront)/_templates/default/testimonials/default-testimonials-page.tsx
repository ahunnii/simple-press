import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import {
  TESTIMONIALS_LISTING_EMPTY_DEFAULT,
  TESTIMONIALS_LISTING_HEADING_DEFAULT,
  TESTIMONIALS_LISTING_INTRO_DEFAULT,
  TESTIMONIALS_LISTING_LABEL_DEFAULT,
  TESTIMONIALS_SHARE_HEADING_DEFAULT,
  TESTIMONIALS_SHARE_LABEL_DEFAULT,
} from "./index";

function StarRow({ count = 5 }: { count?: number }) {
  return (
    <span
      role="img"
      aria-label={`${count} out of 5 stars`}
      className="tracking-[2px] text-[#0a0a0a]"
    >
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export async function DefaultTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  const total = testimonials.length;

  const f = resolveFields(business.siteContent?.customFields, [
    "default.testimonials.listing-label",
    "default.testimonials.listing-heading",
    "default.testimonials.listing-intro",
    "default.testimonials.listing-empty",
    "default.testimonials.share-label",
    "default.testimonials.share-heading",
    "default.testimonials.share-body",
    "default.testimonials.share-button",
  ]);
  const listingLabel =
    (f["default.testimonials.listing-label"] ?? "").trim() ||
    TESTIMONIALS_LISTING_LABEL_DEFAULT;
  const listingHeading =
    (f["default.testimonials.listing-heading"] ?? "").trim() ||
    TESTIMONIALS_LISTING_HEADING_DEFAULT;
  const listingIntro =
    (f["default.testimonials.listing-intro"] ?? "").trim() ||
    TESTIMONIALS_LISTING_INTRO_DEFAULT;
  const listingEmpty =
    (f["default.testimonials.listing-empty"] ?? "").trim() ||
    TESTIMONIALS_LISTING_EMPTY_DEFAULT;
  const shareLabel =
    (f["default.testimonials.share-label"] ?? "").trim() ||
    TESTIMONIALS_SHARE_LABEL_DEFAULT;
  const shareHeading =
    (f["default.testimonials.share-heading"] ?? "").trim() ||
    TESTIMONIALS_SHARE_HEADING_DEFAULT;
  // Both fields hide their element when blank — resolve the trimmed value
  // as-is (no CONSTANT fallback) so an owner can actually clear them.
  const shareBody = (f["default.testimonials.share-body"] ?? "").trim();
  const shareButton = (f["default.testimonials.share-button"] ?? "").trim();

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("testimonials", "listing")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <span
            {...fieldAttr("default.testimonials.listing-label")}
            className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
          >
            {listingLabel}
          </span>
          <h1
            {...fieldAttr("default.testimonials.listing-heading")}
            className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]"
          >
            {listingHeading}
          </h1>
          <p
            {...fieldAttr("default.testimonials.listing-intro")}
            className="mt-4 text-[17px] text-[#6b6b6b]"
          >
            {listingIntro}
          </p>
        </div>
      </section>

      {/* ── Summary bar ──────────────────────────────────────────────────── */}
      {total > 0 && (
        <section className="border-b border-[#e8e8e8] px-6 py-10 lg:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            <span
              aria-hidden="true"
              className="font-serif text-5xl font-semibold tracking-tight"
            >
              ★
            </span>
            <div>
              <p className="text-sm font-medium">Verified reviews</p>
              <p className="text-sm text-[#6b6b6b]">
                {total} review{total !== 1 ? "s" : ""} from verified buyers
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Review grid ──────────────────────────────────────────────────── */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {testimonials.length === 0 ? (
            <div className="py-24 text-center">
              <p
                {...fieldAttr("default.testimonials.listing-empty")}
                className="text-[#6b6b6b]"
              >
                {listingEmpty}
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
              >
                Back to home <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="mb-5 break-inside-avoid rounded-[var(--radius)] border border-[#e8e8e8] p-6"
                >
                  <StarRow />
                  <p className="mt-3 text-[15px] leading-[1.65]">{t.text}</p>
                  {t.photoUrls.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {t.photoUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="h-16 w-16 rounded-[var(--radius)] object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#e8e8e8] pt-4">
                    <div>
                      <p className="text-sm font-medium">{t.customerName}</p>
                      {t.customerTitle && (
                        <p className="text-xs text-[#6b6b6b]">
                          {t.customerTitle}
                        </p>
                      )}
                    </div>
                    <time
                      dateTime={new Date(t.testimonialDate).toISOString()}
                      className="shrink-0 text-xs text-[#6b6b6b]"
                    >
                      {formatDate(t.testimonialDate)}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Submit CTA ───────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("testimonials", "share")}
        className="bg-[#efece8] px-6 py-20 text-center lg:px-8"
      >
        <div className="mx-auto max-w-[640px]">
          <span
            {...fieldAttr("default.testimonials.share-label")}
            className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
          >
            {shareLabel}
          </span>
          <h2
            {...fieldAttr("default.testimonials.share-heading")}
            className="mt-3 font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]"
          >
            {shareHeading}
          </h2>
          {shareBody ? (
            <p
              {...fieldAttr("default.testimonials.share-body")}
              className="mt-4 text-[15px] text-[#6b6b6b]"
            >
              {shareBody}
            </p>
          ) : null}
          {shareButton ? (
            <div className="mt-8">
              <Link
                href="/testimonials/submit"
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
              >
                <span {...fieldAttr("default.testimonials.share-button")}>
                  {shareButton}
                </span>
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </PageTransition>
  );
}
