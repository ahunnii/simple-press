import type { DefaultContactPageTemplateProps } from "../../types";
import { FadeIn, PageTransition } from "~/components/page-animations";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";

import { resolveFields } from "../index";
import { NoiseContactForm } from "./noise-contact-form";

type FaqItem = { question?: string; answer?: string; _id?: string };

export function NoiseContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const faqListRaw = Array.isArray(customFields?.["noise.contact-frequently-asked-questions"])
    ? (customFields["noise.contact-frequently-asked-questions"] as FaqItem[])
    : [];

  const f = resolveFields(customFields as Record<string, string> | undefined, [
    "noise.contact.header",
    "noise.contact.subheader",
  ]);

  const email = business.supportEmail;
  const phone = business.phoneNumber;
  const address = business.businessAddress;

  return (
    <PageTransition>
      {/* Header */}
      <section className="border-b border-border bg-secondary py-20">
        <FadeIn className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
            Reach Out
          </p>
          <h1 className="font-serif text-5xl font-light tracking-tight text-foreground md:text-6xl">
            {f["noise.contact.header"] ?? "Get in Touch"}
          </h1>
          {f["noise.contact.subheader"] && (
            <p className="mt-5 max-w-xl font-sans text-base text-muted-foreground">
              {f["noise.contact.subheader"]}
            </p>
          )}
        </FadeIn>
      </section>

      {/* Contact content */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2">
          {/* Contact info */}
          <FadeIn direction="left">
            <div className="space-y-8">
              <div>
                <p className="mb-5 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
                  Contact Details
                </p>
                <address className="space-y-4 not-italic">
                  <p className="font-serif text-xl font-light text-foreground">
                    {business.name ?? "Visual Noise"}
                  </p>
                  {!!address && (
                    <p className="font-sans text-sm text-muted-foreground">{address}</p>
                  )}
                  {!!phone && (
                    <a
                      href={`tel:${phone.replace(/\D/g, "")}`}
                      className="block font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {phone}
                    </a>
                  )}
                  {!!email && (
                    <a
                      href={`mailto:${email}`}
                      className="block font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {email}
                    </a>
                  )}
                </address>
              </div>

              <div className="border-t border-border pt-8">
                <p className="font-serif text-xl font-light italic text-foreground/60">
                  &ldquo;...because fashion shouldn&apos;t be quiet.&rdquo;
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Form */}
          <FadeIn direction="right" delay={0.1}>
            <p className="mb-5 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
              Send a Message
            </p>
            <NoiseContactForm />
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      {faqListRaw.length > 0 && (
        <section className="border-t border-border bg-secondary py-20">
          <FadeIn className="mx-auto max-w-7xl px-4 lg:px-8">
            <p className="mb-3 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
              FAQ
            </p>
            <h2 className="mb-10 font-serif text-3xl font-light text-foreground">
              Questions &amp; Answers
            </h2>
            <Accordion type="single" collapsible className="max-w-2xl">
              {faqListRaw.map((item, index) => (
                <AccordionItem
                  key={item._id ?? index}
                  value={String(item._id ?? index)}
                  className="border-border"
                >
                  <AccordionTrigger className="font-sans text-sm font-medium text-foreground hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-sans text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
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
