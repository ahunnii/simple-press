import { fieldAttr } from "~/lib/preview/section-attrs";

import {
  GloveButton,
  GloveContainer,
  GloveReveal,
  GloveSection,
} from "../shared";
import { gloveIsExternal } from "../steps/glove-links";

const DECO_BASE = "/templates/glove/images";

type GloveHomeVipProps = {
  heading: string;
  body: string;
  note: string;
  buttonLabel: string;
  buttonUrl: string;
  sectionAttrs?: Record<string, string>;
};

/** Decorative shape, tinted from the brand token via a CSS mask. */
function Deco({ file, className }: { file: string; className: string }) {
  const mask = `url(${DECO_BASE}/${file})`;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bg-[var(--glove-primary-tint)] ${className}`}
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

/**
 * Newsletter band on mist (not purple: the two bands above it already are).
 * There is no public subscribe endpoint, so the button sends shoppers to
 * create an account and the helper text says where they opt in. No email
 * input: nothing here pretends to subscribe anyone.
 */
export function GloveHomeVip({
  heading,
  body,
  note,
  buttonLabel,
  buttonUrl,
  sectionAttrs,
}: GloveHomeVipProps) {
  return (
    <GloveSection
      tone="mist"
      aria-labelledby="glove-vip-heading"
      sectionAttrs={sectionAttrs}
      contained={false}
      reveal={false}
      className="relative overflow-hidden"
    >
      <GloveContainer className="relative">
        <Deco
          file="newsletter-deco-1.png"
          className="top-0 left-0 h-[72px] w-[81px] opacity-60 max-xl:hidden"
        />
        <Deco
          file="newsletter-deco-2.png"
          className="right-0 bottom-0 size-[52px] opacity-60 max-xl:hidden"
        />
        <GloveReveal>
          <div className="mx-auto grid max-w-[980px] items-center gap-8 md:grid-cols-[1.25fr_1fr] md:gap-14">
            <div className="text-center md:text-left">
              <h2
                id="glove-vip-heading"
                className="glove-display text-[clamp(26px,3.2vw,40px)] leading-[1.25] font-medium text-[var(--glove-primary)]"
                {...fieldAttr("glove.homepage.vip-heading")}
              >
                {heading}
              </h2>
              {body ? (
                <p
                  className="glove-body mx-auto mt-3 max-w-[64ch] text-[16px] leading-[1.6] text-[var(--glove-text)] md:mx-0"
                  {...fieldAttr("glove.homepage.vip-body")}
                >
                  {body}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
              {buttonLabel && buttonUrl ? (
                <GloveButton
                  href={buttonUrl}
                  external={gloveIsExternal(buttonUrl)}
                  size="md"
                >
                  <span {...fieldAttr("glove.homepage.vip-button-label")}>
                    {buttonLabel}
                  </span>
                </GloveButton>
              ) : null}
              {note ? (
                <p
                  className="glove-body max-w-[38ch] text-[14px] leading-[1.6] text-[var(--glove-muted)]"
                  {...fieldAttr("glove.homepage.vip-note")}
                >
                  {note}
                </p>
              ) : null}
            </div>
          </div>
        </GloveReveal>
      </GloveContainer>
    </GloveSection>
  );
}
