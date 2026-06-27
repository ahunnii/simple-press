import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract initials from a name — up to two words, first letter each. */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}

// ─── Card variants ────────────────────────────────────────────────────────────

type Testimonial = Awaited<ReturnType<typeof api.testimonial.list>>[number];

/** Variant 0 — WIDE (md:col-span-8) */
function WideCard({ t }: { t: Testimonial }) {
  const location = t.customerTitle ?? t.customerCompany ?? "";
  return (
    <div
      className="group flex flex-col justify-between border p-10 transition-colors duration-300 hover:border-[#FFC5B6] md:col-span-8"
      style={{
        borderColor: "var(--builders-rule, #e5e7eb)",
        background: "var(--builders-surface, #ffffff)",
      }}
    >
      <div className="mb-12">
        <span
          aria-hidden="true"
          className="mb-6 block text-5xl leading-none"
          style={{ color: "var(--builders-accent, #FFC5B6)" }}
        >
          &ldquo;
        </span>
        <p
          className="text-lg leading-relaxed md:text-xl"
          style={{
            fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
            color: "var(--builders-ink, #131313)",
          }}
        >
          {t.text}
        </p>
      </div>
      <div
        className="flex items-center gap-4 border-t pt-6"
        style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
      >
        {/* Initials avatar — square (global .builders forces 0 radius) */}
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center border"
          style={{
            background: "var(--builders-alt, #F1F3F5)",
            borderColor: "var(--builders-rule, #e5e7eb)",
          }}
        >
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              color: "var(--builders-ink, #131313)",
            }}
          >
            {getInitials(t.customerName)}
          </span>
        </div>
        <div>
          <p
            className="text-lg"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 500,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {t.customerName}
          </p>
          {location && (
            <p
              className="mt-0.5 text-xs uppercase tracking-widest"
              style={{
                fontFamily:
                  "var(--font-builders-body, 'Agdasima', sans-serif)",
                color: "var(--builders-muted, #6b7280)",
              }}
            >
              {location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Variant 1 — NARROW (md:col-span-4) */
function NarrowCard({ t }: { t: Testimonial }) {
  const location = t.customerTitle ?? t.customerCompany ?? "";
  return (
    <div
      className="group flex flex-col justify-between border p-8 transition-colors duration-300 hover:border-[#FFC5B6] md:col-span-4"
      style={{
        borderColor: "var(--builders-rule, #e5e7eb)",
        background: "var(--builders-surface, #ffffff)",
      }}
    >
      <div className="mb-8">
        <span
          aria-hidden="true"
          className="mb-4 block text-3xl leading-none"
          style={{ color: "var(--builders-rule, #e5e7eb)" }}
        >
          &ldquo;
        </span>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
            color: "var(--builders-ink, #131313)",
            opacity: 0.75,
          }}
        >
          {t.text}
        </p>
      </div>
      <div>
        <p
          className="text-lg"
          style={{
            fontFamily:
              "var(--font-builders-display, 'Jost', sans-serif)",
            fontWeight: 500,
            color: "var(--builders-ink, #131313)",
          }}
        >
          {t.customerName}
        </p>
        {location && (
          <p
            className="mt-1 text-xs uppercase tracking-widest"
            style={{
              fontFamily:
                "var(--font-builders-body, 'Agdasima', sans-serif)",
              color: "var(--builders-muted, #6b7280)",
            }}
          >
            {location}
          </p>
        )}
      </div>
    </div>
  );
}

/** Variant 2 — PHOTO HYBRID (md:col-span-5) */
function PhotoHybridCard({ t }: { t: Testimonial }) {
  const location = t.customerTitle ?? t.customerCompany ?? "";
  const photo = t.photoUrls[0];

  if (!photo) {
    // No photo: fall back to narrow card treatment but with col-span-5
    return (
      <div
        className="group flex flex-col justify-between border p-8 transition-colors duration-300 hover:border-[#FFC5B6] md:col-span-5"
        style={{
          borderColor: "var(--builders-rule, #e5e7eb)",
          background: "var(--builders-surface, #ffffff)",
        }}
      >
        <div className="mb-8">
          <span
            aria-hidden="true"
            className="mb-4 block text-3xl leading-none"
            style={{ color: "var(--builders-rule, #e5e7eb)" }}
          >
            &ldquo;
          </span>
          <p
            className="text-base"
            style={{
              fontFamily:
                "var(--font-builders-body, 'Agdasima', sans-serif)",
              color: "var(--builders-ink, #131313)",
              opacity: 0.75,
            }}
          >
            {t.text}
          </p>
        </div>
        <div>
          <p
            className="text-lg"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 500,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {t.customerName}
          </p>
          {location && (
            <p
              className="mt-1 text-xs uppercase tracking-widest"
              style={{
                fontFamily:
                  "var(--font-builders-body, 'Agdasima', sans-serif)",
                color: "var(--builders-muted, #6b7280)",
              }}
            >
              {location}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden border md:col-span-5"
      style={{
        borderColor: "var(--builders-rule, #e5e7eb)",
        background: "var(--builders-surface, #ffffff)",
        minHeight: "300px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-10 transition-all duration-500 group-hover:scale-105 group-hover:opacity-20"
      />
      <div
        className="relative z-10 flex h-full flex-col justify-end p-8"
        style={{
          background:
            "linear-gradient(to top, var(--builders-surface, #ffffff) 0%, color-mix(in srgb, var(--builders-surface, #ffffff) 80%, transparent) 50%, transparent 100%)",
        }}
      >
        <p
          className="mb-6 text-lg"
          style={{
            fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
            color: "var(--builders-ink, #131313)",
          }}
        >
          {t.text}
        </p>
        <div
          className="flex items-end justify-between border-t pt-4"
          style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
        >
          <span
            className="text-lg"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 500,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {t.customerName}
          </span>
          {location && (
            <span
              className="text-xs uppercase tracking-widest"
              style={{
                fontFamily:
                  "var(--font-builders-body, 'Agdasima', sans-serif)",
                color: "var(--builders-muted, #6b7280)",
              }}
            >
              {location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Variant 3 — CENTERED (md:col-span-7) */
function CenteredCard({ t }: { t: Testimonial }) {
  const location = t.customerTitle ?? t.customerCompany ?? "";
  return (
    <div
      className="group flex flex-col items-center justify-center border p-10 text-center transition-colors duration-300 hover:border-[#FFC5B6] md:col-span-7"
      style={{
        borderColor: "var(--builders-rule, #e5e7eb)",
        background: "var(--builders-surface, #ffffff)",
      }}
    >
      <p
        className="mb-8 max-w-lg text-lg"
        style={{
          fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
          color: "var(--builders-ink, #131313)",
        }}
      >
        {t.text}
      </p>
      <div className="flex flex-col items-center gap-2">
        <span
          className="mb-2 inline-block h-1 w-8"
          style={{ background: "var(--builders-accent, #FFC5B6)" }}
          aria-hidden="true"
        />
        <p
          className="uppercase"
          style={{
            fontFamily:
              "var(--font-builders-display, 'Jost', sans-serif)",
            fontWeight: 500,
            color: "var(--builders-ink, #131313)",
          }}
        >
          {t.customerName}
        </p>
        {location && (
          <p
            className="text-xs uppercase tracking-widest"
            style={{
              fontFamily:
                "var(--font-builders-body, 'Agdasima', sans-serif)",
              color: "var(--builders-muted, #6b7280)",
            }}
          >
            {location}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export async function BuildersTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "builders.testimonials.page-heading",
    "builders.testimonials.page-intro",
    "builders.testimonials.empty-state-text",
    "builders.testimonials.cta-heading",
    "builders.testimonials.cta-body",
    "builders.testimonials.cta-button-label",
  ]);

  const pageHeading = f["builders.testimonials.page-heading"] ?? "Community Voice";
  const pageIntro = f["builders.testimonials.page-intro"] ?? "";
  const emptyStateText = f["builders.testimonials.empty-state-text"] ?? "";
  const ctaHeading = f["builders.testimonials.cta-heading"] ?? "Worked With Us?";
  const ctaBody = f["builders.testimonials.cta-body"] ?? "";
  const ctaButtonLabel = f["builders.testimonials.cta-button-label"] ?? "Share Your Story";

  const testimonials = await api.testimonial.list({ publicOnly: true });

  return (
    <main
      className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-32 md:px-12 md:pb-32 md:pt-48"
      style={{ background: "var(--builders-bg, #F8F9FA)" }}
    >
      {/* ── 1. Header ───────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("testimonials", "header")}
        className="mb-32"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="flex flex-col justify-end md:col-span-8">
            <h1
              className="mb-6 text-4xl uppercase leading-none tracking-tight md:text-6xl lg:text-7xl"
              style={{
                fontFamily:
                  "var(--font-builders-display, 'Jost', sans-serif)",
                fontWeight: 300,
                color: "var(--builders-ink, #131313)",
              }}
            >
              {pageHeading}
            </h1>
            {pageIntro && (
              <p
                className="max-w-2xl border-l-2 pl-6 text-lg leading-relaxed md:text-xl"
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                  borderColor: "var(--builders-accent, #FFC5B6)",
                  color: "var(--builders-ink, #131313)",
                  opacity: 0.75,
                }}
              >
                {pageIntro}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. Bento grid / empty state ─────────────────────────────────────── */}
      {testimonials.length > 0 ? (
        <div className="grid auto-rows-[minmax(300px,_auto)] grid-cols-1 gap-6 md:grid-cols-12">
          {testimonials.map((t, i) => {
            const variant = i % 4;
            if (variant === 0) return <WideCard key={t.id} t={t} />;
            if (variant === 1) return <NarrowCard key={t.id} t={t} />;
            if (variant === 2) return <PhotoHybridCard key={t.id} t={t} />;
            return <CenteredCard key={t.id} t={t} />;
          })}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center border px-8 py-20 text-center"
          style={{
            borderColor: "var(--builders-rule, #e5e7eb)",
            background: "var(--builders-surface, #ffffff)",
          }}
        >
          <p
            className="mb-8 max-w-md text-base"
            style={{
              fontFamily:
                "var(--font-builders-body, 'Agdasima', sans-serif)",
              color: "var(--builders-ink, #131313)",
              opacity: 0.6,
            }}
          >
            {emptyStateText}
          </p>
          <Link
            href="/testimonials/submit"
            className="inline-block px-6 py-3 text-sm uppercase transition-opacity hover:opacity-80"
            style={{
              background: "var(--builders-accent, #FFC5B6)",
              color: "var(--builders-accent-ink, #31130A)",
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              letterSpacing: "0.08em",
            }}
          >
            {ctaButtonLabel}
          </Link>
        </div>
      )}

      {/* ── 3. Submit CTA band ───────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("testimonials", "cta")}
        className="mt-24 border-t pt-16 text-center"
        style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
      >
        <div
          className="border px-8 py-16"
          style={{
            borderColor: "var(--builders-rule, #e5e7eb)",
            background: "var(--builders-alt, #F1F3F5)",
          }}
        >
          <h2
            className="mb-4 text-3xl uppercase leading-tight md:text-4xl"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 300,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {ctaHeading}
          </h2>
          {ctaBody && (
            <p
              className="mx-auto mb-8 max-w-lg text-base"
              style={{
                fontFamily:
                  "var(--font-builders-body, 'Agdasima', sans-serif)",
                color: "var(--builders-ink, #131313)",
                opacity: 0.7,
              }}
            >
              {ctaBody}
            </p>
          )}
          <Link
            href="/testimonials/submit"
            className="inline-block px-6 py-3 text-sm uppercase transition-opacity hover:opacity-80"
            style={{
              background: "var(--builders-accent, #FFC5B6)",
              color: "var(--builders-accent-ink, #31130A)",
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              letterSpacing: "0.08em",
            }}
          >
            {ctaButtonLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
