import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";

export async function DarkTrendTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "dark-trend.testimonials.listing-heading",
    "dark-trend.testimonials.listing-intro",
    "dark-trend.testimonials.listing-empty",
    "dark-trend.testimonials.listing-back-label",
    "dark-trend.testimonials.share-heading",
    "dark-trend.testimonials.share-body",
    "dark-trend.testimonials.share-button",
  ]);

  const heading = f["dark-trend.testimonials.listing-heading"] ?? "";
  const intro = f["dark-trend.testimonials.listing-intro"] ?? "";
  const emptyText = f["dark-trend.testimonials.listing-empty"] ?? "";
  const backLabel = f["dark-trend.testimonials.listing-back-label"] ?? "";
  const shareHeading = f["dark-trend.testimonials.share-heading"] ?? "";
  const shareBody = (f["dark-trend.testimonials.share-body"] ?? "").trim();
  const shareButton = (f["dark-trend.testimonials.share-button"] ?? "").trim();

  const shareVisible = isSectionVisible(
    customFields,
    "dark-trend",
    "testimonials.share",
  );

  return (
    <DarkTrendGeneralLayout
      title={heading}
      titleFieldKey="dark-trend.testimonials.listing-heading"
      excerpt={intro || undefined}
      excerptFieldKey="dark-trend.testimonials.listing-intro"
      sectionAttrs={sectionGroupAttr("testimonials", "listing")}
    >
      {testimonials.length === 0 ? (
        <div className="py-20 text-center">
          <p
            {...fieldAttr("dark-trend.testimonials.listing-empty")}
            className="text-lg text-white/60"
          >
            {emptyText}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block font-semibold text-purple-400 hover:text-purple-300"
          >
            <span {...fieldAttr("dark-trend.testimonials.listing-back-label")}>
              {backLabel}
            </span>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <article
                key={t.id}
                className="flex flex-col rounded-xl border border-white/10 bg-[#1F1F1F] p-6"
              >
                <p className="flex-1 leading-relaxed text-white/85">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-6">
                  {t.photoUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote customer photos
                    <img
                      src={t.photoUrls[0]}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                      {t.customerName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{t.customerName}</p>
                    <p className="text-sm text-white/50">Customer</p>
                  </div>
                </div>
                {t.photoUrls && t.photoUrls.length > 1 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.photoUrls.slice(1, 5).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-14 w-14 rounded-md object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          {shareVisible ? (
            <div
              {...sectionGroupAttr("testimonials", "share")}
              className="mt-12 rounded-xl border border-white/10 bg-[#1F1F1F] px-8 py-12 text-center"
            >
              <h2
                {...fieldAttr("dark-trend.testimonials.share-heading")}
                className="text-xl font-bold text-white"
              >
                {shareHeading}
              </h2>
              {shareBody ? (
                <p
                  {...fieldAttr("dark-trend.testimonials.share-body")}
                  className="mt-2 text-white/60"
                >
                  {shareBody}
                </p>
              ) : null}
              {shareButton ? (
                <Link
                  href="/testimonials/submit"
                  className="mt-6 inline-block rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <span
                    {...fieldAttr("dark-trend.testimonials.share-button")}
                  >
                    {shareButton}
                  </span>
                </Link>
              ) : null}
            </div>
          ) : null}
          <div className="mt-8 text-center">
            <Link
              href="/about"
              className="font-semibold text-purple-400 hover:text-purple-300"
            >
              About us
            </Link>
          </div>
        </>
      )}
    </DarkTrendGeneralLayout>
  );
}
