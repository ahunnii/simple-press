import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateTextListRows,
} from "~/lib/template-fields";

import { DEFAULT_MODERN_ABOUT_VALUES } from ".";
import { resolveFields } from "..";
import { ModernGeneralLayout } from "../layout/modern-general-layout";

export function ModernAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "modern.about.mission-tagline",
    "modern.about.mission-header",
    "modern.about.mission-description",
    "modern.about.mission-image",

    "modern.about.values-tagline",
    "modern.about.values-header",

    "modern.about.story-tagline",
    "modern.about.story-header",
    "modern.about.story-description",
    "modern.about.story-image",

    "modern.about.cta-header",
    "modern.about.cta-description",
    "modern.about.cta-button-text",
    "modern.about.cta-button-link",

    "modern.about.main-tagline",
    "modern.about.main-title",
  ]);

  const valuesList = parseTemplateTextListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "modern.about.values-list",
    ),
    DEFAULT_MODERN_ABOUT_VALUES,
  );

  return (
    <ModernGeneralLayout
      title={f["modern.about.main-title"]}
      subtitle={f["modern.about.main-tagline"]}
      sectionAttrs={sectionGroupAttr("about", "main")}
    >
      {/* Mission */}
      <section
        className="bg-background py-20"
        {...sectionGroupAttr("about", "mission")}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="relative aspect-4/3 overflow-hidden rounded-sm">
              <Image
                src={f["modern.about.mission-image"]!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {f["modern.about.mission-tagline"]}
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl text-balance md:text-4xl">
                {f["modern.about.mission-header"]}
              </h2>
              <p className="text-muted-foreground mt-6 leading-relaxed whitespace-pre-line">
                {f["modern.about.mission-description"]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section
        className="bg-secondary py-20"
        {...sectionGroupAttr("about", "values")}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {f["modern.about.values-tagline"]}
            </p>
            <h2 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
              {f["modern.about.values-header"]}
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {valuesList?.map((value, index) => (
              <div className="text-center" key={index}>
                <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-primary font-serif text-lg">
                    {index + 1}
                  </span>
                </div>
                <h3 className="text-foreground mt-6 text-sm font-semibold tracking-widest uppercase">
                  {value.title}
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / Story Section */}
      <section
        className="bg-background py-20"
        {...sectionGroupAttr("about", "story")}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="relative aspect-4/3 overflow-hidden rounded-sm">
              <Image
                src={f["modern.about.story-image"] ?? "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {f["modern.about.story-tagline"]}
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl text-balance md:text-4xl">
                {f["modern.about.story-header"]}
              </h2>
              <p className="text-muted-foreground mt-6 leading-relaxed whitespace-pre-line">
                {f["modern.about.story-description"]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="bg-primary py-20"
        {...sectionGroupAttr("about", "cta")}
      >
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <h2 className="text-primary-foreground font-serif text-3xl md:text-4xl">
            {f["modern.about.cta-header"]}
          </h2>
          <p className="text-primary-foreground/70 mx-auto mt-4 max-w-md text-sm">
            {f["modern.about.cta-description"]}
          </p>
          <Link
            href={f["modern.about.cta-button-link"]!}
            className="bg-primary-foreground text-primary mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
          >
            {f["modern.about.cta-button-text"]}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </ModernGeneralLayout>
  );
}
