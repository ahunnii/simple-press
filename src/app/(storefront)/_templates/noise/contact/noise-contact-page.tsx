import Image from "next/image";

import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { DEFAULT_FAQ } from ".";
import { resolveFields } from "../index";
import { NoiseContactForm } from "./noise-contact-form";
import { NoiseContactInfoBlock } from "./noise-contact-info-block";

type FaqItem = { question?: string; answer?: string; _id?: string };

export function NoiseContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const faqListRaw = Array.isArray(
    customFields?.["noise.contact-frequently-asked-questions"],
  )
    ? (customFields["noise.contact-frequently-asked-questions"] as FaqItem[])
    : [];
  const faqItems = faqListRaw.length > 0 ? faqListRaw : DEFAULT_FAQ;

  const f = resolveFields(customFields as Record<string, string> | undefined, [
    "noise.contact.header",
    "noise.contact.subheader",
    "noise.contact-image",
    "noise.contact-faq-title",
    "noise.contact-faq-subtitle",
  ]);

  const email = business.supportEmail;
  const phone = business.phoneNumber;
  const address = business.businessAddress;

  const contactHeader = f["noise.contact.header"] ?? "Contact";
  const contactSubheader =
    f["noise.contact.subheader"] ??
    "We read every message. For order questions, returns, or anything thoughtful you'd like to share — drop us a line below or write directly. We respond within one business day, Monday through Friday.";
  const contactImage = f["noise.contact-image"] ?? "";
  const faqTitle = f["noise.contact-faq-title"] ?? "Frequently asked questions.";
  const faqSubtitle =
    f["noise.contact-faq-subtitle"] ??
    "Can't find what you're looking for? Send us a message.";

  return (
    <PageTransition>
      {/* ── Centered header — "Get in touch" overline + h1 + description ── */}
      <section
        className="px-6 pt-20 pb-0 text-center"
        {...sectionGroupAttr("contact", "info")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "880px" }}>
          <p className="mb-5 font-mono text-[10px] tracking-[0.28em] text-(--vn-steel-mist) uppercase">
            Contact Us
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(3rem, 7vw, 5rem)",
              letterSpacing: "-0.025em",
            }}
            {...fieldAttr("noise.contact.header")}
          >
            {contactHeader}
          </h1>
          <p
            className="mx-auto mt-8 mb-14 max-w-[680px] font-sans text-[15px] leading-[1.85] text-(--vn-ink-soft)"
            {...fieldAttr("noise.contact.subheader")}
          >
            {contactSubheader}
          </p>

          {/* ── Info-block cards (only rendered when data is present) ── */}
          {(address ?? email ?? phone) && (
            <div className="mb-0 grid grid-cols-1 gap-6 border-0 text-left sm:grid-cols-2">
              {address && (
                <NoiseContactInfoBlock title="Studio" lines={[address]} />
              )}
              {(email ?? phone) && (
                <NoiseContactInfoBlock
                  title="Reach Us"
                  lines={[...(email ? [email] : []), ...(phone ? [phone] : [])]}
                  links={[
                    ...(email ? [`mailto:${email}`] : []),
                    ...(phone ? [`tel:${phone.replace(/\D/g, "")}`] : []),
                  ]}
                />
              )}
            </div>
          )}
        </FadeIn>
      </section>

      {/* ── Form section — editorial image alongside the form when set ── */}
      <section id="form" className="border-foreground/20 border-b">
        {contactImage ? (
          <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-stretch gap-0 px-7 py-16 md:grid-cols-2 md:gap-16">
            <FadeIn
              className="border-foreground relative order-2 hidden overflow-hidden border md:order-1 md:block"
              style={{ aspectRatio: "4/5" }}
            >
              <Image
                src={contactImage}
                alt="Contact"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </FadeIn>
            <FadeIn className="order-1 flex flex-col justify-center md:order-2">
              <NoiseContactForm />
            </FadeIn>
          </div>
        ) : (
          <div className="border-foreground/15 mx-auto max-w-[880px] px-7 pt-16 pb-20">
            <FadeIn>
              <NoiseContactForm />
            </FadeIn>
          </div>
        )}
      </section>

      {/* ── FAQ ── */}
      {isSectionVisible(customFields, "noise", "contact.faq") && (
        <section
          className="px-7 py-16"
          style={{ background: "var(--vn-paper)" }}
          {...sectionGroupAttr("contact", "faq")}
        >
          <FadeIn className="mx-auto max-w-4xl">
            <div className="border-foreground/15 mb-10 flex items-end justify-between border-b pb-6">
              <div>
                <p className="mb-3 font-mono text-[9.5px] tracking-[0.22em] text-(--vn-steel-mist) uppercase">
                  FAQ
                </p>
                <h2
                  className="font-serif leading-none tracking-tight italic"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3.5rem)",
                    letterSpacing: "-0.02em",
                  }}
                  {...fieldAttr("noise.contact-faq-title")}
                >
                  {faqTitle}
                </h2>
                <p
                  className="mt-4 max-w-[46ch] font-sans text-[14px] leading-relaxed text-(--vn-steel-mist)"
                  {...fieldAttr("noise.contact-faq-subtitle")}
                >
                  {faqSubtitle}
                </p>
              </div>
            </div>

            <Accordion type="single" collapsible className="flex flex-col gap-0">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={item._id ?? index}
                  value={String(item._id ?? index)}
                  className="border-foreground/15 border-b"
                >
                  <AccordionTrigger className="group flex items-center justify-between py-5 hover:no-underline">
                    <span className="text-left font-sans text-[15px] leading-snug text-(--vn-ink) transition-opacity group-hover:opacity-70">
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pb-5 font-sans text-[14px] leading-relaxed text-(--vn-steel-mist)">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </section>
      )}
    </PageTransition>
  );
}
