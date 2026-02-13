import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Mail, MapPin } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

import { DarkTrendContactForm } from "./dark-trend-contact-form";

export function DarkTrendContactPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  // Default values - can be customized in theme settings later
  const contactImage = "/placeholder.svg";
  const physicalAddress = "Detroit, MI";
  const contactEmail = "support@trendanomaly.com";

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
                  Contact
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mb-2 text-center text-4xl font-bold text-white lg:text-7xl">
            Contact
          </h1>
        </div>

        {/* Info Cards */}
        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Physical Address */}
          <div className="flex flex-col items-center rounded-sm bg-zinc-900/30 p-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Physical Address
            </h3>
            <p className="text-white/70">{physicalAddress}</p>
          </div>

          {/* Email Address */}
          <div className="flex flex-col items-center rounded-sm bg-zinc-900/30 p-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Email Address
            </h3>
            <p className="text-white/70">{contactEmail}</p>
          </div>
        </div>

        {/* Contact Form Section */}
        <section className="mb-20 py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-square max-w-md overflow-hidden rounded-full">
              <Image
                src={contactImage}
                alt="Contact Us"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {/* Form */}
            <div className="space-y-6">
              <div>
                <span className="text-sm font-semibold tracking-wider text-purple-500 uppercase">
                  Get In Touch
                </span>
                <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
                  Heya, let&apos;s talk
                </h2>
                <p className="mt-4 text-white/70">
                  Have any questions about products? Want to see what we are
                  working on now? Hit us up and we will respond as soon as we
                  can!
                </p>
              </div>

              <DarkTrendContactForm businessName={business.name} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
