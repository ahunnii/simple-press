import Link from "next/link";

import type { DefaultContactPageTemplateProps } from "../../types";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";

import { resolveFields } from "../index";
import { NoiseContactForm } from "./noise-contact-form";

type FaqItem = { question?: string; answer?: string; _id?: string };

const DEFAULT_FAQ: FaqItem[] = [
  { _id: "d1", question: "Can I commission a one-of-one piece?", answer: "Yes. Email us with reference images and a rough silhouette. We respond within two business days with a quote and timeline (usually 4–6 weeks from first fitting to handover)." },
  { _id: "d2", question: "Do you ship internationally?", answer: "Worldwide, via DHL Express. Duties are calculated at checkout — no surprise fees at the door. Most international orders arrive within 5 business days." },
  { _id: "d3", question: "Can I visit the atelier?", answer: "Please do. Book a 45-minute fitting slot via the form above — we'll have your size pulled and tea waiting. Walk-ins welcome on Friday and Saturday afternoons." },
  { _id: "d4", question: "What's the return policy?", answer: "14-day exchange on stock pieces. Return postage on us within the US. Numbered editions and commissioned work are final sale." },
  { _id: "d5", question: "Where are the garments made?", answer: "Every piece is cut, sewn, and finished in our studio on Gratiot Avenue, Detroit. Fabrics come from mills in Italy, Japan, and one weaver in North Carolina." },
];

export function NoiseContactPage({ business }: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as Record<string, unknown> | undefined;

  const faqListRaw = Array.isArray(customFields?.["noise.contact-frequently-asked-questions"])
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
      <section
        className="px-6 pt-20 pb-0 text-center border-b border-foreground/15"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "880px" }}>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-5"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Get in touch
          </p>
          <h1
            className="font-serif italic leading-none tracking-tight"
            style={{
              fontSize: "clamp(3rem, 7vw, 5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {contactHeader}
          </h1>
          <p
            className="font-sans mt-8 mb-14 mx-auto leading-[1.85]"
            style={{
              fontSize: "15px",
              color: "var(--vn-ink-soft)",
              maxWidth: "680px",
            }}
          >
            {contactSubheader}
          </p>

          {/* ── 3 info-block cards ── */}
          <div
            className="grid grid-cols-1 gap-6 mb-0 text-left sm:grid-cols-3"
            style={{ marginBottom: 0 }}
          >
            <InfoBlock
              title="Studio"
              lines={[
                address ?? "1502 Michigan Ave, Studio 3",
                "Detroit, MI 48216",
                "United States",
              ]}
            />
            <InfoBlock
              title="Reach Us"
              lines={[
                email ?? "hello@visualnoise.example",
                phone ?? "+1 (313) 555-0184",
              ]}
              links={[email ? `mailto:${email}` : null, phone ? `tel:${phone.replace(/\D/g, "")}` : null]}
            />
            <InfoBlock
              title="Hours"
              lines={["Mon — Fri", "9:00 — 17:00 ET", "Closed Saturdays & Sundays"]}
            />
          </div>
        </FadeIn>
      </section>

      {/* ── Form section ── */}
      <section
        id="form"
        className="border-b-2 border-foreground"
        style={{ background: "var(--vn-paper)" }}
      >
        <div
          className="mx-auto border-t border-foreground/15 px-7 pt-16 pb-20"
          style={{ maxWidth: "880px" }}
        >
          <FadeIn>
            <h2
              className="font-serif italic leading-none tracking-tight mb-10 text-center"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", letterSpacing: "-0.02em" }}
            >
              Send a note
            </h2>
            <NoiseContactForm />
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        className="border-b border-foreground/20 px-7 py-16"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto max-w-4xl">
          <div className="flex items-end justify-between mb-10 border-b border-foreground/15 pb-6">
            <div>
              <p className="font-mono text-[9.5px] tracking-[0.22em] uppercase mb-3" style={{ color: "var(--vn-steel-mist)" }}>
                FAQ
              </p>
              <h2
                className="font-serif italic leading-none tracking-tight"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.02em" }}
              >
                Frequencies received.
              </h2>
            </div>
            <span className="font-mono text-[9px] tracking-[0.16em] uppercase hidden md:block" style={{ color: "var(--vn-steel-mist)" }}>
              Most asked
            </span>
          </div>

          <Accordion type="single" collapsible className="flex flex-col gap-0">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={item._id ?? index}
                value={String(item._id ?? index)}
                className="border-b border-foreground/15"
              >
                <AccordionTrigger className="flex items-center justify-between py-5 hover:no-underline group">
                  <span
                    className="font-sans text-[15px] text-left leading-snug group-hover:opacity-70 transition-opacity"
                    style={{ color: "var(--vn-ink)" }}
                  >
                    {item.question}
                  </span>
                  <span
                    className="font-mono text-[9.5px] tracking-[0.18em] uppercase flex-shrink-0 ml-4"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    N° {String(index + 1).padStart(2, "0")}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="font-sans text-[14px] leading-relaxed pb-5" style={{ color: "var(--vn-steel-mist)" }}>
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </section>

      {/* ── Visit + Press CTA ── */}
      <section className="grid border-b-2 border-foreground md:grid-cols-2">
        <div
          className="flex flex-col gap-5 px-10 py-14 border-b border-foreground md:border-b-0 md:border-r"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <span className="vn-stamp text-[9.5px] w-fit" style={{ borderColor: "var(--vn-bone)", color: "var(--vn-bone)" }}>
            By appointment
          </span>
          <h3
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
          >
            Book a fitting
            <br />at the studio.
          </h3>
          <p className="font-sans text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", maxWidth: "36ch" }}>
            A private 45 minutes with the atelier team. Tea, the full archive, and a tape measure. No commitment.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link
              href="/contact#form"
              className="vn-stamp text-[10.5px] transition-all hover:opacity-80"
              style={{ background: "var(--vn-bone)", color: "var(--vn-ink)", borderColor: "var(--vn-bone)", padding: "12px 20px" }}
            >
              Reserve a slot →
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-10 py-14" style={{ background: "var(--vn-paper)" }}>
          <span className="vn-stamp text-[9.5px] w-fit">Press · Editorial</span>
          <h3
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
          >
            Looking to
            <br />feature us?
          </h3>
          <p className="font-sans text-[15px] leading-relaxed" style={{ color: "var(--vn-ink-soft)", maxWidth: "36ch" }}>
            High-res lookbook, biography, garment specs, and quotes from the founder. No watermark.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            {email ? (
              <a
                href={`mailto:${email}?subject=Press+Inquiry`}
                className="vn-stamp vn-stamp-solid text-[10.5px] transition-all hover:opacity-80"
                style={{ padding: "12px 20px" }}
              >
                {email}
              </a>
            ) : (
              <span className="vn-stamp vn-stamp-solid text-[10.5px]" style={{ padding: "12px 20px" }}>
                press@vndet.co
              </span>
            )}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

/* ── Info block component (server-safe, no event handlers) ── */
function InfoBlock({
  title,
  lines,
  links,
}: {
  title: string;
  lines: string[];
  links?: (string | null)[];
}) {
  return (
    <div
      className="text-left"
      style={{ padding: "24px 22px", background: "var(--vn-bone)" }}
    >
      <p
        className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3"
        style={{ color: "var(--vn-steel-mist)" }}
      >
        {title}
      </p>
      <div className="font-sans leading-[1.85]" style={{ fontSize: "14px", color: "var(--vn-ink)" }}>
        {lines.map((line, i) => {
          const href = links?.[i];
          return href ? (
            <a key={i} href={href} className="block hover:opacity-70 transition-opacity">
              {line}
            </a>
          ) : (
            <span key={i} className="block">{line}</span>
          );
        })}
      </div>
    </div>
  );
}
