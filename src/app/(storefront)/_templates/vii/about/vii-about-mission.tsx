"use client";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  body: string;
};

export function ViiAboutMission({
  overline,
  heading,
  headingAccent,
  body,
}: Props) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.1);
  const { ref: bodyRef, visible: bodyVisible } = useViiReveal(0.1);

  return (
    <section
      aria-labelledby="about-mission-heading"
      {...sectionGroupAttr("about", "mission")}
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div
          ref={headRef}
          className={cn("vii-reveal", headVisible && "is-visible")}
        >
          {overline && (
            <ViiOverline
              align="center"
              tone="light"
              style={{ marginBottom: 14 }}
              fieldKey="vii.about.mission-overline"
            >
              {overline}
            </ViiOverline>
          )}

          <h2
            id="about-mission-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5.5vw, 72px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}{" "}
            <em
              {...fieldAttr("vii.about.mission-heading-accent")}
              style={{ fontStyle: "italic", color: "var(--vii-copper)" }}
            >
              {headingAccent}
            </em>
          </h2>
        </div>

        {body && (
          <div
            ref={bodyRef}
            className={cn("vii-reveal", bodyVisible && "is-visible")}
            style={{ marginTop: 32 }}
          >
            <p
              {...fieldAttr("vii.about.mission-body")}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
                margin: "0 auto",
                maxWidth: "62ch",
              }}
            >
              {body}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
