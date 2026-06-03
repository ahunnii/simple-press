import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { DEFAULT_MODERN_VALUES_LIST } from ".";
import { resolveFields } from "..";
import { FeaturedProductsGrid } from "./modern-featured-products-grid";

export async function ModernHomePage() {
  const homepage = await api.business.getHomepage();
  const f = resolveFields(homepage?.siteContent?.customFields, [
    "modern.homepage.hero-image",
    "modern.homepage.hero-title",
    "modern.homepage.hero-subtitle",
    "modern.homepage.hero-cta-button-text",
    "modern.homepage.hero-cta-button-link",

    "modern.homepage.products-title",
    "modern.homepage.products-tagline",
    "modern.homepage.products-link-text",
    "modern.homepage.products-link-url",

    "modern.homepage.about-header",
    "modern.homepage.about-tagline",
    "modern.homepage.about-text",
    "modern.homepage.about-image",
    "modern.homepage.about-cta-button-text",
    "modern.homepage.about-cta-button-link",
  ]);

  const valuesList = parseTemplateListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "modern.homepage.values-list",
    ),
  ) as {
    title: string;
    description: string;
  }[];
  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        {...sectionGroupAttr("homepage", "hero")}
      >
        <div className="relative h-[85vh] min-h-[600px]">
          <Image
            src={f["modern.homepage.hero-image"]!}
            alt={homepage?.name ?? "Hero Image"}
            fill
            className="object-cover"
            priority
          />
          <div className="bg-foreground/30 absolute inset-0" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
              <div className="max-w-xl">
                <h1 className="text-background font-serif text-5xl leading-tight text-balance md:text-7xl md:leading-tight">
                  {f["modern.homepage.hero-title"]}
                </h1>
                <p className="text-background/80 mt-6 text-lg leading-relaxed">
                  {f["modern.homepage.hero-subtitle"]}
                </p>
                <Link
                  href={f["modern.homepage.hero-cta-button-link"]!}
                  className="bg-background text-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
                >
                  {f["modern.homepage.hero-cta-button-text"]}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Strip */}
      <section
        className="border-border bg-background border-b"
        {...sectionGroupAttr("homepage", "features")}
      >
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {(valuesList?.length ?? 0) > 0
              ? valuesList.map((value) => (
                  <div className="text-center" key={value.title}>
                    <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {value.description}
                    </p>
                  </div>
                ))
              : DEFAULT_MODERN_VALUES_LIST.map((value, index) => (
                  <div className="text-center" key={index}>
                    <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {value.description}
                    </p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section
        className="bg-background py-20"
        {...sectionGroupAttr("homepage", "products")}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {f["modern.homepage.products-tagline"]}
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
                {f["modern.homepage.products-title"]}
              </h2>
            </div>
            <Link
              href={f["modern.homepage.products-link-url"]!}
              className="text-foreground hover:text-muted-foreground hidden items-center gap-1 text-sm font-medium transition-colors md:flex"
            >
              {f["modern.homepage.products-link-text"]}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12">
            <FeaturedProductsGrid />
          </div>
          <div className="mt-8 text-center md:hidden">
            <Link
              href={f["modern.homepage.products-link-url"]!}
              className="text-foreground inline-flex items-center gap-1 text-sm font-medium"
            >
              {f["modern.homepage.products-link-text"]}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Collection CTA */}
      <section className="bg-secondary" {...sectionGroupAttr("homepage", "about")}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {f["modern.homepage.about-tagline"]}
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl text-balance md:text-4xl">
                {f["modern.homepage.about-header"]}
              </h2>
              <p className="text-muted-foreground mt-6 leading-relaxed whitespace-pre-line">
                {f["modern.homepage.about-text"]}
              </p>
              <Link
                href={f["modern.homepage.about-cta-button-link"]!}
                className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-8 inline-flex items-center gap-2 border px-8 py-3 text-sm font-medium tracking-wide transition-colors"
              >
                {f["modern.homepage.about-cta-button-text"]}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-4/3 overflow-hidden rounded-sm">
              <Image
                src={f["modern.homepage.about-image"]!}
                alt={homepage?.name ?? "About Image"}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
