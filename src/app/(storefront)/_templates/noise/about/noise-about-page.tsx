import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { getRichTextFieldValue, parseTemplateIconListRows } from "~/lib/template-fields";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import type { TiptapJSON } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";

const PROCESS_STEPS = [
  {
    n: "01", ix: "SKETCH", dur: "Week 01 · 02",
    title: "Sketch.",
    desc: "Pencil drafts on a coffee receipt. We doodle a hundred lines before one becomes a silhouette worth chasing.",
    svg: <svg viewBox="0 0 100 100" className="w-full h-full"><circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".6"/><path d="M 28 40 Q 50 22 72 38 Q 78 56 60 70 Q 42 78 32 64 Q 24 52 28 40 Z" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    n: "02", ix: "PATTERN", dur: "Week 02 · 04",
    title: "Pattern.",
    desc: "Drafted to a 75th-percentile body, then graded out across XS–XL. Three rounds of paper fittings before fabric is cut.",
    svg: <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M 30 14 L 70 14 L 80 36 L 86 86 L 54 92 L 14 86 L 20 36 Z" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M 50 14 L 50 92 M 30 14 L 14 86 M 70 14 L 86 86" stroke="currentColor" strokeWidth=".8" opacity=".6" strokeDasharray="3 3"/></svg>,
  },
  {
    n: "03", ix: "CUT", dur: "Week 04 · 05",
    title: "Cut.",
    desc: "By hand, on a 1947 maple table. Wiss shears. No laser, no automation. The chalk lines are drawn fresh for every garment.",
    svg: <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="22" y="32" width="56" height="44" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M 22 50 L 78 50 M 50 32 L 50 76" stroke="currentColor" strokeWidth=".8" opacity=".5"/><path d="M 14 22 L 36 22 L 30 38 Z M 86 78 L 64 78 L 70 62 Z" fill="currentColor" opacity=".75"/></svg>,
  },
  {
    n: "04", ix: "SEW", dur: "Week 05 · 12",
    title: "Sew.",
    desc: "Hand-tied diamonds, hand-set buttons, hand-stitched hems. Eighty-two hours for the Cassiopeia. Forty for a wrap.",
    svg: <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M 14 28 Q 30 22 50 28 T 86 28 M 14 50 Q 30 44 50 50 T 86 50 M 14 72 Q 30 66 50 72 T 86 72" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 3"/></svg>,
  },
  {
    n: "05", ix: "SIGN", dur: "Week 12 · 14",
    title: "Sign.",
    desc: "Marisol signs the inside of every placket. The edition number is stamped in ink. Then it ships.",
    svg: <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M 20 70 Q 40 20 50 65 Q 58 95 70 50 Q 76 30 85 42" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="85" cy="42" r="3" fill="currentColor"/></svg>,
  },
] as const;

export function NoiseAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as Record<string, unknown> | undefined;
  const storyBodyContent = getRichTextFieldValue(customFields as unknown, "noise.about-story-body");
  const craftsmanshipListRaw = Array.isArray(customFields?.["noise.about-craftsmanship-list"])
    ? customFields["noise.about-craftsmanship-list"]
    : null;
  const craftsmanshipItems = parseTemplateIconListRows(craftsmanshipListRaw);

  const f = resolveFields(customFields as Record<string, string> | undefined, [
    "noise.about-hero-heading",
    "noise.about-hero-image",
    "noise.about-hero-mission",
    "noise.about-hero-vision",
    "noise.about-story-heading",
    "noise.about-story-image-1",
    "noise.about-craftsmanship-heading",
    "noise.about-craftsmanship-banner",
    "noise.about-cta-heading",
    "noise.about-cta-button-text",
    "noise.about-cta-button-link",
  ]);

  const heroHeading = f["noise.about-hero-heading"] ?? "A small studio cutting loud clothes since 2014.";
  const heroImage = f["noise.about-hero-image"];
  const heroLede = f["noise.about-hero-mission"] ?? "Founded in a former tool-and-die shop on Detroit's east side. Eleven hands, two cutting tables, one rule: if the seam can't take a city block, it doesn't leave the studio.";
  const storyHeading = f["noise.about-story-heading"] ?? "How a small Detroit label gets loud.";
  const ctaHeading = f["noise.about-cta-heading"] ?? "Visit the atelier.";
  const ctaBtnText = f["noise.about-cta-button-text"] ?? "Book a fitting";
  const ctaBtnLink = f["noise.about-cta-button-link"] ?? "/contact";
  const address = business.businessAddress;
  const phone = business.phoneNumber;
  const email = business.supportEmail;

  const BY_NUMBERS = [
    { nm: "142 patterns drawn", desc: "Each one drafted on the studio table, in pencil first, then tested on three to six bodies before sign-off." },
    { nm: "11 full-time hands", desc: "Pattern-makers, sample-cutters, finishers, a single press, and one founder still threading a needle daily." },
    { nm: "60 per edition, max", desc: "We cap every garment run at sixty signed pieces. When they're gone, they're gone — no second drop, no restock." },
    { nm: "42 cities, 7 countries", desc: "From the east side to East London. Shipped via DHL, signed by the wearer, traced through to the studio inbox." },
  ];

  return (
    <PageTransition>
      {/* Hero — image left, text right */}
      <section
        className="grid border-b-2 border-foreground grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* Image */}
        <FadeIn
          direction="left"
          className="relative border-b border-foreground md:border-b-0 md:border-r overflow-hidden"
          style={{ minHeight: "clamp(320px, 50vw, 560px)" }}
        >
          {heroImage ? (
            <Image
              src={heroImage}
              alt={heroHeading}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 55vw"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))` }}
            >
              <p
                className="font-serif italic select-none"
                style={{ fontSize: "120px", color: "var(--vn-bone)", opacity: 0.1 }}
              >
                VN
              </p>
            </div>
          )}
          {/* Address tag */}
          <div
            className="absolute left-5 top-5 font-mono text-[9.5px] tracking-[0.2em] uppercase px-2.5 py-1.5"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            The Atelier · {address ?? "1217 Gratiot Ave"}
          </div>
          {/* Caption overlay */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-5 pt-20"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 30%, transparent)" }}
          >
            <span className="font-serif italic text-lg" style={{ color: "var(--vn-bone)" }}>
              Visual Noise
            </span>
            <span
              className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
              style={{ color: "var(--vn-bone)", opacity: 0.7 }}
            >
              Detroit, Michigan
            </span>
          </div>
        </FadeIn>

        {/* Words */}
        <FadeIn
          direction="right"
          delay={0.15}
          className="flex flex-col justify-between gap-8 px-7 py-10 md:px-10 md:py-14"
          style={{ background: "var(--vn-paper)" }}
        >
          <div className="flex flex-col gap-6">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel)" }}
            >
              Section / 07 — The Studio
            </p>
            <h1
              className="font-serif italic leading-[1.0] tracking-tight"
              style={{
                fontSize: "clamp(2.2rem, 4.5vw, 4.5rem)",
                letterSpacing: "-0.025em",
              }}
            >
              {heroHeading}
            </h1>
            <p
              className="font-sans text-[15px] leading-relaxed max-w-[40ch]"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              {heroLede}
            </p>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t pt-5"
            style={{ borderColor: "var(--vn-rule)" }}
          >
            {[
              { k: "2014", v: "Founded — Det." },
              { k: "11", v: "Hands in the room" },
              { k: "3.2k", v: "sq ft of floor" },
              { k: "142", v: "Patterns drawn" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 pr-3"
                style={{ borderRight: i < 3 ? "1px solid var(--vn-rule)" : "none" }}
              >
                <span
                  className="font-serif italic leading-none"
                  style={{ fontSize: "clamp(1.4rem, 2.2vw, 2rem)", letterSpacing: "-0.02em" }}
                >
                  {stat.k}
                </span>
                <span
                  className="font-mono text-[8.5px] tracking-[0.16em] uppercase"
                  style={{ color: "var(--vn-steel)" }}
                >
                  {stat.v}
                </span>
              </div>
            ))}
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
                fontSize: "clamp(1.4rem, 2.8vw, 2.2rem)",
                color: "var(--vn-bone)",
                opacity: 0.75,
                letterSpacing: "-0.01em",
              }}
            >
              Cut, sewn, signed, sent — from Detroit
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
              Eleven hands, one room
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
              Since 2014
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
              Heavy on the iron, light on the spectacle
              <span className="font-mono not-italic mx-5" style={{ fontSize: "12px", color: "var(--vn-steel-mist)" }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Intro spread — two columns */}
      <section
        className="border-b border-foreground/20 px-7 py-20"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="mx-auto max-w-7xl grid grid-cols-1 gap-14 lg:grid-cols-[1fr_0.75fr] items-start">
          {/* Left — story text */}
          <FadeIn direction="left">
            <h2
              className="font-serif italic leading-[1.0] tracking-tight mb-8"
              style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", letterSpacing: "-0.02em" }}
            >
              {storyHeading}
            </h2>
            {storyBodyContent ? (
              <div className="prose prose-base max-w-none prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.7] prose-p:text-foreground/80">
                <TiptapRenderer content={storyBodyContent as TiptapJSON} />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {[
                  "We started Visual Noise in the back of an old tool-and-die shop on Gratiot, with a maple cutting table inherited from a retired Detroit tailor and a single bolt of black wool crepe. The first season was six pieces. Three of them sold in person at a basement pop-up on Trumbull, the other three to a stylist working out of New York who'd driven in for her cousin's wedding.",
                  "Twelve years later the table is still the table — the same Wiss shears, the same radio that hasn't been off since we moved in. What's changed is the room around it: eleven full-time hands, a North Carolina mill on speed-dial, and a small archive of one hundred and forty-two patterns drawn, draped and signed off.",
                  "Everything we make is cut, sewn, and finished in this building. Nothing is outsourced. Every label is hand-numbered. We sign the last seam ourselves. If two people own the same piece, one of them got it wrong.",
                ].map((para, i) => (
                  <p
                    key={i}
                    className="font-sans text-[15px] leading-[1.7]"
                    style={{ color: "var(--vn-ink-soft)" }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}
          </FadeIn>

          {/* Right — by the numbers */}
          <FadeIn direction="right" delay={0.15}>
            <div
              className="border border-foreground p-7 flex flex-col gap-6"
              style={{ background: "var(--vn-bone)" }}
            >
              <h5
                className="font-mono text-[9.5px] tracking-[0.22em] uppercase border-b pb-4"
                style={{ color: "var(--vn-steel-mist)", borderColor: "var(--vn-rule)" }}
              >
                By the numbers
              </h5>
              {BY_NUMBERS.map((fact) => (
                <div key={fact.nm} className="flex flex-col gap-1.5">
                  <div
                    className="font-serif italic leading-none"
                    style={{ fontSize: "22px", letterSpacing: "-0.01em" }}
                  >
                    {fact.nm}
                  </div>
                  <p
                    className="font-sans text-sm leading-relaxed"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {fact.desc}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pull quote — ink bg */}
      <section
        className="border-y-2 border-foreground px-7 py-20"
        style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
      >
        <FadeIn className="mx-auto max-w-4xl">
          <div
            className="font-serif italic leading-none mb-4"
            style={{ fontSize: "80px", opacity: 0.25, lineHeight: 0.8 }}
          >
            &ldquo;
          </div>
          <p
            className="font-serif italic leading-[1.2]"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)", letterSpacing: "-0.01em", maxWidth: "36ch" }}
          >
            A garment that doesn&apos;t pick a fight with the room it walks into
            isn&apos;t trying hard enough. We make clothes for people who actually
            want to be seen.
          </p>
          <div className="mt-8">
            <em
              className="font-serif italic block"
              style={{ fontSize: "20px" }}
            >
              Marisol Knight
            </em>
            <p
              className="font-mono text-[10px] tracking-[0.2em] uppercase mt-1"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Founder · Head of atelier
            </p>
          </div>
        </FadeIn>
      </section>

      {/* Process — from sketch to seam */}
      <section
        className="border-b border-foreground/20 px-7 py-20"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between mb-12 gap-6">
            <div>
              <p
                className="font-mono text-[9.5px] tracking-[0.22em] uppercase mb-3"
                style={{ color: "var(--vn-steel)" }}
              >
                How a garment is made
              </p>
              <h2
                className="font-serif italic leading-none tracking-tight"
                style={{ fontSize: "clamp(2.2rem, 4vw, 3.5rem)", letterSpacing: "-0.02em" }}
              >
                From <em style={{ color: "var(--vn-steel)" }}>sketch</em>
                <br />to seam.
              </h2>
            </div>
            <div
              className="hidden md:block font-mono text-[10px] tracking-[0.16em] uppercase text-right"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Five stages.
              <br />
              Six to fourteen weeks.
              <br />
              Eleven pairs of hands.
            </div>
          </div>

          <StaggerContainer
            className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-5"
            staggerDelay={0.08}
          >
            {PROCESS_STEPS.map((step) => (
              <StaggerItem key={step.n}>
                <div
                  className="flex flex-col border border-foreground/20 p-5 h-full"
                  style={{ background: "var(--vn-steel)" }}
                >
                  {/* SVG icon */}
                  <div
                    className="mb-4"
                    style={{ width: "56px", height: "56px", color: "var(--vn-bone)" }}
                  >
                    {step.svg}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="font-mono text-[9px] tracking-[0.18em] uppercase"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {step.n}
                    </span>
                    <span
                      className="font-mono text-[8.5px] tracking-[0.22em] uppercase"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {step.ix}
                    </span>
                  </div>
                  <h4
                    className="font-serif italic leading-none mb-2"
                    style={{ fontSize: "22px", letterSpacing: "-0.01em", color: "var(--vn-bone)" }}
                  >
                    {step.title}
                  </h4>
                  <p
                    className="font-sans text-sm leading-relaxed flex-1"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {step.desc}
                  </p>
                  <p
                    className="font-mono text-[9px] tracking-[0.14em] uppercase mt-4"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {step.dur}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>
      </section>

      {/* Craftsmanship features (if configured) */}
      {craftsmanshipItems && craftsmanshipItems.length > 0 && (
        <section
          className="border-b border-foreground/20 px-7 py-20"
          style={{ background: "var(--vn-bone)" }}
        >
          <FadeIn className="mx-auto max-w-7xl">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase mb-3"
              style={{ color: "var(--vn-steel)" }}
            >
              {f["noise.about-craftsmanship-heading"] ?? "Craftsmanship"}
            </p>
            {f["noise.about-craftsmanship-banner"] && (
              <p className="font-serif italic text-lg mb-10" style={{ color: "var(--vn-ink-soft)" }}>
                {f["noise.about-craftsmanship-banner"]}
              </p>
            )}
            <StaggerContainer
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
              staggerDelay={0.08}
            >
              {craftsmanshipItems.map((item, i) => (
                <StaggerItem key={i}>
                  <div className="border-t-2 border-foreground pt-5">
                    <item.icon className="mb-3 size-5" style={{ color: "var(--vn-steel)" }} />
                    <h3
                      className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
                      style={{ color: "var(--vn-ink)" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="font-sans text-sm leading-relaxed"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {item.description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </FadeIn>
        </section>
      )}

      {/* CTA — two-column: visit + location */}
      <section
        className="grid border-b-2 border-foreground md:grid-cols-2"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* Left */}
        <div
          className="flex flex-col gap-6 px-10 py-16 border-b border-foreground md:border-b-0 md:border-r"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <span
            className="vn-stamp text-[9.5px] w-fit"
            style={{ borderColor: "var(--vn-bone)", color: "var(--vn-bone)" }}
          >
            Come by
          </span>
          <h2
            className="font-serif italic leading-none tracking-tight"
            style={{ fontSize: "clamp(2.8rem, 5vw, 4.5rem)", letterSpacing: "-0.025em" }}
          >
            {ctaHeading}
          </h2>
          <p
            className="font-sans text-[15px] leading-relaxed max-w-[38ch]"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Forty-five quiet minutes with the team. We pull your size, pour tea,
            walk you through the archive, and never ask you to commit.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={ctaBtnLink}
              className="vn-stamp vn-stamp-steel text-[11px] transition-all hover:opacity-80"
              style={{ padding: "12px 20px" }}
            >
              {ctaBtnText} →
            </Link>
            {email && (
              <a
                href={`mailto:${email}`}
                className="vn-stamp text-[11px] transition-all hover:bg-foreground hover:text-background"
                style={{ borderColor: "var(--vn-bone)", color: "var(--vn-bone)", padding: "12px 20px" }}
              >
                Email the studio
              </a>
            )}
          </div>
        </div>

        {/* Right — location */}
        <div
          className="flex flex-col gap-6 px-10 py-16"
          style={{ background: "var(--vn-bone)" }}
        >
          <h5
            className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Where to find us
          </h5>
          <div
            className="font-serif italic leading-[1.1]"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.5rem)", letterSpacing: "-0.02em" }}
          >
            {address ?? "1217 Gratiot Ave."}
            <br />
            Detroit, MI 48207
          </div>
          <p
            className="font-sans text-sm leading-relaxed"
            style={{ color: "var(--vn-steel-mist)", maxWidth: "36ch" }}
          >
            Two blocks east of Eastern Market. The blue door with the brass
            knocker — it&apos;s open if the light&apos;s on.
          </p>
          <div
            className="font-mono text-[11px] leading-relaxed tracking-[0.06em]"
            style={{ color: "var(--vn-steel)" }}
          >
            42.3314° N<br />
            83.0458° W<br />
            {phone && <><br />{phone}</>}
            {email && <><br />{email}</>}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
