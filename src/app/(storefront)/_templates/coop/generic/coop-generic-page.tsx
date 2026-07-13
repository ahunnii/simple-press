import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { getListFieldValue } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import {
  heightClassForStackA,
  parseStackAPhotos,
  parseStackBPhotos,
  stackBAssetFor,
} from "./coop-gallery-data";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;

const GALLERY_FIELD_KEYS = [
  "coop.global.gallery.slug",
  "coop.gallery.intro-label",
  "coop.gallery.outro-text",
  "coop.gallery.cta-text",
  "coop.gallery.cta-href",
];

/**
 * `GenericPage` slot for coop — DUAL MODE, per design.md's "Generic page"
 * sections:
 *
 *  - Gallery mode: `page.slug` matches the configured
 *    `coop.global.gallery.slug` field (default "project-gallery-page") —
 *    renders the clone's `project-gallery-page/page.tsx` verbatim (intro +
 *    12-photo stack + 4-photo stack + outro/CTA).
 *  - CMS mode: any other slug — renders the CMS `Page` record's own
 *    title/richtext content (extrapolated, no clone material — approved in
 *    intake per design.md).
 *
 * Server component — neither mode needs client state (no TOC, no
 * interactivity; `TiptapRenderer` is itself a client component and renders
 * fine as a child of a server component).
 */
export function CoopGenericPage({
  business,
  page,
}: {
  business: Business;
  page: Page;
}) {
  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, GALLERY_FIELD_KEYS);

  const gallerySlug = f["coop.global.gallery.slug"] ?? "project-gallery-page";
  const isGalleryMode = page.slug === gallerySlug;

  if (isGalleryMode) {
    return <CoopGalleryPage page={page} customFields={customFields} f={f} />;
  }

  return <CoopCmsPage page={page} />;
}

// ─── Mode 1: Project Gallery Page ──────────────────────────────────────────

function CoopGalleryPage({
  page,
  customFields,
  f,
}: {
  page: Page;
  customFields: unknown;
  f: Record<string, string>;
}) {
  const introLabel = f["coop.gallery.intro-label"] ?? "PROJECT Photos";
  const outroText =
    f["coop.gallery.outro-text"] ??
    "Building Cooperatively is a worker-owned cooperative specializing in historic restoration and construction. We restore historic hardware, trim, flooring, doors, cabinetry, window repair, tiling, and many forms of rough and finish carpentry. We do exteriors, wood siding, paint, lot beautification, water catchment systems, and hoop houses for your farm or garden.";
  const ctaText =
    f["coop.gallery.cta-text"] ??
    "Contact  us  to  schedule  your  next  restoration  or  workshop";
  const ctaHref = f["coop.gallery.cta-href"] ?? "/contact";

  const stackA = parseStackAPhotos(
    getListFieldValue(customFields, "coop.gallery.photos-a"),
  );
  const stackB = parseStackBPhotos(
    getListFieldValue(customFields, "coop.gallery.photos-b"),
  );

  const showStackA = isSectionVisible(
    customFields,
    "coop",
    "global.gallery-photos-a",
  );
  const showStackB = isSectionVisible(
    customFields,
    "coop",
    "global.gallery-photos-b",
  );
  const showOutro = isSectionVisible(
    customFields,
    "coop",
    "global.gallery-outro",
  );

  return (
    <div className="coop-surface-page min-h-screen">
      {/* The clone's gallery page has no visible <h1> (only Agdasima h3
          labels + an empty spacer h2) — an sr-only h1 satisfies the
          one-h1-per-page rule without touching the pixel-exact layout. */}
      <h1 className="sr-only">{page.title}</h1>

      <section className="max-coop-md:px-5 max-coop-md:py-15 coop-md:max-coop-lg:px-9 coop-md:max-coop-lg:py-30 mx-auto block max-w-425 px-[10.9375rem] py-[7.8125rem]">
        {/* Merged clone n36/n37/n38: the clone floats a single full-width
            child inside an explicit-height clearfix wrapper (a legacy
            CMS-generated height hack pinned to the default 16 photos'
            total height). With only one floated child and nothing beside
            it, float-left is a no-op for layout — dropping it in favor of
            plain block flow renders identically for the shipped defaults
            AND stays correct if the owner adds/removes gallery rows
            (unlike the hardcoded px height, which would not). See
            docs/templates/coop/build/reports/D-phase3.md. */}
        <div className="-mx-[1.0625rem] block">
          {/* ── Gallery intro ─────────────────────────────────────────── */}
          <div {...sectionGroupAttr("global", "gallery-intro")}>
            <div className="max-coop-md:w-[23.0625rem] max-coop-md:mx-0 max-coop-md:pt-[1.0625rem] coop-md:max-coop-lg:w-[608.3px] coop-md:max-coop-lg:mx-[3.8rem] coop-2xl:w-[57.6625rem] coop-2xl:mx-[230.7px] relative clear-both mx-[160.7px] block w-[40.1625rem] px-[1.0625rem] pb-[1.0625rem]">
              {/* box-content kept here (and ONLY here in this file, per
                  Phase 3.5 review) — this is the one element in the whole
                  page that combines an own explicit height (h-[32.3px])
                  with its own padding (pb-[0.7px]/pb-[0.025rem]/pb-px),
                  where content-box vs. border-box actually changes the
                  rendered box. Every other box-content occurrence Phase 3
                  transcribed had no such combo (own w/h with no own
                  padding/border, or own padding/border with no own w/h) and
                  was a pure no-op, so it was dropped to match the
                  template-wide box-content-drop convention documented in
                  coop-contact-page.tsx / coop-homepage.tsx. */}
              <div className="max-coop-md:pb-[0.025rem] coop-2xl:pb-px invisible relative box-content block h-[32.3px] pb-[0.7px]" />
            </div>
            <div className="max-coop-md:w-[23.0625rem] max-coop-md:mx-0 coop-md:max-coop-lg:w-[608.3px] coop-md:max-coop-lg:mx-[3.8rem] coop-2xl:w-[57.6625rem] coop-2xl:mx-[230.7px] relative mx-[160.7px] block w-[40.1625rem] p-[1.0625rem]">
              <div className="block">
                <div className="block">
                  <h3
                    className="mb-3.5 block text-center [font-family:var(--font-coop-label)] text-sm tracking-[0.42px] whitespace-pre-wrap text-[var(--coop-color-002)] uppercase"
                    {...fieldAttr("coop.gallery.intro-label")}
                  >
                    {introLabel}
                  </h3>
                  {/* Empty on purpose — the clone's own heading, kept for
                      its vertical spacing only (see design.md). */}
                  <h2
                    aria-hidden="true"
                    className="max-coop-md:text-[1.75rem] max-coop-md:leading-7 max-coop-md:tracking-[-0.01px] mt-[0.9375rem] block text-center [font-family:var(--font-coop-heading)] text-[2.4375rem] leading-[2.4375rem] tracking-[-0.78px] whitespace-pre-wrap text-[var(--coop-color-003)] before:inline-block before:h-0 before:w-0 before:content-['']"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Photo stack A — 12 full-width stacked photos ────────────── */}
          {showStackA && stackA.length > 0 && (
            <div
              className="relative clear-both block p-[1.0625rem]"
              {...sectionGroupAttr("global", "gallery-photos-a")}
            >
              <div className="block">
                <div className="block after:block after:h-0 after:w-full after:text-[0rem] after:leading-[2rem] after:tracking-[0.19px] after:text-[var(--coop-foreground)] after:content-['.']">
                  <div className="block">
                    {stackA.map((photo, i) => (
                      <div key={i} className="mb-px block leading-px">
                        <img
                          className={cn(
                            "max-coop-md:w-[20.9375rem] coop-md:max-coop-lg:w-174 coop-2xl:w-337.5 inline w-232.5 overflow-clip",
                            heightClassForStackA(i),
                          )}
                          alt={photo.alt}
                          src={photo.image}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Photo stack B — 4 large-format aspect-ratio'd photos ────── */}
          {showStackB && stackB.length > 0 && (
            <div {...sectionGroupAttr("global", "gallery-photos-b")}>
              {stackB.map((photo, i) => {
                const asset = stackBAssetFor(photo, i);
                return (
                  <div
                    key={i}
                    className="relative clear-both block p-[1.0625rem]"
                  >
                    <div className="block">
                      <div className="block">
                        <figure className={cn("block", asset.className)}>
                          <div className="relative block overflow-hidden text-center leading-0">
                            <div
                              className={cn(
                                "relative block overflow-hidden",
                                asset.className2,
                              )}
                              style={{
                                maskImage:
                                  "-webkit-radial-gradient(center, var(--coop-background), var(--coop-clr-1))",
                              }}
                            >
                              <img
                                className={cn(
                                  "absolute top-0 left-0 block h-full w-full overflow-clip object-cover",
                                  asset.className3,
                                )}
                                alt={photo.alt}
                                height={asset.height}
                                sizes="(max-width: 640px) 100vw, (max-width: 767px) 100vw, 100vw"
                                src={photo.image}
                                srcSet={asset.srcSetToUse}
                                width={asset.width}
                              />
                            </div>
                          </div>
                        </figure>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Gallery outro ────────────────────────────────────────────── */}
          {showOutro && (
            <div
              className="max-coop-md:w-[23.0625rem] max-coop-md:mx-0 coop-md:max-coop-lg:w-[608.3px] coop-md:max-coop-lg:mx-[3.8rem] coop-2xl:w-[57.6625rem] coop-2xl:mx-[230.7px] relative mx-[160.7px] block w-[40.1625rem] p-[1.0625rem]"
              {...sectionGroupAttr("global", "gallery-outro")}
            >
              <div className="block">
                <div className="block">
                  <h3 className="mb-3.5 block text-center [font-family:var(--font-coop-label)] text-sm tracking-[0.42px] whitespace-pre-wrap text-[var(--coop-color-002)] uppercase">
                    <strong
                      className="inline font-bold [overflow-wrap:break-word]"
                      {...fieldAttr("coop.gallery.outro-text")}
                    >
                      {outroText}
                    </strong>
                    <br className="inline [overflow-wrap:break-word]" />
                  </h3>
                  <h2 className="max-coop-md:mb-[1.45rem] max-coop-md:h-[5.4375rem] max-coop-md:text-[1.75rem] max-coop-md:leading-7 max-coop-md:tracking-[-0.01px] mt-[0.9375rem] mb-[2.025rem] block h-20 text-center [font-family:var(--font-coop-heading)] text-[2.4375rem] leading-[2.4375rem] tracking-[-0.78px] whitespace-pre-wrap text-[var(--coop-color-003)]">
                    {/* target="_blank" dropped — the clone points this at
                        its own internal /schedule-appointment (contact)
                        page; opening an internal link in a new tab was a
                        clone artifact, not a deliberate UX choice. See
                        docs/templates/coop/build/reports/D-phase3.md. */}
                    <a
                      href={ctaHref}
                      className="coop-underline-cta max-coop-md:pb-[0.0875rem] inline cursor-pointer border-b border-solid border-b-[var(--coop-clr-3)] pb-0.5 [overflow-wrap:break-word]"
                    >
                      <strong
                        className="inline h-full font-bold"
                        {...fieldAttr("coop.gallery.cta-text")}
                      >
                        {ctaText}
                      </strong>
                    </a>
                  </h2>
                  <h3 className="mt-[0.9375rem] block text-center [font-family:var(--font-coop-label)] text-sm tracking-[0.42px] whitespace-pre-wrap text-[var(--coop-color-002)] uppercase">
                    <br className="inline [overflow-wrap:break-word]" />
                  </h3>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Mode 2: CMS page ───────────────────────────────────────────────────────

/**
 * No clone material for this mode (extrapolated per design.md, approved in
 * intake) — renders the CMS `Page` record's own title + richtext in the
 * coop type system: futura-pt display heading, minion-pro body (inherited
 * from the `.coop` base rule), Agdasima-scale labels for any h3s inside the
 * richtext. Uses `prose-*` Tailwind Typography modifiers only — no new
 * globals.css rule needed (the `.coop` token block already supplies every
 * color/font var these modifiers reference).
 */
function CoopCmsPage({ page }: { page: Page }) {
  return (
    <div className="coop-surface-page min-h-screen">
      <section className="max-coop-md:w-[23.0625rem] max-coop-md:py-15 coop-md:max-coop-lg:w-[608.3px] coop-md:max-coop-lg:py-30 coop-2xl:w-[57.6625rem] mx-auto block w-[40.1625rem] max-w-full px-[1.0625rem] py-[7.8125rem]">
        <h1 className="max-coop-md:text-[1.75rem] max-coop-md:leading-7 max-coop-md:tracking-[-0.01px] text-center [font-family:var(--font-coop-heading)] text-[2.4375rem] leading-[2.4375rem] tracking-[-0.78px] text-[var(--coop-color-003)]">
          {page.title}
        </h1>

        <div className="mt-[2.025rem]">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={cn(
              "prose w-full max-w-none",
              "prose-headings:[font-family:var(--font-coop-heading)] prose-headings:text-[var(--coop-color-003)] prose-headings:tracking-[-0.02em]",
              "prose-h2:text-[1.75rem] prose-h2:mt-10 prose-h2:mb-4",
              "prose-h3:text-[1.25rem] prose-h3:mt-8 prose-h3:mb-3 prose-h3:[font-family:var(--font-coop-label)] prose-h3:tracking-[0.42px] prose-h3:uppercase",
              "prose-p:[font-family:var(--font-coop-body)] prose-p:text-[19px] prose-p:leading-[32.3px] prose-p:tracking-[0.19px] prose-p:text-[var(--coop-foreground)]",
              "prose-li:text-[19px] prose-li:leading-[32.3px] prose-li:text-[var(--coop-foreground)]",
              "prose-a:text-[var(--coop-foreground)] prose-a:underline prose-a:decoration-[var(--coop-clr-3)] prose-a:underline-offset-2",
              "prose-strong:text-[var(--coop-color-003)] prose-strong:font-bold",
              "prose-blockquote:text-[var(--coop-foreground)] prose-blockquote:border-[var(--coop-clr-3)]",
              "prose-hr:border-[var(--coop-clr-3)]",
            )}
          />
        </div>

        <PlatformPolicyNotice slug={page.slug} />
      </section>
    </div>
  );
}
