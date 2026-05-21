import type { DefaultContactPageTemplateProps } from "../../types";
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
  ]);

  const email = business.supportEmail;
  const phone = business.phoneNumber;
  const address = business.businessAddress;

  const contactHeader = f["noise.contact.header"] ?? "Contact";
  const contactSubheader =
    f["noise.contact.subheader"] ??
    "We read every message. For order questions, returns, or anything thoughtful you'd like to share — drop us a line below or write directly. We respond within one business day, Monday through Friday.";

  return (
    <PageTransition>
      {/* ── Centered header — "Get in touch" overline + h1 + description ── */}
      <section className="px-6 pt-20 pb-0 text-center">
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
          >
            {contactHeader}
          </h1>
          <p className="mx-auto mt-8 mb-14 max-w-[680px] font-sans text-[15px] leading-[1.85] text-(--vn-ink-soft)">
            {contactSubheader}
          </p>

          {/* ── 3 info-block cards ── */}
          <div className="mb-0 grid grid-cols-1 gap-6 border-0 text-left sm:grid-cols-3">
            <NoiseContactInfoBlock
              title="Studio"
              lines={[
                address ?? "1502 Michigan Ave, Studio 3",
                "Detroit, MI 48216",
                "United States",
              ]}
            />
            <NoiseContactInfoBlock
              title="Reach Us"
              lines={[
                email ?? "hello@visualnoise.example",
                phone ?? "+1 (313) 555-0184",
              ]}
              links={[
                email ? `mailto:${email}` : null,
                phone ? `tel:${phone.replace(/\D/g, "")}` : null,
              ]}
            />
            <NoiseContactInfoBlock
              title="Hours"
              lines={[
                "Mon — Fri",
                "9:00 — 17:00 ET",
                "Closed Saturdays & Sundays",
              ]}
            />
          </div>
        </FadeIn>
      </section>

      {/* ── Form section ── */}
      <section id="form" className="border-foreground/20 border-b">
        <div className="border-foreground/15 mx-auto max-w-[880px] px-7 pt-16 pb-20">
          <FadeIn>
            <NoiseContactForm />
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-7 py-16" style={{ background: "var(--vn-paper)" }}>
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
              >
                Frequently asked questions.
              </h2>
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
    </PageTransition>
  );
}
