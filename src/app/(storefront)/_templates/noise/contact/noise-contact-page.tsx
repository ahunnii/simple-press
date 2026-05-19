import Link from "next/link";

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

const DEFAULT_FAQ: FaqItem[] = [
  { _id: "d1", question: "Can I commission a one-of-one piece?", answer: "Yes. Email us with reference images and a rough silhouette. We respond within two business days with a quote and timeline (usually 4–6 weeks from first fitting to handover)." },
  { _id: "d2", question: "Do you ship internationally?", answer: "Worldwide, via DHL Express. Duties are calculated at checkout — no surprise fees at the door. Most international orders arrive within 5 business days." },
  { _id: "d3", question: "Can I visit the atelier?", answer: "Please do. Book a 45-minute fitting slot via the form above — we'll have your size pulled and tea waiting. Walk-ins welcome on Friday and Saturday afternoons." },
  { _id: "d4", question: "What's the return policy?", answer: "14-day exchange on stock pieces. Return postage on us within the US. Numbered editions and commissioned work are final sale." },
  { _id: "d5", question: "Where are the garments made?", answer: "Every piece is cut, sewn, and finished in our studio on Gratiot Avenue, Detroit. Fabrics come from mills in Italy, Japan, and one weaver in North Carolina." },
];

const HOURS = [
  { day: "Monday", time: "Closed", closed: true },
  { day: "Tuesday", time: "By appt.", closed: true },
  { day: "Wednesday", time: "11:00 — 18:00", closed: false },
  { day: "Thursday", time: "11:00 — 18:00", closed: false },
  { day: "Friday", time: "11:00 — 20:00", closed: false },
  { day: "Saturday", time: "11:00 — 19:00", closed: false },
  { day: "Sunday", time: "By appt.", closed: true },
] as const;

/* Stylized Detroit street map SVG */
function DetroitMapSvg() {
  return (
    <svg viewBox="0 0 600 220" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="vn-map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e2832" strokeWidth=".5" />
        </pattern>
      </defs>
      <rect width="600" height="220" fill="#0e0f12" />
      <rect width="600" height="220" fill="url(#vn-map-grid)" />
      {/* Detroit River */}
      <path d="M 0 175 Q 120 200 230 180 T 460 175 T 600 165 L 600 220 L 0 220 Z" fill="#2c3a4d" opacity=".55" />
      <path d="M 0 175 Q 120 200 230 180 T 460 175 T 600 165" fill="none" stroke="#6a7787" strokeWidth="1" />
      {/* Avenues */}
      <line x1="0" y1="70" x2="600" y2="40" stroke="#3a4858" strokeWidth="1.2" />
      <line x1="0" y1="110" x2="600" y2="90" stroke="#3a4858" strokeWidth="1.2" />
      <line x1="120" y1="0" x2="380" y2="220" stroke="#3a4858" strokeWidth="1.2" />
      <line x1="280" y1="0" x2="280" y2="220" stroke="#3a4858" strokeWidth="1.2" />
      <line x1="440" y1="0" x2="380" y2="220" stroke="#3a4858" strokeWidth="1.2" />
      {/* Gratiot diagonal — highlighted */}
      <line x1="180" y1="20" x2="540" y2="180" stroke="#ece8de" strokeWidth="1.5" />
      <text x="510" y="170" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#ece8de" letterSpacing="2">GRATIOT</text>
      {/* Studio pin */}
      <g transform="translate(330, 110)">
        <circle r="18" fill="none" stroke="#ece8de" strokeWidth="1" opacity=".45" />
        <circle r="9" fill="none" stroke="#ece8de" strokeWidth="1" opacity=".7" />
        <circle r="4" fill="#ece8de" />
      </g>
      <text x="350" y="105" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#ece8de" letterSpacing="2">N° 1217</text>
      {/* D watermark */}
      <text x="20" y="40" fontFamily="Instrument Serif, serif" fontSize="46" fontStyle="italic" fill="#2c3a4d">D.</text>
    </svg>
  );
}

export function NoiseContactPage({ business }: DefaultContactPageTemplateProps) {
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

  return (
    <PageTransition>
      {/* Two-column editorial header */}
      <section
        className="grid border-b-2 border-foreground md:grid-cols-2"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* Left — headline */}
        <FadeIn className="flex flex-col justify-between gap-8 px-7 py-14 border-b border-foreground md:border-b-0 md:border-r">
          <div className="flex flex-col gap-5">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel)" }}
            >
              Section / 04 — Studio + Transmissions
            </p>
            <h1
              className="font-serif italic leading-[0.95] tracking-tight"
              style={{
                fontSize: "clamp(3rem, 6vw, 5.5rem)",
                letterSpacing: "-0.025em",
              }}
            >
              {f["noise.contact.header"] ?? (
                <>
                  Say it
                  <br />
                  <span style={{ textDecoration: "underline", textDecorationThickness: "3px", textUnderlineOffset: "10px" }}>
                    out loud.
                  </span>
                </>
              )}
            </h1>
            <p
              className="font-sans text-[15px] leading-relaxed max-w-[42ch]"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              {f["noise.contact.subheader"] ??
                "Press, commissions, custom fittings, stockist inquiries — or just to tell us about a piece you love. Every signal gets a reply, usually the same day."}
            </p>
          </div>
        </FadeIn>

        {/* Right — address + Detroit map + info grid */}
        <FadeIn
          delay={0.1}
          className="flex flex-col gap-6 px-7 py-10"
          style={{ background: "var(--vn-bone)" }}
        >
          {/* Address */}
          <div>
            <h5
              className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              The Atelier
            </h5>
            <div
              className="font-serif italic leading-[1.1]"
              style={{ fontSize: "24px", letterSpacing: "-0.01em" }}
            >
              {address ?? "1217 Gratiot Ave."}
              <br />
              Detroit, MI 48207
            </div>
          </div>

          {/* Map card */}
          <div
            className="border border-foreground/20 overflow-hidden"
          >
            <div
              className="flex justify-between px-3 py-2 font-mono text-[9px] tracking-[0.14em] uppercase"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              <span>42.3314° N · 83.0458° W</span>
              <span style={{ color: "var(--vn-steel-mist)" }}>VND · 313 · SVC</span>
            </div>
            <div style={{ height: "120px" }}>
              <DetroitMapSvg />
            </div>
            <div
              className="flex justify-between px-3 py-2 font-mono text-[9px] tracking-[0.14em] uppercase"
              style={{ background: "var(--vn-ink)", color: "var(--vn-steel-mist)" }}
            >
              <span>East Side · 48207</span>
              <span style={{ color: "var(--vn-bone)" }}>Studio pin ·</span>
            </div>
          </div>

          {/* Info grid: hours / signal / stockists */}
          <div className="grid grid-cols-3 gap-4 border-t border-foreground/15 pt-5">
            <div>
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Hours
              </h5>
              <div
                className="font-mono text-[10px] tracking-[0.1em] leading-[1.8]"
                style={{ color: "var(--vn-steel)" }}
              >
                Wed–Sat
                <br />
                11 — 18:00
                <br />
                <span style={{ color: "var(--vn-steel-mist)" }}>Sun · Tue, appt.</span>
                <br />
                <span style={{ color: "var(--vn-steel-mist)" }}>Mon · Closed</span>
              </div>
            </div>
            <div>
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Signal
              </h5>
              <div
                className="font-mono text-[10px] tracking-[0.1em] leading-[1.8]"
                style={{ color: "var(--vn-steel)" }}
              >
                {email ? (
                  <a href={`mailto:${email}`} className="hover:opacity-70 transition-opacity block">
                    {email}
                  </a>
                ) : (
                  <span>hello@vndet.co</span>
                )}
                {phone ? (
                  <a href={`tel:${phone.replace(/\D/g, "")}`} className="hover:opacity-70 transition-opacity block">
                    {phone}
                  </a>
                ) : (
                  <span>+1 · 313 · 555 · 0142</span>
                )}
              </div>
            </div>
            <div>
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Stockists
              </h5>
              <div
                className="font-mono text-[10px] tracking-[0.1em] leading-[1.8]"
                style={{ color: "var(--vn-steel)" }}
              >
                Eastern Market
                <br />
                Pop-Up
                <br />
                <span style={{ color: "var(--vn-steel-mist)" }}>ships worldwide</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Marquee */}
      <div
        className="overflow-hidden border-b border-foreground/20 py-3"
        style={{ background: "var(--vn-ink)" }}
      >
        <div className="vn-marquee-track" aria-hidden="true">
          {[0, 1].map((n) => (
            <span
              key={n}
              className="whitespace-nowrap font-serif italic px-6"
              style={{
                fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)",
                color: "var(--vn-bone)",
                opacity: 0.7,
                letterSpacing: "-0.01em",
              }}
            >
              Every signal gets a reply
              <span className="font-mono not-italic mx-5" style={{ fontSize: "11px", color: "var(--vn-steel-mist)" }}>✦</span>
              Usually same day
              <span className="font-mono not-italic mx-5" style={{ fontSize: "11px", color: "var(--vn-steel-mist)" }}>✦</span>
              Cut and sewn in Detroit
              <span className="font-mono not-italic mx-5" style={{ fontSize: "11px", color: "var(--vn-steel-mist)" }}>✦</span>
              Since 2014
              <span className="font-mono not-italic mx-5" style={{ fontSize: "11px", color: "var(--vn-steel-mist)" }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main section: form + aside */}
      <section
        className="border-b-2 border-foreground"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="grid lg:grid-cols-[1fr_320px]">
          {/* Form column */}
          <FadeIn className="px-7 py-14 border-b border-foreground lg:border-b-0 lg:border-r">
            <NoiseContactForm />
          </FadeIn>

          {/* Aside */}
          <FadeIn
            delay={0.12}
            className="px-6 py-10 flex flex-col gap-8"
            style={{ background: "var(--vn-bone)" }}
          >
            {/* Direct line */}
            <div className="border-b border-foreground/15 pb-7">
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Direct line
              </h5>
              <div
                className="font-serif italic leading-none mb-3"
                style={{ fontSize: "22px", letterSpacing: "-0.01em" }}
              >
                {phone ?? "+1 · 313 · 555 · 0142"}
              </div>
              <p
                className="font-sans text-sm leading-relaxed"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Studio phone, picked up during open hours. Leave a voicemail — we
                listen to all of them, sometimes twice.
              </p>
            </div>

            {/* Hours table */}
            <div className="border-b border-foreground/15 pb-7">
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-4"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Hours
              </h5>
              <div className="flex flex-col gap-1.5">
                {HOURS.map((h) => (
                  <div
                    key={h.day}
                    className="flex justify-between items-baseline"
                  >
                    <span
                      className="font-mono text-[10px] tracking-[0.14em] uppercase"
                      style={{ color: "var(--vn-ink)" }}
                    >
                      {h.day}
                    </span>
                    <span
                      className="font-mono text-[10px] tracking-[0.1em]"
                      style={{ color: h.closed ? "var(--vn-steel-mist)" : "var(--vn-steel)" }}
                    >
                      {h.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stockists */}
            <div className="border-b border-foreground/15 pb-7">
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Stockists
              </h5>
              <div
                className="font-serif italic leading-none mb-2"
                style={{ fontSize: "18px", letterSpacing: "-0.01em" }}
              >
                Eastern Market Pop-Up
              </div>
              <p
                className="font-sans text-sm"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Special orders ship worldwide.
              </p>
            </div>

            {/* Press kit */}
            <div>
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Press kit
              </h5>
              {email && (
                <a
                  href={`mailto:${email}?subject=Press+Kit+Request`}
                  className="vn-stamp text-[9.5px] inline-flex transition-all hover:bg-foreground hover:text-background hover:border-foreground"
                >
                  Request press kit →
                </a>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ — "Frequencies received." */}
      <section
        className="border-b border-foreground/20 px-7 py-16"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto max-w-4xl">
          <div className="flex items-end justify-between mb-10 border-b border-foreground/15 pb-6">
            <div>
              <p
                className="font-mono text-[9.5px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel)" }}
              >
                FAQ
              </p>
              <h2
                className="font-serif italic leading-none tracking-tight"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.02em" }}
              >
                Frequencies received.
              </h2>
            </div>
            <span
              className="font-mono text-[9px] tracking-[0.16em] uppercase hidden md:block"
              style={{ color: "var(--vn-steel-mist)" }}
            >
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
                  <p
                    className="font-sans text-[14px] leading-relaxed pb-5"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </section>

      {/* Visit + Press banner — two-column */}
      <section
        className="grid border-b-2 border-foreground md:grid-cols-2"
      >
        {/* Visit */}
        <div
          className="flex flex-col gap-5 px-10 py-14 border-b border-foreground md:border-b-0 md:border-r"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <span
            className="vn-stamp text-[9.5px] w-fit"
            style={{ borderColor: "var(--vn-bone)", color: "var(--vn-bone)" }}
          >
            By appointment
          </span>
          <h3
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
          >
            Book a fitting
            <br />at the studio.
          </h3>
          <p
            className="font-sans text-[15px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.6)", maxWidth: "36ch" }}
          >
            A private 45 minutes with the atelier team. Tea, the full archive,
            and a tape measure. No commitment.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link
              href="/contact#form"
              className="vn-stamp text-[10.5px] transition-all hover:opacity-80"
              style={{
                background: "var(--vn-bone)",
                color: "var(--vn-ink)",
                borderColor: "var(--vn-bone)",
                padding: "12px 20px",
              }}
            >
              Reserve a slot →
            </Link>
          </div>
        </div>

        {/* Press */}
        <div
          className="flex flex-col gap-5 px-10 py-14"
          style={{ background: "var(--vn-paper)" }}
        >
          <span className="vn-stamp text-[9.5px] w-fit">Press · Editorial</span>
          <h3
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
          >
            Looking to
            <br />feature us?
          </h3>
          <p
            className="font-sans text-[15px] leading-relaxed"
            style={{ color: "var(--vn-ink-soft)", maxWidth: "36ch" }}
          >
            High-res lookbook, biography, garment specs, and quotes from the
            founder. No watermark.
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
              <span
                className="vn-stamp vn-stamp-solid text-[10.5px]"
                style={{ padding: "12px 20px" }}
              >
                press@vndet.co
              </span>
            )}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
