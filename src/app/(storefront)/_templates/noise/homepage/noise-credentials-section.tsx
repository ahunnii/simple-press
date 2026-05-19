import { FadeIn } from "~/components/page-animations";

type NoiseCredentialsSectionProps = {
  address?: string;
};

const STAMPS = ["Hand-stitched", "Numbered editions", "Deadstock yarns"] as const;

export function NoiseCredentialsSection({ address }: NoiseCredentialsSectionProps) {
  return (
    <section
      className="border-y-2 border-foreground px-7 py-20"
      style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
    >
      <FadeIn>
        <div className="mx-auto max-w-7xl grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1.4fr] items-start">
          {/* Left — large italic headline */}
          <h2
            className="font-serif italic leading-[0.92] tracking-tight"
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
              className="grid grid-cols-1 sm:grid-cols-2 gap-9 border-t pt-6"
              style={{ borderColor: "#2a2c30" }}
            >
              {/* Atelier story */}
              <div>
                <h5
                  className="font-mono text-[10.5px] tracking-[0.2em] uppercase mb-3"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  The atelier
                </h5>
                <p
                  className="font-serif italic leading-[1.25]"
                  style={{ fontSize: "22px" }}
                >
                  Founded 2014 in a former tool & die shop on the east side. We
                  make garments the way the city makes everything else — by hand,
                  in small batches, with the lights on late.
                </p>
              </div>

              {/* Coordinates */}
              <div>
                <h5
                  className="font-mono text-[10.5px] tracking-[0.2em] uppercase mb-3"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Coordinates
                </h5>
                <p
                  className="font-mono text-sm leading-relaxed"
                  style={{ letterSpacing: "0.04em", color: "var(--vn-bone)" }}
                >
                  42.3314° N
                  <br />
                  83.0458° W
                  <br />
                  <br />
                  {address ?? "Detroit, MI 48207"}
                  <br />
                  <br />
                  Open by appointment.
                </p>
              </div>
            </div>

            {/* Stamps */}
            <div className="flex flex-wrap gap-2.5 mt-8">
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
