import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { getListFieldValue } from "~/lib/template-fields";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

import { resolveFields } from "..";
import { PinkFactRows } from "../shared/pink-fact-rows";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkGenericBody } from "./pink-generic-body";
import { PinkGenericSidebarCta } from "./pink-generic-sidebar-cta";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;

const FIELD_KEYS = [
  "pink.global.page-cta-heading",
  "pink.global.page-cta-body",
  "pink.global.page-cta-button",
  "pink.global.page-cta-link",
  "pink.global.page-contact-note",
];

/**
 * `GenericPage` slot for pink — renders ANY CMS `Page` record, not one
 * bespoke page (design.md → "Generic page — generalized from
 * Circles.dc.html"). No template fields of its own; consumes the existing
 * `global.page-facts` (header fact rows) and `global.page-sidebar` (CTA +
 * contact note) groups already defined in `_templates/pink/layout/index.ts`.
 *
 * Structure: dark `PinkPageHeader` (breadcrumb, H1, intro, optional fact
 * rows) → optional 16:7 lead image → a TOC/article grid (client component,
 * see `pink-generic-body.tsx`) → `PlatformPolicyNotice`.
 */
export function PinkGenericPage({ business, page }: { business: Business; page: Page }) {
  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const rawFactRows = getListFieldValue(customFields, "pink.global.page-facts") ?? [];
  const factRows = rawFactRows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r, i) => ({
      _id: typeof r._id === "string" ? r._id : `fact-${i}`,
      label: typeof r.label === "string" ? r.label : "",
      value: typeof r.value === "string" ? r.value : "",
    }))
    .filter((r) => r.label && r.value);
  const showFacts =
    isSectionVisible(customFields, "pink", "global.page-facts") && factRows.length > 0;

  const ctaHeading = (f["pink.global.page-cta-heading"] ?? "").trim();
  const ctaBody = f["pink.global.page-cta-body"] ?? "";
  const ctaButton = (f["pink.global.page-cta-button"] ?? "").trim();
  const ctaLink = f["pink.global.page-cta-link"] ?? "/contact";
  const contactNote = f["pink.global.page-contact-note"] ?? "";
  const showSidebar =
    isSectionVisible(customFields, "pink", "global.page-sidebar") &&
    (ctaHeading.length > 0 || contactNote.trim().length > 0);

  return (
    <div>
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: page.title }]}
        heading={page.title}
        intro={page.excerpt ?? undefined}
        rightSlot={
          showFacts ? (
            <div {...sectionGroupAttr("global", "page-facts")}>
              <PinkFactRows rows={factRows} surface="paper" />
            </div>
          ) : undefined
        }
      />

      {page.image && (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16/7", background: "var(--pink-panel)" }}
        >
          <Image src={page.image} alt="" fill priority className="object-cover" sizes="100vw" />
        </div>
      )}

      <PinkGenericBody
        content={page.content as unknown}
        isPolicy={page.type === "policy"}
        updatedAt={page.updatedAt}
        sidebar={
          showSidebar ? (
            <PinkGenericSidebarCta
              heading={ctaHeading}
              body={ctaBody || undefined}
              buttonLabel={ctaButton || undefined}
              buttonHref={ctaLink}
              contactNote={contactNote || undefined}
            />
          ) : undefined
        }
      />

      <div className="mx-auto max-w-[1400px] px-5 pb-16 md:px-10">
        <PlatformPolicyNotice slug={page.slug} />
      </div>
    </div>
  );
}
