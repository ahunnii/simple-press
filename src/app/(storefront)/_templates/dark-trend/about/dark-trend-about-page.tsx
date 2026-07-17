import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateTextListRows,
} from "~/lib/template-fields";
import { Button } from "~/components/ui/button";

import { DEFAULT_DARK_TREND_FEATURES } from ".";
import { resolveFields } from "..";
import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";

export function DarkTrendAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "dark-trend.about.first-image",
    "dark-trend.about.second-image",
    "dark-trend.about.header",
    "dark-trend.about.subheader",
    "dark-trend.about.button",
    "dark-trend.about.button-link",

    "dark-trend.about.cta-header",
    "dark-trend.about.cta-description",
    "dark-trend.about.cta-button-text",
    "dark-trend.about.cta-button-link",
  ]);

  const featuresList = parseTemplateTextListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "dark-trend.about.features-list",
    ),
    DEFAULT_DARK_TREND_FEATURES,
  );

  return (
    <DarkTrendGeneralLayout title="About Us">
      {/* Features Section */}
      <section
        className="mb-32 py-20"
        {...sectionGroupAttr("about", "features")}
      >
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* N-2: decorative owner-configurable image → alt="" */}
          <div className="relative aspect-square overflow-hidden rounded-sm bg-linear-to-br from-purple-600 to-blue-500">
            <Image
              src={f["dark-trend.about.first-image"]!}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Content */}
          <div className="space-y-8">
            <div>
              {/* S-11: text-purple-500 → text-purple-400 for small text */}
              <span
                className="text-sm font-semibold tracking-wider text-purple-400 uppercase"
                {...fieldAttr("dark-trend.about.subheader")}
              >
                {f["dark-trend.about.subheader"]}
              </span>
              <h2
                className="mt-2 text-3xl font-bold text-white md:text-5xl"
                {...fieldAttr("dark-trend.about.header")}
              >
                {f["dark-trend.about.header"]}
              </h2>
            </div>

            {/* Feature List */}
            <div className="space-y-6">
              {featuresList?.map((feature, index) => (
                <div className="flex gap-4" key={index}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                    {/* S-11: text-purple-500 → text-purple-400 for small text */}
                    <span className="text-xl font-bold text-purple-400">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {feature?.title}
                    </h3>
                    <p className="text-white/70">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* S-11: violet-600 */}
            <Button
              asChild
              className="bg-violet-600 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-700"
            >
              <Link
                href={f["dark-trend.about.button-link"]!}
                {...fieldAttr("dark-trend.about.button")}
              >
                {f["dark-trend.about.button"]}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Custom Section */}
      {isSectionVisible(
        business?.siteContent?.customFields,
        "dark-trend",
        "about.cta",
      ) && (
        <section
          className="mb-20 py-20"
          {...sectionGroupAttr("about", "cta")}
        >
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Content */}
            <div className="space-y-6">
              <h2
                className="text-4xl font-bold text-white md:text-6xl"
                {...fieldAttr("dark-trend.about.cta-header")}
              >
                {f["dark-trend.about.cta-header"]}
              </h2>
              <p
                className="text-lg text-white/70"
                {...fieldAttr("dark-trend.about.cta-description")}
              >
                {f["dark-trend.about.cta-description"]}
              </p>
              {/* S-11: violet-600 */}
              <Button
                asChild
                className="bg-violet-600 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-700"
              >
                <Link
                  href={f["dark-trend.about.cta-button-link"]!}
                  {...fieldAttr("dark-trend.about.cta-button-text")}
                >
                  {f["dark-trend.about.cta-button-text"]}
                </Link>
              </Button>
            </div>

            {/* N-2: decorative owner-configurable image → alt="" */}
            <div className="relative aspect-4/5 overflow-hidden rounded-sm bg-zinc-900">
              <Image
                src={f["dark-trend.about.second-image"]!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>
      )}
    </DarkTrendGeneralLayout>
  );
}
