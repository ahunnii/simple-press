import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultAboutPageTemplateProps } from "../types";

import { resolveFields } from ".";
import { ModernGeneralLayout } from "./modern-general-layout";

export function ModernAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "modern.about.mission-header",
    "modern.about.mission-description",
    "modern.about.values-subheader",
    "modern.about.values-header",
    "modern.about.value-1-title",
    "modern.about.value-1-description",
    "modern.about.value-2-title",
    "modern.about.value-2-description",
    "modern.about.value-3-title",
    "modern.about.value-3-description",
    "modern.about.story-subheader",
    "modern.about.story-header",
    "modern.about.story-paragraph-1",
    "modern.about.story-paragraph-2",
    "modern.about.first-image",
    "modern.about.cta-header",
    "modern.about.cta-text",
    "modern.about.cta-button-text",
    "modern.about.cta-button-link",
  ]);

  return (
    <ModernGeneralLayout title="About Us" subtitle="Our Story">
      {/* Mission */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-foreground font-serif text-3xl text-balance md:text-4xl">
              {f["modern.about.mission-header"]}
            </h2>
            <p className="text-muted-foreground mt-6 leading-relaxed">
              {f["modern.about.mission-description"]}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {f["modern.about.values-subheader"]}
            </p>
            <h2 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
              {f["modern.about.values-header"]}
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="bg-accent/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <span className="text-accent font-serif text-lg">01</span>
              </div>
              <h3 className="text-foreground mt-6 text-sm font-semibold tracking-widest uppercase">
                {f["modern.about.value-1-title"]}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {f["modern.about.value-1-description"]}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <span className="text-accent font-serif text-lg">02</span>
              </div>
              <h3 className="text-foreground mt-6 text-sm font-semibold tracking-widest uppercase">
                {f["modern.about.value-2-title"]}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {f["modern.about.value-2-description"]}
              </p>
            </div>
            <div className="text-center">
              <div className="bg-accent/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <span className="text-accent font-serif text-lg">03</span>
              </div>
              <h3 className="text-foreground mt-6 text-sm font-semibold tracking-widest uppercase">
                {f["modern.about.value-3-title"]}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {f["modern.about.value-3-description"]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team / Story Section */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="relative aspect-4/3 overflow-hidden rounded-sm">
              <Image
                src={f["modern.about.first-image"] ?? "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {f["modern.about.story-subheader"]}
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl text-balance md:text-4xl">
                {f["modern.about.story-header"]}
              </h2>
              <p className="text-muted-foreground mt-6 leading-relaxed">
                {f["modern.about.story-paragraph-1"]}
              </p>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                {f["modern.about.story-paragraph-2"]}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <h2 className="text-primary-foreground font-serif text-3xl md:text-4xl">
            {f["modern.about.cta-header"]}
          </h2>
          <p className="text-primary-foreground/70 mx-auto mt-4 max-w-md text-sm">
            {f["modern.about.cta-text"]}
          </p>
          <Link
            href={f["modern.about.cta-button-link"] ?? "/shop"}
            className="bg-primary-foreground text-primary mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
          >
            {f["modern.about.cta-button-text"]}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </ModernGeneralLayout>
  );
}
