import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";

import { DarkTrendGeneralLayout } from "./dark-trend-general-layout";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export function DarkTrendAboutPage({ business }: Props) {
  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  return (
    <DarkTrendGeneralLayout title="About Us">
      {/* Features Section */}
      <section className="mb-32 py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden rounded-sm bg-linear-to-br from-purple-600 to-blue-500">
            <Image
              src={
                themeSpecificFields["dark-trend.about.first-image"] ??
                "/placeholder.svg"
              }
              alt="About Us"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Content */}
          <div className="space-y-8">
            <div>
              <span className="text-sm font-semibold tracking-wider text-purple-500 uppercase">
                {themeSpecificFields["dark-trend.about.subheader"] ??
                  "Subheader"}
              </span>
              <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
                {themeSpecificFields["dark-trend.about.header"] ?? "Header"}
              </h2>
            </div>

            {/* Feature List */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                  <span className="text-xl font-bold text-purple-500">#1</span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-white">
                    {themeSpecificFields["dark-trend.about.feature-1-header"] ??
                      "Feature 1 Header"}
                  </h3>
                  <p className="text-white/70">
                    {themeSpecificFields[
                      "dark-trend.about.feature-1-description"
                    ] ?? "Feature 1 Description"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                  <span className="text-xl font-bold text-purple-500">#2</span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-white">
                    {themeSpecificFields["dark-trend.about.feature-2-header"] ??
                      "Feature 2 Header"}
                  </h3>
                  <p className="text-white/70">
                    {themeSpecificFields[
                      "dark-trend.about.feature-2-description"
                    ] ?? "Feature 2 Description"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                  <span className="text-xl font-bold text-purple-500">#3</span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-white">
                    {themeSpecificFields["dark-trend.about.feature-3-header"] ??
                      "Feature 3 Header"}
                  </h3>
                  <p className="text-white/70">
                    {themeSpecificFields[
                      "dark-trend.about.feature-3-description"
                    ] ?? "Feature 3 Description"}
                  </p>
                </div>
              </div>
            </div>

            <Button
              asChild
              className="bg-violet-500 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-600"
            >
              <Link
                href={
                  themeSpecificFields["dark-trend.about.button-link"] ?? "#!"
                }
              >
                {themeSpecificFields["dark-trend.about.button"] ?? "Button"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Custom Section */}
      <section className="mb-20 py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white md:text-6xl">
              {themeSpecificFields["dark-trend.about.cta-header"] ??
                "CTA Header"}
            </h2>
            <p className="text-lg text-white/70">
              {themeSpecificFields["dark-trend.about.cta-description"] ??
                "CTA Description"}
            </p>
            <Button
              asChild
              className="bg-violet-500 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-600"
            >
              <Link
                href={
                  themeSpecificFields["dark-trend.about.cta-button-link"] ??
                  "#!"
                }
              >
                {themeSpecificFields["dark-trend.about.cta-button-text"] ??
                  "CTA Button"}
              </Link>
            </Button>
          </div>

          <div className="relative aspect-4/5 overflow-hidden rounded-sm bg-zinc-900">
            <Image
              src={
                themeSpecificFields["dark-trend.about.second-image"] ??
                "/placeholder.svg"
              }
              alt="Custom Work"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    </DarkTrendGeneralLayout>
  );
}
