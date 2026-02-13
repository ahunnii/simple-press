import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { getThemeFields } from "~/lib/template-fields";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export async function DarkTrendAboutPage({ business }: Props) {
  const themeSpecificFields = getThemeFields(
    "dark-trend",
    business?.siteContent?.customFields as unknown,
  );

  const aboutImage1 =
    themeSpecificFields["dark-trend.about.first-image"] ?? "/placeholder.svg";
  const aboutImage2 =
    themeSpecificFields["dark-trend.about.second-image"] ?? "/placeholder.svg";

  const aboutHeader =
    themeSpecificFields["dark-trend.about.header"] ?? "About Us";
  const aboutSubheader =
    themeSpecificFields["dark-trend.about.subheader"] ?? "About Us";
  const aboutButton =
    themeSpecificFields["dark-trend.about.button"] ?? "Contact Us";
  const aboutButtonLink =
    themeSpecificFields["dark-trend.about.button-link"] ?? "/contact";
  const aboutCtaHeader =
    themeSpecificFields["dark-trend.about.cta-header"] ?? "Contact Us";
  const aboutCtaDescription =
    themeSpecificFields["dark-trend.about.cta-description"] ?? "Contact Us";
  const aboutCtaButtonText =
    themeSpecificFields["dark-trend.about.cta-button-text"] ?? "Contact Us";
  const aboutCtaButtonLink =
    themeSpecificFields["dark-trend.about.cta-button-link"] ?? "/contact";

  const aboutFeature1Header =
    themeSpecificFields["dark-trend.about.feature-1-header"] ?? "Feature 1";
  const aboutFeature1Description =
    themeSpecificFields["dark-trend.about.feature-1-description"] ??
    "Feature 1 Description";
  const aboutFeature2Header =
    themeSpecificFields["dark-trend.about.feature-2-header"] ?? "Feature 2";
  const aboutFeature2Description =
    themeSpecificFields["dark-trend.about.feature-2-description"] ??
    "Feature 2 Description";
  const aboutFeature3Header =
    themeSpecificFields["dark-trend.about.feature-3-header"] ?? "Feature 3";
  const aboutFeature3Description =
    themeSpecificFields["dark-trend.about.feature-3-description"] ??
    "Feature 3 Description";

  return (
    <main className="flex-1 bg-[#1A1A1A] px-4 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="my-20 w-full space-y-4">
          <Breadcrumb className="mx-auto w-full">
            <BreadcrumbList className="mx-auto w-full justify-center text-center">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="text-white/80 hover:text-white"
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-purple-500">
                  About Us
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mb-2 text-center text-4xl font-bold text-white lg:text-7xl">
            About Us
          </h1>
        </div>

        {/* Features Section */}
        <section className="mb-32 py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden rounded-sm bg-linear-to-br from-purple-600 to-blue-500">
              <Image
                src={aboutImage1}
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
                  {aboutSubheader}
                </span>
                <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
                  {aboutHeader}
                </h2>
              </div>

              {/* Feature List */}
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                    <span className="text-xl font-bold text-purple-500">
                      #1
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {aboutFeature1Header}
                    </h3>
                    <p className="text-white/70">{aboutFeature1Description}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                    <span className="text-xl font-bold text-purple-500">
                      #2
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {aboutFeature2Header}
                    </h3>
                    <p className="text-white/70">{aboutFeature2Description}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                    <span className="text-xl font-bold text-purple-500">
                      #3
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {aboutFeature3Header}
                    </h3>
                    <p className="text-white/70">{aboutFeature3Description}</p>
                  </div>
                </div>
              </div>

              <Button
                asChild
                className="bg-violet-500 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-600"
              >
                <Link href={aboutButtonLink}>{aboutButton}</Link>
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
                {aboutCtaHeader}
              </h2>
              <p className="text-lg text-white/70">{aboutCtaDescription}</p>
              <Button
                asChild
                className="bg-violet-500 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-600"
              >
                <Link href={aboutCtaButtonLink}>{aboutCtaButtonText}</Link>
              </Button>
            </div>

            {/* Image */}
            <div className="relative aspect-4/5 overflow-hidden rounded-sm bg-zinc-900">
              <Image
                src={aboutImage2}
                alt="Custom Work"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
