/* eslint-disable @next/next/no-img-element -- remote customer-uploaded photos */
import type { CSSProperties } from "react";
import { Quote } from "lucide-react";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import {
  GloveButton,
  GloveHandIcon,
  GloveMedallion,
  GloveReveal,
  GloveRevealGroup,
  GloveSection,
  GloveTitleBand,
} from "../shared";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

const FIELD_KEYS = [
  "glove.testimonials.title",
  "glove.testimonials.subtitle",
  "glove.testimonials.empty-heading",
  "glove.testimonials.empty-body",
  "glove.testimonials.submit-heading",
  "glove.testimonials.submit-body",
  "glove.testimonials.submit-label",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function attribution(t: Testimonial): string {
  return [t.customerTitle, t.customerCompany]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  const who = attribution(t);
  const photos = (t.photoUrls ?? []).slice(0, 3);
  return (
    <figure
      className="glove-mist-panel glove-reveal-item mb-6 flex break-inside-avoid flex-col gap-4 p-6 md:p-7"
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      <Quote
        className="size-8 shrink-0 fill-[var(--glove-primary-tint)] text-[var(--glove-primary)]"
        aria-hidden="true"
      />
      <blockquote className="m-0 flex flex-col gap-3">
        {t.title ? (
          <p className="glove-display text-[17px] leading-[1.35] font-medium text-[var(--glove-ink)]">
            {t.title}
          </p>
        ) : null}
        <p className="text-[16px] leading-[1.7] whitespace-pre-line text-[var(--glove-text)]">
          {t.text}
        </p>
      </blockquote>
      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`Photo shared by ${t.customerName}${photos.length > 1 ? ` (${i + 1} of ${photos.length})` : ""}`}
              loading="lazy"
              className="size-16 rounded-[8px] border border-[var(--glove-mist-line)] object-cover"
            />
          ))}
        </div>
      ) : null}
      <figcaption className="flex items-center gap-3 border-t border-[var(--glove-mist-line)] pt-4">
        <GloveMedallion size="sm">
          <span aria-hidden="true">{initials(t.customerName)}</span>
        </GloveMedallion>
        <span className="min-w-0">
          <span className="glove-display block text-[15px] leading-[1.3] font-semibold text-[var(--glove-ink)]">
            {t.customerName}
          </span>
          {who ? (
            <span className="block text-[13px] leading-[1.4] text-[var(--glove-muted)]">
              {who}
            </span>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

export async function GloveTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);
  const get = (key: string) => (f[`glove.testimonials.${key}`] ?? "").trim();

  const submitLabel = get("submit-label");
  const showSubmit = isSectionVisible(
    customFields,
    "glove",
    "testimonials.submit",
  );

  return (
    <>
      <GloveTitleBand
        variant="banner"
        title={get("title")}
        titleFieldKey="glove.testimonials.title"
        subtitle={get("subtitle")}
        subtitleFieldKey="glove.testimonials.subtitle"
        sectionAttrs={sectionGroupAttr("testimonials", "title")}
      />

      <GloveSection
        aria-label="Testimonials"
        sectionAttrs={sectionGroupAttr("testimonials", "list")}
        reveal={false}
      >
        {testimonials.length === 0 ? (
          <GloveReveal>
            <div className="glove-mist-panel mx-auto flex max-w-[620px] flex-col items-center gap-4 px-6 py-14 text-center md:px-10">
              <GloveHandIcon className="size-16 text-[var(--glove-primary)]" />
              <h2
                className="glove-display text-[22px] leading-[1.3] font-medium text-[var(--glove-ink)] md:text-[26px]"
                {...fieldAttr("glove.testimonials.empty-heading")}
              >
                {get("empty-heading")}
              </h2>
              {get("empty-body") ? (
                <p
                  className="max-w-[48ch] text-[var(--glove-text)]"
                  {...fieldAttr("glove.testimonials.empty-body")}
                >
                  {get("empty-body")}
                </p>
              ) : null}
            </div>
          </GloveReveal>
        ) : (
          <GloveRevealGroup
            threshold={0}
            className="columns-1 gap-6 md:columns-2 lg:columns-3"
          >
            {testimonials.map((t, i) => (
              <TestimonialCard key={t.id} t={t} index={i} />
            ))}
          </GloveRevealGroup>
        )}
      </GloveSection>

      {showSubmit ? (
        <GloveSection
          tone="mist"
          aria-labelledby="glove-testimonials-submit"
          sectionAttrs={sectionGroupAttr("testimonials", "submit")}
        >
          <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
            <h2
              id="glove-testimonials-submit"
              className="glove-display text-[26px] leading-[1.2] font-medium text-[var(--glove-ink)] md:text-[34px]"
              {...fieldAttr("glove.testimonials.submit-heading")}
            >
              {get("submit-heading")}
            </h2>
            {get("submit-body") ? (
              <p
                className="max-w-[55ch] text-[var(--glove-text)]"
                {...fieldAttr("glove.testimonials.submit-body")}
              >
                {get("submit-body")}
              </p>
            ) : null}
            {submitLabel ? (
              <GloveButton
                href="/testimonials/submit"
                variant="woo"
                className="mt-2"
              >
                <span {...fieldAttr("glove.testimonials.submit-label")}>
                  {submitLabel}
                </span>
              </GloveButton>
            ) : null}
          </div>
        </GloveSection>
      ) : null}
    </>
  );
}
