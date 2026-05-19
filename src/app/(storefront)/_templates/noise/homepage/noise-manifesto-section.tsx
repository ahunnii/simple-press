import { FadeIn } from "~/components/page-animations";

const RULES = [
  {
    num: "01",
    title: "Couture, audible",
    body: "Every seam is a sentence. We cut garments that announce themselves before they speak — drape that swings, weave that catches the light from across the street.",
  },
  {
    num: "02",
    title: "Made in 313",
    body: "Drawn, draped, and finished in a studio off Woodward. Detroit hands, Detroit pace — heavy on the iron, light on the spectacle.",
  },
  {
    num: "03",
    title: "One of one",
    body: "Small runs. Numbered editions. If two people own the same piece, one of them got it wrong. We sign every label by hand.",
  },
];

export function NoiseManifestoSection() {
  return (
    <section
      className="border-b border-foreground/20 px-7 py-20"
      style={{ background: "var(--vn-paper)" }}
    >
      <FadeIn>
        <div className="mx-auto max-w-7xl grid grid-cols-1 gap-10 md:grid-cols-[1.1fr_1fr_1fr_1fr] md:gap-9">
          {/* Left column — heading */}
          <div>
            <p
              className="font-mono text-[9.5px] tracking-[0.18em] uppercase mb-5 block"
              style={{ color: "var(--vn-steel)" }}
            >
              Section / 01 — What we make
            </p>
            <h2
              className="font-serif italic leading-[0.95] tracking-tight"
              style={{
                fontSize: "clamp(2.2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Three rules
              <br />
              of the studio.
            </h2>
          </div>

          {/* Rule columns */}
          {RULES.map((rule) => (
            <div key={rule.num}>
              <h4
                className="font-mono text-[10.5px] tracking-[0.22em] uppercase mb-3.5"
                style={{ color: "var(--vn-steel)" }}
              >
                {rule.num} / {rule.title}
              </h4>
              <p
                className="font-serif italic leading-[1.25]"
                style={{ fontSize: "22px", letterSpacing: "-0.005em" }}
              >
                {rule.body}
              </p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
