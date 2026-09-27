import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { telHref } from "~/lib/tel-href";

import { resolveFields } from "..";
import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";
import { DarkTrendContactForm } from "./dark-trend-contact-form";

type InfoCard = {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  label: string;
  content: React.ReactNode;
};

export function DarkTrendContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "dark-trend.contact.page-title",
    "dark-trend.contact.address-label",
    "dark-trend.contact.email-label",
    "dark-trend.contact.phone-label",
    "dark-trend.contact.hours-label",
    "dark-trend.contact.header",
    "dark-trend.contact.subheader",
    "dark-trend.contact.description",
    "dark-trend.contact.image",
    "dark-trend.contact.form-success-heading",
    "dark-trend.contact.form-success-body",
    "dark-trend.contact.form-send-another-text",
  ]);

  const pageTitleRaw = f["dark-trend.contact.page-title"] ?? "";
  const pageTitle = pageTitleRaw.trim() ? pageTitleRaw : "Contact";
  const imageRaw = f["dark-trend.contact.image"] ?? "";
  const image = imageRaw.trim() ? imageRaw : "/placeholder.svg";

  // Contact details come from Settings; each card hides when its value is blank.
  const physicalAddress = business?.businessAddress?.trim() ?? "";
  const contactEmail = business?.supportEmail?.trim() ?? "";
  const phone = business?.phoneNumber?.trim() ?? "";
  const phoneHref = telHref(phone);
  const hours = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );

  const cards: InfoCard[] = [
    ...(physicalAddress
      ? [
          {
            id: "address",
            icon: MapPin,
            labelKey: "dark-trend.contact.address-label",
            label: f["dark-trend.contact.address-label"] ?? "",
            content: <p className="text-white/70">{physicalAddress}</p>,
          },
        ]
      : []),
    ...(contactEmail
      ? [
          {
            id: "email",
            icon: Mail,
            labelKey: "dark-trend.contact.email-label",
            label: f["dark-trend.contact.email-label"] ?? "",
            content: <p className="text-white/70">{contactEmail}</p>,
          },
        ]
      : []),
    ...(phoneHref
      ? [
          {
            id: "phone",
            icon: Phone,
            labelKey: "dark-trend.contact.phone-label",
            label: f["dark-trend.contact.phone-label"] ?? "",
            content: (
              <a
                href={phoneHref}
                className="text-white/70 transition-colors hover:text-white"
              >
                {phone}
              </a>
            ),
          },
        ]
      : []),
    ...(hours.length > 0
      ? [
          {
            id: "hours",
            icon: Clock,
            labelKey: "dark-trend.contact.hours-label",
            label: f["dark-trend.contact.hours-label"] ?? "",
            content: (
              <dl className="space-y-1 text-white/70">
                {hours.map((row, i) => (
                  <div
                    key={`${row.label}-${i}`}
                    className="flex justify-center gap-3"
                  >
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ),
          },
        ]
      : []),
  ];

  return (
    <DarkTrendGeneralLayout
      title={pageTitle}
      titleFieldKey="dark-trend.contact.page-title"
      sectionAttrs={sectionGroupAttr("contact", "info")}
    >
      <div {...sectionGroupAttr("contact", "info")}>
        {/* Info Cards */}
        {cards.length > 0 && (
          <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex flex-col items-center rounded-sm bg-[#1f1f1f] p-12 text-center"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20">
                  {/* N-1: decorative icon */}
                  <card.icon
                    aria-hidden="true"
                    className="h-8 w-8 text-white"
                  />
                </div>
                {/* M-10: promote h3 → h2 (page h1 is the page title) */}
                {card.label.trim() && (
                  <h2
                    className="mb-2 text-lg font-semibold text-white"
                    {...fieldAttr(card.labelKey)}
                  >
                    {card.label}
                  </h2>
                )}
                {card.content}
              </div>
            ))}
          </div>
        )}

        {/* Contact Form Section */}
        <section className="mb-20 py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Image — N-2: decorative owner-configurable image → alt="" */}
            <div className="relative aspect-square max-w-md overflow-hidden rounded-full">
              <Image
                src={image}
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
                <span
                  className="text-sm font-semibold tracking-wider text-purple-400 uppercase"
                  {...fieldAttr("dark-trend.contact.subheader")}
                >
                  {f["dark-trend.contact.subheader"]}
                </span>
                <h2
                  className="mt-2 text-3xl font-bold text-white md:text-5xl"
                  {...fieldAttr("dark-trend.contact.header")}
                >
                  {f["dark-trend.contact.header"]}
                </h2>
                <p
                  className="mt-4 text-white/70"
                  {...fieldAttr("dark-trend.contact.description")}
                >
                  {f["dark-trend.contact.description"]}
                </p>
              </div>

              <div {...sectionGroupAttr("contact", "form")}>
                <DarkTrendContactForm
                  successHeading={
                    f["dark-trend.contact.form-success-heading"] ?? ""
                  }
                  successBody={f["dark-trend.contact.form-success-body"] ?? ""}
                  sendAnotherText={
                    f["dark-trend.contact.form-send-another-text"] ?? ""
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </DarkTrendGeneralLayout>
  );
}
