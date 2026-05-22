import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { DefaultContactForm } from "./default-contact-form";

function FaqItem({
  question,
  answer,
  defaultOpen,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-[#e8e8e8] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        {question}
        <span className="ml-4 shrink-0 text-xl font-light transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="pt-3.5 text-sm leading-[1.7] text-[#6b6b6b]">{answer}</p>
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
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
            <Link href="/" className="hover:text-[#0a0a0a] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span>Contact</span>
          </div>
          {f["default.contact.eyebrow"] && (
            <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
              {f["default.contact.eyebrow"]}
            </span>
          )}
          <h1 className="font-serif mt-3 text-[clamp(40px,5vw,72px)] font-semibold leading-[1.04] tracking-[-0.03em]">
            {f["default.contact.heading"] ?? "Say hello."}
          </h1>
          {f["default.contact.description"] && (
            <p className="mt-4 text-[17px] text-[#6b6b6b] max-w-[560px]">
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
                    className="flex flex-col gap-2 rounded-[var(--radius)] border border-[#e8e8e8] p-6"
                  >
                    <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
                      {card.eyebrow}
                    </span>
                    <h3 className="font-serif text-[20px] font-medium tracking-[-0.01em]">
                      {card.heading}
                    </h3>
                    <p className="text-[13px] text-[#6b6b6b] leading-relaxed">
                      {card.body}
                    </p>
                    {card.href && card.label && (
                      <a
                        href={card.href}
                        className="inline-flex items-center gap-1.5 text-sm font-medium border-b border-current pb-0.5 transition-[gap] hover:gap-2.5 self-start mt-1"
                      >
                        {card.label} →
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
        <section className="bg-[#efece8] px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-[760px]">
            <div className="mb-12 text-center">
              <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
                Frequently asked
              </span>
              <h2 className="font-serif mt-3 text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]">
                Quick answers.
              </h2>
            </div>
            <div>
              {faqs.map((item, i) => (
                <FaqItem
                  key={i}
                  question={item.q}
                  answer={item.a}
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
