import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  heading: string;
  body?: string;
  buttonLabel?: string;
  buttonHref: string;
  contactNote?: string;
};

/**
 * The `global.page-sidebar` callout box + contact note, consumed (not
 * redefined) from `_templates/pink/layout/index.ts`. Rendered by
 * `pink-generic-page.tsx`, which decides WHERE it lands (inside the TOC
 * column when a TOC exists, or full-width below the article when it
 * doesn't — see `pink-generic-body.tsx`). Server-safe.
 */
export function PinkGenericSidebarCta({
  heading,
  body,
  buttonLabel,
  buttonHref,
  contactNote,
}: Props) {
  return (
    <div className="flex flex-col gap-[2px]" {...sectionGroupAttr("global", "page-sidebar")}>
      {heading && (
        <div className="flex flex-col gap-3 p-6" style={{ background: "var(--pink-panel)" }}>
          <p
            className="pink-display"
            style={{ fontSize: "19px", fontWeight: 600, letterSpacing: "-0.01em" }}
            {...fieldAttr("pink.global.page-cta-heading")}
          >
            {heading}
          </p>
          {body && (
            <p
              className="text-[14px] leading-[1.7]"
              style={{ color: "var(--pink-muted)" }}
              {...fieldAttr("pink.global.page-cta-body")}
            >
              {body}
            </p>
          )}
          {buttonLabel && (
            <Link
              href={buttonHref}
              className="pink-btn pink-btn-solid mt-1 w-fit"
              {...fieldAttr("pink.global.page-cta-button")}
            >
              {buttonLabel}
            </Link>
          )}
        </div>
      )}
      {contactNote && (
        <p
          className="p-6 text-[13px] leading-[1.6]"
          style={{ background: "var(--pink-panel)", color: "var(--pink-subtle)" }}
          {...fieldAttr("pink.global.page-contact-note")}
        >
          {contactNote}
        </p>
      )}
    </div>
  );
}
