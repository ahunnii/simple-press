import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";

export async function PollenAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "pollen.about.title",
    "pollen.about.text",
    "pollen.about.image",
    "pollen.about.owner-subheader",
    "pollen.about.owner-heading",
    "pollen.about.owner-name",
    "pollen.about.owner-role",
    "pollen.about.owner-image",
    "pollen.about.owner-blurb",
  ]);

  const testimonials = (await api.testimonial.listRandom({ limit: 3 })) ?? [];

  return (
    <PollenGeneralLayout
      business={business}
      title="About Us"
      subtitle="Our Story"
    >
      <section className="py-20" {...sectionGroupAttr("about", "main")}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeIn direction="right">
              <h2
                className="mb-6 text-4xl font-bold text-[#374151] md:text-5xl"
                {...fieldAttr("pollen.about.title")}
              >
                {f["pollen.about.title"]}
              </h2>
              <div className="space-y-6 leading-relaxed text-[#4b5563]">
                <p
                  className="whitespace-pre-line"
                  {...fieldAttr("pollen.about.text")}
                >
                  {f["pollen.about.text"]}
                </p>
              </div>
            </FadeIn>
            <FadeIn
              direction="left"
              delay={0.15}
              className="relative aspect-3/4 overflow-hidden rounded-2xl"
            >
              <Image
                src={f["pollen.about.image"]!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Owner Section — Bamboo-style two-column image + blurb */}
      <section
        className="bg-white py-20"
        {...sectionGroupAttr("about", "owner")}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeIn direction="right" className="flex-1">
              <div className="relative aspect-3/4 overflow-hidden rounded-2xl">
                <Image
                  src={f["pollen.about.owner-image"] ?? "/placeholder.svg"}
                  alt={f["pollen.about.owner-name"] ?? "Owner"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn direction="left" delay={0.1} className="flex-1">
              {f["pollen.about.owner-subheader"] && (
                <p
                  className="mb-4 text-sm font-semibold tracking-wider text-[#5e7747] uppercase"
                  {...fieldAttr("pollen.about.owner-subheader")}
                >
                  {f["pollen.about.owner-subheader"]}
                </p>
              )}
              <h2
                className="mb-6 text-3xl font-bold text-[#374151] md:text-4xl"
                {...fieldAttr("pollen.about.owner-heading")}
              >
                {f["pollen.about.owner-heading"]}
              </h2>
              {f["pollen.about.owner-name"] && (
                <h3
                  className="text-xl font-semibold text-[#374151]"
                  {...fieldAttr("pollen.about.owner-name")}
                >
                  {f["pollen.about.owner-name"]}
                </h3>
              )}
              {f["pollen.about.owner-role"] && (
                <p
                  className="mb-6 text-sm font-medium tracking-wider text-[#5e7747] uppercase"
                  {...fieldAttr("pollen.about.owner-role")}
                >
                  {f["pollen.about.owner-role"]}
                </p>
              )}
              {f["pollen.about.owner-blurb"] ? (
                <div className="space-y-4 leading-relaxed text-[#4b5563]">
                  <p
                    className="whitespace-pre-line"
                    {...fieldAttr("pollen.about.owner-blurb")}
                  >
                    {f["pollen.about.owner-blurb"]}
                  </p>
                </div>
              ) : (
                <p className="leading-relaxed text-[#4b5563]">
                  Add a short bio in the Owner section of your About page
                  content.
                </p>
              )}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Testimonials Section — only when business has public testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-gray-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn direction="up">
              <div className="mb-12 text-center">
                <p className="mb-4 text-sm font-semibold tracking-wider text-[#5e7747] uppercase">
                  Kind Words
                </p>
                <h2 className="text-3xl font-bold text-[#374151] md:text-4xl">
                  What Our Customers Say
                </h2>
              </div>
            </FadeIn>

            <StaggerContainer className="grid gap-8 md:grid-cols-3">
              {testimonials.map((t) => (
                <StaggerItem key={t.id}>
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <p className="mb-4 text-gray-700">{t.text}</p>
                    <p className="font-medium text-[#374151]">
                      {t.customerName}
                    </p>
                    {t.photoUrls && t.photoUrls.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {t.photoUrls.slice(0, 3).map((url, i) => (
                          <div
                            key={i}
                            className="relative h-16 w-16 overflow-hidden rounded-lg"
                          >
                            <Image
                              src={url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <div className="mt-10 text-center">
              <Link
                href="/testimonials"
                className="inline-flex items-center font-semibold text-[#215935] hover:underline"
              >
                View all testimonials
              </Link>
            </div>
          </div>
        </section>
      )}
    </PollenGeneralLayout>
  );
}
