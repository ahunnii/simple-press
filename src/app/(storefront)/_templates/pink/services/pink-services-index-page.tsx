import Image from "next/image";
import Link from "next/link";

import type { PinkServiceCard } from "./pink-services-grid";
import type { TemplateListRow } from "~/lib/template-fields";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { PinkBadge } from "../shared/pink-badge";
import { PinkCtaPanel } from "../shared/pink-cta-panel";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkHairlineGrid } from "../shared/pink-hairline-grid";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkRule } from "../shared/pink-rule";
import { PinkServicesGrid } from "./pink-services-grid";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

/**
 * One-to-one heuristic for the audience badge (design.md → "services.grid":
 * "an audience badge (ink for one-to-one, rose otherwise)"). `ServiceItem`
 * has no dedicated audience column, so this reads the free-text `category`
 * field owners already fill in for filter chips.
 */
function isOneToOneCategory(category: string | null): boolean {
  if (!category) return false;
  return /one.?[- ]?to.?[- ]?one|1:1|private|individual|solo|commission/i.test(
    category,
  );
}

// `parseTemplateListRows` reads `customFields` directly and ignores a list
// field's `defaultValue` (list/richtext fields bypass `resolveFields`
// entirely — see field-conventions.md), so a fresh store needs a real
// hardcoded fallback here or these sections render empty. Mirrors vii's
// `DEFAULT_STEPS` pattern (`vii-about-page.tsx`).
const DEFAULT_STEPS: TemplateListRow[] = [
  {
    ordinal: "01",
    title: "You reach out",
    body: "Tell us the room — a classroom, a sanctuary, a break room, a back yard — and how many hands.",
  },
  {
    ordinal: "02",
    title: "We pick a project",
    body: "Something that fits the time you have and travels well.",
  },
  {
    ordinal: "03",
    title: "Materials show up",
    body: "Everything's cut, sorted and ready before anyone sits down.",
  },
  {
    ordinal: "04",
    title: "Everyone leaves with something",
    body: "Sewn, glued or knotted by their own hands.",
  },
];

export async function PinkServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "pink.services.header-heading",
    "pink.services.header-intro",
    "pink.services.featured-badge",
    "pink.services.featured-cta-label",
    "pink.services.grid-heading-suffix",
    "pink.services.audience-one-label",
    "pink.services.audience-group-label",
    "pink.services.grid-empty-heading",
    "pink.services.grid-empty-body",
    "pink.services.grid-empty-cta-label",
    "pink.services.grid-empty-cta-link",
    "pink.services.steps-heading",
    "pink.services.steps-note",
    "pink.services.cta-heading",
    "pink.services.cta-body",
    "pink.services.cta-primary-label",
    "pink.services.cta-primary-link",
    "pink.services.cta-secondary-label",
    "pink.services.cta-secondary-link",
    "pink.services.cta-image-1",
    "pink.services.cta-image-2",
  ]);

  const rawCustomFields = customFields as
    | Record<string, unknown>
    | null
    | undefined;

  const parsedStepsRows = parseTemplateListRows(
    rawCustomFields?.["pink.services.steps-list"],
  );
  const stepsRows = (
    parsedStepsRows.length > 0 ? parsedStepsRows : DEFAULT_STEPS
  ).map((row) => ({
    ordinal: typeof row.ordinal === "string" ? row.ordinal : "",
    title: typeof row.title === "string" ? row.title : "",
    body: typeof row.body === "string" ? row.body : "",
    _id: row._id,
  }));

  // ── Flatten every published ServiceItem across every published Service ──
  const cards: PinkServiceCard[] = services.flatMap((service) =>
    service.items.map((item) => ({
      id: item.id,
      href: `/services/${service.slug}`,
      imageUrl: item.image,
      name: item.name,
      description: item.description,
      priceLabel: item.priceLabel,
      durationLabel: item.durationLabel,
      category: item.category,
      isOneToOne: isOneToOneCategory(item.category),
    })),
  );

  const signatureItem = services
    .flatMap((service) => service.items.map((item) => ({ item, service })))
    .find(({ item }) => item.isSignature);

  return (
    <div className="flex flex-col">
      {/* ── 1. Header ─────────────────────────────────────────────────────── */}
      <PinkPageHeader
        sectionAttrs={sectionGroupAttr("services", "header")}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Services" }]}
        heading={f["pink.services.header-heading"] ?? ""}
        headingFieldKey="pink.services.header-heading"
        intro={f["pink.services.header-intro"] ?? ""}
        introFieldKey="pink.services.header-intro"
      />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-20 px-5 py-16 md:px-10 md:py-20">
        {/* ── 2. Featured ────────────────────────────────────────────────── */}
        {signatureItem &&
          isSectionVisible(customFields, "pink", "services.featured") && (
            <section {...sectionGroupAttr("services", "featured")}>
              <PinkReveal>
                <Link
                  href={`/services/${signatureItem.service.slug}`}
                  className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]"
                  style={{
                    border: "1px solid var(--pink-line)",
                    background: "var(--pink-white)",
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      aspectRatio: "16 / 10",
                      background: "var(--pink-panel)",
                    }}
                  >
                    <Image
                      src={signatureItem.item.image ?? "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 55vw"
                    />
                    <span
                      className="absolute top-3 left-3"
                      {...fieldAttr("pink.services.featured-badge")}
                    >
                      <PinkBadge tone="rose">
                        {f["pink.services.featured-badge"] ?? ""}
                      </PinkBadge>
                    </span>
                  </div>

                  <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
                    <h2
                      className="pink-display"
                      style={{
                        fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)",
                        fontWeight: 600,
                        letterSpacing: "-0.025em",
                        lineHeight: 1.1,
                      }}
                    >
                      {signatureItem.item.name}
                    </h2>
                    {signatureItem.item.description && (
                      <p
                        className="max-w-[48ch] text-[16px] leading-[1.7]"
                        style={{ color: "var(--pink-body)" }}
                      >
                        {signatureItem.item.description}
                      </p>
                    )}
                    <p className="pink-label">
                      {[
                        signatureItem.item.priceLabel,
                        signatureItem.item.category,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <span
                      className="text-[15px] font-medium"
                      style={{ color: "var(--pink-rose)" }}
                      {...fieldAttr("pink.services.featured-cta-label")}
                    >
                      {f["pink.services.featured-cta-label"] ?? ""}
                    </span>
                  </div>
                </Link>
              </PinkReveal>
            </section>
          )}

        {/* ── 3. Grid ────────────────────────────────────────────────────── */}
        <section {...sectionGroupAttr("services", "grid")}>
          <PinkServicesGrid
            cards={cards}
            headingSuffix={f["pink.services.grid-heading-suffix"] ?? ""}
            audienceOneLabel={f["pink.services.audience-one-label"] ?? ""}
            audienceGroupLabel={f["pink.services.audience-group-label"] ?? ""}
            emptyHeading={f["pink.services.grid-empty-heading"] ?? ""}
            emptyBody={f["pink.services.grid-empty-body"] ?? ""}
            emptyCtaLabel={f["pink.services.grid-empty-cta-label"] ?? ""}
            emptyCtaHref={f["pink.services.grid-empty-cta-link"] ?? "/contact"}
          />
        </section>
      </div>

      {/* ── 4. Steps ──────────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "services.steps") && (
        <PinkDarkBand
          sectionAttrs={sectionGroupAttr("services", "steps")}
          ariaLabel="How it works"
        >
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <PinkRule tone="dark" />
              <h2
                className="pink-display"
                style={{
                  fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                }}
                {...fieldAttr("pink.services.steps-heading")}
              >
                {f["pink.services.steps-heading"] ?? ""}
              </h2>
            </div>
            {f["pink.services.steps-note"] && (
              <p
                className="pink-label-dark"
                {...fieldAttr("pink.services.steps-note")}
              >
                {f["pink.services.steps-note"]}
              </p>
            )}
          </div>

          <PinkHairlineGrid
            tone="dark"
            columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          >
            {stepsRows.map((step, i) => (
              <PinkReveal
                key={step._id ?? i}
                index={i}
                className="flex flex-col gap-3 px-5 py-6"
              >
                <span
                  className="pink-display"
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--pink-blush)",
                  }}
                >
                  {step.ordinal}
                </span>
                <span
                  className="pink-display"
                  style={{
                    fontSize: "19px",
                    fontWeight: 600,
                    color: "var(--pink-paper)",
                  }}
                >
                  {step.title}
                </span>
                <p
                  className="text-[15px] leading-[1.7]"
                  style={{ color: "var(--pink-ink-body)" }}
                >
                  {step.body}
                </p>
              </PinkReveal>
            ))}
          </PinkHairlineGrid>
        </PinkDarkBand>
      )}

      {/* ── 5. CTA ────────────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "services.cta") && (
        <div className="mx-auto w-full max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
          <PinkReveal>
            <PinkCtaPanel
              sectionAttrs={sectionGroupAttr("services", "cta")}
              heading={f["pink.services.cta-heading"] ?? ""}
              headingFieldKey="pink.services.cta-heading"
              body={f["pink.services.cta-body"] ?? ""}
              bodyFieldKey="pink.services.cta-body"
              primaryCta={
                f["pink.services.cta-primary-label"]
                  ? {
                      label: f["pink.services.cta-primary-label"] ?? "",
                      href: f["pink.services.cta-primary-link"] ?? "/contact",
                    }
                  : undefined
              }
              secondaryCta={
                f["pink.services.cta-secondary-label"]
                  ? {
                      label: f["pink.services.cta-secondary-label"] ?? "",
                      href: f["pink.services.cta-secondary-link"] ?? "/shop",
                    }
                  : undefined
              }
              images={[
                { src: f["pink.services.cta-image-1"] ?? "", alt: "" },
                { src: f["pink.services.cta-image-2"] ?? "", alt: "" },
              ]}
            />
          </PinkReveal>
        </div>
      )}
    </div>
  );
}
