import Image from "next/image";

import type { DefaultAboutPageTemplateProps } from "../../types";

import { resolveFields } from "..";

export function ElegantAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "elegant.about.hero-image",
    "elegant.about.hero-title",
    "elegant.about.hero-subtitle",
    "elegant.about.story-heading",
    "elegant.about.story-body",
    "elegant.about.story-image",
    "elegant.about.mission",
    "elegant.about.vision",
  ]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-secondary/30 relative flex min-h-[50vh] items-center justify-center overflow-hidden">
        {(f["elegant.about.hero-image"] ?? "") && (
          <Image
            src={f["elegant.about.hero-image"] ?? ""}
            alt={f["elegant.about.hero-title"] ?? "About"}
            fill
            className="object-cover opacity-20"
            priority
            sizes="100vw"
          />
        )}
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-muted-foreground mb-3 text-sm tracking-widest uppercase">
            Our Story
          </p>
          <h1 className="text-foreground font-serif text-4xl font-light tracking-wide md:text-5xl">
            {f["elegant.about.hero-title"] ?? business.name}
          </h1>
          {(f["elegant.about.hero-subtitle"] ?? "") && (
            <p className="text-muted-foreground mt-4 text-lg">
              {f["elegant.about.hero-subtitle"]}
            </p>
          )}
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="mb-6 font-serif text-3xl font-light tracking-wide">
              {f["elegant.about.story-heading"] ?? "About Us"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {f["elegant.about.story-body"] ??
                `Welcome to ${business.name}. We are committed to providing you with exceptional quality products and an outstanding shopping experience.`}
            </p>
          </div>
          {(f["elegant.about.story-image"] ?? "") && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
              <Image
                src={f["elegant.about.story-image"] ?? ""}
                alt="Our story"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>
      </section>

      {/* Mission & Vision */}
      {(f["elegant.about.mission"] ?? f["elegant.about.vision"]) && (
        <section className="bg-secondary/20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2">
              {(f["elegant.about.mission"] ?? "") && (
                <div className="border-border border-l-2 pl-6">
                  <h3 className="mb-3 font-serif text-xl font-light tracking-wide">
                    Our Mission
                  </h3>
                  <p className="text-muted-foreground">
                    {f["elegant.about.mission"]}
                  </p>
                </div>
              )}
              {(f["elegant.about.vision"] ?? "") && (
                <div className="border-border border-l-2 pl-6">
                  <h3 className="mb-3 font-serif text-xl font-light tracking-wide">
                    Our Vision
                  </h3>
                  <p className="text-muted-foreground">
                    {f["elegant.about.vision"]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
