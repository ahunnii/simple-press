import type { DefaultBlogPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { WealthLink } from "../shared/wealth-link";
import { WealthSection } from "../shared/wealth-section";
import { WealthBlogClient } from "./wealth-blog-client";

type Props = {
  pages: DefaultBlogPageTemplateProps["pages"];
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

export function WealthBlogPage({ pages, business, customFields }: Props) {
  const fields = customFields ?? business.siteContent?.customFields;

  const f = resolveFields(fields, [
    "wealth.blog.heading",
    "wealth.blog.intro",
    "wealth.blog.empty-heading",
    "wealth.blog.empty-body",
    "wealth.blog.empty-cta-label",
  ]);

  const heading = (f["wealth.blog.heading"] ?? "").trim() || "News + Notes";
  const intro = (f["wealth.blog.intro"] ?? "").trim();
  const emptyHeading =
    (f["wealth.blog.empty-heading"] ?? "").trim() || "No posts yet.";
  const emptyBody =
    (f["wealth.blog.empty-body"] ?? "").trim() ||
    "Meanwhile, find DCWF in the news on our homepage.";

  return (
    <WealthSection sectionAttrs={sectionGroupAttr("blog", "index")}>
      <div className="text-center" style={{ marginBottom: "calc(var(--wealth-rhythm) * 2)" }}>
        {/* `WealthH1` doesn't forward unknown props to its underlying `<h1>`
            (it destructures only `children`/`className`/`id`), so spreading
            `fieldAttr` onto it silently drops the `data-sp-field` attribute
            and breaks live-text patching in the editor. Rendered as a plain
            `<h1 className="wealth-h1">` instead — visually identical, since
            that's exactly what `WealthH1` renders under the hood — without
            touching the shared component (out of this agent's scope). */}
        <h1 className="wealth-h1" {...fieldAttr("wealth.blog.heading")}>
          {heading}
        </h1>
        {intro && (
          <p
            {...fieldAttr("wealth.blog.intro")}
            style={{
              fontFamily: "var(--font-wealth-body)",
              fontSize: 17,
              lineHeight: "25.5px",
              color: "var(--wealth-muted)",
              maxWidth: 620,
              margin: "20px auto 0",
            }}
          >
            {intro}
          </p>
        )}
      </div>

      {pages.length === 0 ? (
        <div className="text-center" style={{ padding: "calc(var(--wealth-rhythm) * 2) 0" }}>
          <p
            {...fieldAttr("wealth.blog.empty-heading")}
            style={{
              fontFamily: "var(--font-wealth-sub)",
              fontStyle: "italic",
              fontSize: 24,
              lineHeight: 1.4,
              color: "var(--wealth-ink)",
              margin: "0 0 12px",
            }}
          >
            {emptyHeading}
          </p>
          <p
            {...fieldAttr("wealth.blog.empty-body")}
            style={{
              fontFamily: "var(--font-wealth-body)",
              fontSize: 16,
              color: "var(--wealth-muted)",
              margin: "0 0 24px",
            }}
          >
            {emptyBody}
          </p>
          <WealthLink href="/">
            <span {...fieldAttr("wealth.blog.empty-cta-label")}>
              {(f["wealth.blog.empty-cta-label"] ?? "").trim() ||
                "Back to the homepage"}
            </span>
          </WealthLink>
        </div>
      ) : (
        <WealthBlogClient pages={pages} />
      )}
    </WealthSection>
  );
}
