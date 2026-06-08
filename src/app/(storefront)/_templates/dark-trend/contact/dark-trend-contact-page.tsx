import Image from "next/image";
import { Mail, MapPin } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { DarkTrendContactForm } from "./dark-trend-contact-form";
import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";

export function DarkTrendContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "dark-trend.contact.header",
    "dark-trend.contact.subheader",
    "dark-trend.contact.description",
    "dark-trend.contact.image",
  ]);

  const physicalAddress = business?.businessAddress ?? "";
  const contactEmail = business?.supportEmail ?? "";

  return (
    <DarkTrendGeneralLayout title="Contact">
      {/* Info Cards */}
      <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2">
        {physicalAddress && (
          <div className="flex flex-col items-center rounded-sm bg-[#1f1f1f] p-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20">
              {/* N-1: decorative icon */}
              <MapPin aria-hidden="true" className="h-8 w-8 text-white" />
            </div>
            {/* M-10: promote h3 → h2 (page h1 is "Contact") */}
            <h2 className="mb-2 text-lg font-semibold text-white">
              Physical Address
            </h2>
            <p className="text-white/70">{physicalAddress}</p>
          </div>
        )}

        {contactEmail && (
          <div className="flex flex-col items-center rounded-sm bg-[#1f1f1f] p-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20">
              {/* N-1: decorative icon */}
              <Mail aria-hidden="true" className="h-8 w-8 text-white" />
            </div>
            {/* M-10: promote h3 → h2 */}
            <h2 className="mb-2 text-lg font-semibold text-white">
              Email Address
            </h2>
            <p className="text-white/70">{contactEmail}</p>
          </div>
        )}
      </div>

      {/* Contact Form Section */}
      <section className="mb-20 py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Image — N-2: decorative owner-configurable image → alt="" */}
          <div className="relative aspect-square max-w-md overflow-hidden rounded-full">
            <Image
              src={f["dark-trend.contact.image"] ?? "/placeholder.svg"}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              {/* S-11: text-purple-500 → text-purple-400 for small text */}
              <span className="text-sm font-semibold tracking-wider text-purple-400 uppercase">
                {f["dark-trend.contact.subheader"]}
              </span>
              <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
                {f["dark-trend.contact.header"]}
              </h2>
              <p className="mt-4 text-white/70">
                {f["dark-trend.contact.description"]}
              </p>
            </div>

            <DarkTrendContactForm />
          </div>
        </div>
      </section>
    </DarkTrendGeneralLayout>
  );
}
