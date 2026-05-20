import { FadeIn } from "~/components/page-animations";

type NoiseCredentialsSectionProps = {
  address?: string;
};

const STAMPS = [
  "Hand-stitched",
  "Numbered editions",
  "Deadstock yarns",
] as const;

export function NoiseCredentialsSection({
  address,
}: NoiseCredentialsSectionProps) {
  return (
    <section
      className="border-foreground border-y-2 px-7 py-20"
      style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
    >
      <FadeIn>
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-14 lg:grid-cols-[1fr_1.4fr]">
          {/* Left — large italic headline */}
          <h2
            className="font-serif leading-[0.92] tracking-tight italic"
            style={{
              fontSize: "clamp(2.4rem, 9vw, 5.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            A studio
            <br />
            <span
              style={{
                display: "inline-block",
                background: "var(--vn-steel)",
                padding: "0 14px",
                marginRight: "6px",
              }}
            >
              in Detroit
            </span>
            <br />
            that makes noise
            <br />
            on purpose.
          </h2>

          {/* Right — body */}
          <div>
            <div
              className="grid grid-cols-1 gap-9 border-t pt-6 sm:grid-cols-2"
              style={{ borderColor: "#2a2c30" }}
            >
              {/* Atelier story */}
              <div>
                <h5
                  className="mb-3 font-mono text-[10.5px] tracking-[0.2em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  The studio
                </h5>
                <p
                  className="font-serif leading-[1.25] italic"
                  style={{ fontSize: "22px" }}
                >
                  Established in 2011, Visual Noise is a studio for haute
                  couture crochet fashion. We make garments the way the city
                  makes everything else — by hand, in small batches, with the
                  lights on late.
                </p>
              </div>

              {/* Coordinates */}
              <div>
                <h5
                  className="mb-3 font-mono text-[10.5px] tracking-[0.2em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Location
                </h5>
                <p
                  className="font-mono text-sm leading-relaxed"
                  style={{ letterSpacing: "0.04em", color: "var(--vn-bone)" }}
                >
                  {address ?? "Detroit, MI 48207"}
                  <br />
                  <br />
                  Open by appointment.
                </p>
              </div>
            </div>

            {/* Stamps */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {STAMPS.map((s) => (
                <span
                  key={s}
                  className="vn-stamp"
                  style={{
                    borderColor: "var(--vn-bone)",
                    color: "var(--vn-bone)",
                  }}
                >
                  {s}
                </span>
              ))}
              <span className="vn-stamp vn-stamp-steel">Made in MI</span>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
