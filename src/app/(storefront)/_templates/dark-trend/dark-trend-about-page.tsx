import Image from "next/image";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";

import type { RouterOutputs } from "~/trpc/react";
import { getThemeFields } from "~/lib/template-fields";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export async function DarkTrendAboutPage({ business }: Props) {
  const themeSpecificFields = getThemeFields(
    "dark-trend",
    business?.siteContent?.customFields as unknown,
  );

  const aboutImage1 =
    themeSpecificFields["dark-trend.about-image-1"] ?? "/placeholder.svg";
  const aboutImage2 =
    themeSpecificFields["dark-trend.about-image-2"] ?? "/placeholder.svg";

  return (
    <main className="flex-1 bg-[#1A1A1A] px-4 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="my-20 w-full space-y-4">
          <Breadcrumb className="mx-auto w-full">
            <BreadcrumbList className="mx-auto w-full justify-center text-center">
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-white/80 hover:text-white">
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
                  Our Key Features
                </span>
                <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
                  What Are We About? Let&apos;s Break It Down
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
                      Our Mission
                    </h3>
                    <p className="text-white/70">
                      Creating alternative clothing that celebrates individuality and empowers Black, LGBTQ+, and POC communities to express their unique identities.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                    <span className="text-xl font-bold text-purple-500">#2</span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      Our Values
                    </h3>
                    <p className="text-white/70">
                      We value diversity, creativity, and community, ensuring our designs resonate with underrepresented voices and foster a safe, inclusive shopping environment for everyone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-purple-500/20">
                    <span className="text-xl font-bold text-purple-500">#3</span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      Why Us?
                    </h3>
                    <p className="text-white/70">
                      We don&apos;t just make you look beautiful, handsome, and gear to show off, we&apos;ll make you feel like the coolest!
                    </p>
                  </div>
                </div>
              </div>

              <Button
                asChild
                className="bg-violet-500 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-600"
              >
                <Link href="/contact">Contact Us</Link>
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
                NEED CUSTOM?
              </h2>
              <p className="text-lg text-white/70">
                Have something you want embroidered? Maybe you need some alterations done? We can help!
              </p>
              <Button
                asChild
                className="bg-violet-500 px-8 py-6 text-sm font-semibold tracking-wider text-white uppercase hover:bg-violet-600"
              >
                <Link href="/contact">Learn More</Link>
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
