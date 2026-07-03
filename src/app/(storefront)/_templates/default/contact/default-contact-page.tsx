import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { DefaultContactForm } from "./default-contact-form";

function FaqItem({
  question,
  answer,
  answerFieldKey,
  defaultOpen,
}: {
  question: string;
  answer: string;
  answerFieldKey: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-[#e8e8e8] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        {question}
        <span
          aria-hidden="true"
          className="ml-4 shrink-0 text-xl font-light transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p
        className="pt-3.5 text-sm leading-[1.7] text-[#6b6b6b]"
        {...fieldAttr(answerFieldKey)}
      >
        {answer}
      </p>
    </details>
  );
}

export function DefaultContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "default.contact.eyebrow",
    "default.contact.heading",
    "default.contact.description",
    "default.contact.faq-1-q",
    "default.contact.faq-1-a",
    "default.contact.faq-2-q",
    "default.contact.faq-2-a",
    "default.contact.faq-3-q",
    "default.contact.faq-3-a",
    "default.contact.faq-4-q",
    "default.contact.faq-4-a",
    "default.contact.faq-5-q",
    "default.contact.faq-5-a",
    "default.contact.faq-6-q",
    "default.contact.faq-6-a",
  ]);

  const faqs = [1, 2, 3, 4, 5, 6]
    .map((n) => ({
      q: f[`default.contact.faq-${n}-q`] ?? "",
      a: f[`default.contact.faq-${n}-a`] ?? "",
      aField: `default.contact.faq-${n}-a`,
    }))
    .filter((item) => item.q && item.a);

  const contactCards = [
    ...(business.supportEmail
      ? [
          {
            eyebrow: "Email",
            heading: business.supportEmail,
            body: "For orders, questions, and anything in between.",
            href: `mailto:${business.supportEmail}`,
            label: "Write to us",
            Icon: Mail,
          },
        ]
      : []),
    ...(business.phoneNumber
      ? [
          {
            eyebrow: "Phone",
            heading: business.phoneNumber,
            body: "Call or text us during business hours.",
            href: `tel:${business.phoneNumber}`,
            label: "Call now",
            Icon: Phone,
          },
        ]
      : []),
    ...(business.businessAddress
      ? [
          {
            eyebrow: "Studio",
            heading: business.businessAddress,
            body: "Come say hi in person.",
            href: undefined,
            label: undefined,
            Icon: MapPin,
          },
        ]
      : []),
  ];

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("contact", "header")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {f["default.contact.eyebrow"] && (
            <span
              className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
              {...fieldAttr("default.contact.eyebrow")}
            >
              {f["default.contact.eyebrow"]}
            </span>
          )}
          <h1
            className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]"
            {...fieldAttr("default.contact.heading")}
          >
            {f["default.contact.heading"] ?? "Say hello."}
          </h1>
          {f["default.contact.description"] && (
            <p
              className="mt-4 max-w-[560px] text-[17px] text-[#6b6b6b]"
              {...fieldAttr("default.contact.description")}
            >
              {f["default.contact.description"]}
            </p>
          )}
        </div>
      </section>

      {/* ── Form + sidebar ───────────────────────────────────────────────── */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_320px]">
            {/* Contact form */}
            <div>
              <DefaultContactForm />
            </div>

            {/* Sidebar — info cards */}
            {contactCards.length > 0 && (
              <aside className="flex flex-col gap-4">
                {contactCards.map((card) => (
                  <div
                    key={card.eyebrow}
                    className="flex flex-col gap-2 rounded-(--radius) border border-[#e8e8e8] p-6"
                  >
                    <span className="text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                      {card.eyebrow}
                    </span>
                    <h2 className="font-serif text-[20px] font-medium tracking-[-0.01em]">
                      {card.heading}
                    </h2>
                    <p className="text-[13px] leading-relaxed text-[#6b6b6b]">
                      {card.body}
                    </p>
                    {card.href && card.label && (
                      <a
                        href={card.href}
                        className="mt-1 inline-flex items-center gap-1.5 self-start border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-2.5"
                      >
                        {card.label} <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </div>
                ))}
              </aside>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section
          {...sectionGroupAttr("contact", "faq")}
          className="bg-[#efece8] px-6 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-[760px]">
            <div className="mb-12 text-center">
              <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                Frequently asked
              </span>
              <h2 className="mt-3 font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]">
                Quick answers.
              </h2>
            </div>
            <div>
              {faqs.map((item, i) => (
                <FaqItem
                  key={i}
                  question={item.q}
                  answer={item.a}
                  answerFieldKey={item.aField}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
