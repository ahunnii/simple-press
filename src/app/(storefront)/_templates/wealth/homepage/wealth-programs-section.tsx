import { ArrowRightLeft, HandCoins, Network, Sprout } from "lucide-react";

import type { WealthProgramTone } from "../shared/wealth-program-card";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthLink } from "../shared/wealth-link";
import { WealthProgramCard } from "../shared/wealth-program-card";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";
import { renderBoldMarkup } from "./wealth-bold-markup";

export type WealthProgramCardData = {
  /** lending | incubator | transitions | cend — picks tone + icon + keys. */
  slug: "lending" | "incubator" | "transitions" | "cend";
  title: string;
  copy: string;
  /** Button href; "" hides the button (blank or points at a disabled feature). */
  href: string;
  /** Owner's button label; blank hides the button. */
  ctaLabel: string;
  ctaLabelKey: string;
};

type Props = {
  cards: WealthProgramCardData[];
  footnoteHeading: string;
  footnoteBody: string;
  footnoteLinkLabel: string;
  /** "" hides the link (blank or points at a disabled feature). */
  footnoteLinkHref: string;
  /** `flush-top` when the intro sits above on the same paper. */
  spacing: "default" | "flush-top";
  /** h2 when the intro (and its h2) is hidden, otherwise h3. */
  titleAs: "h2" | "h3";
};

const ICON_PROPS = { "aria-hidden": true, focusable: false } as const;

const CARD_STYLE: Record<
  WealthProgramCardData["slug"],
  { tone: WealthProgramTone; icon: React.ReactNode }
> = {
  lending: { tone: "forest", icon: <HandCoins {...ICON_PROPS} /> },
  incubator: { tone: "primary", icon: <Sprout {...ICON_PROPS} /> },
  transitions: { tone: "sage", icon: <ArrowRightLeft {...ICON_PROPS} /> },
  cend: { tone: "surface", icon: <Network {...ICON_PROPS} /> },
};

/**
 * Programs — four solid color cards (forest / primary / sage / surface) with a
 * line icon, number, italic title, copy and a button, then the cooperative
 * footnote. A card without a title is skipped; numbers follow what renders.
 */
export function WealthProgramsSection({
  cards,
  footnoteHeading,
  footnoteBody,
  footnoteLinkLabel,
  footnoteLinkHref,
  spacing,
  titleAs,
}: Props) {
  const shown = cards.filter((card) => card.title.trim() !== "");
  const hasFootnote = footnoteBody.trim() !== "";
  return (
    <WealthBlock
      tone="paper"
      spacing={spacing}
      {...sectionGroupAttr("homepage", "programs")}
    >
      <WealthRevealGroup className="wealth-programs">
        {shown.map((card, i) => {
          const style = CARD_STYLE[card.slug];
          const showCta = card.href !== "" && card.ctaLabel.trim() !== "";
          const external = /^https?:\/\//i.test(card.href);
          return (
            <WealthProgramCard
              key={card.slug}
              className="wealth-reveal-item"
              style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
              tone={style.tone}
              icon={style.icon}
              number={String(i + 1).padStart(2, "0")}
              title={card.title}
              titleAs={titleAs}
              titleProps={fieldAttr(
                `wealth.homepage.programs-tile-${card.slug}-label`,
              )}
              copy={card.copy}
              copyProps={fieldAttr(
                `wealth.homepage.programs-tile-${card.slug}-copy`,
              )}
              cta={
                showCta
                  ? {
                      href: card.href,
                      external,
                      label: (
                        <>
                          <span {...fieldAttr(card.ctaLabelKey)}>
                            {card.ctaLabel}
                          </span>
                          {external ? (
                            <span aria-hidden="true"> &#8599;</span>
                          ) : null}
                        </>
                      ),
                    }
                  : null
              }
            />
          );
        })}
      </WealthRevealGroup>

      {hasFootnote ? (
        <WealthReveal className="wealth-center wealth-muted mx-auto mt-[51px] max-w-[720px]">
          <p>
            {footnoteHeading.trim() ? (
              <strong
                className="mb-1 block text-[color:var(--wealth-btn-ink)]"
                {...fieldAttr("wealth.homepage.cooperative-heading")}
              >
                {footnoteHeading}
              </strong>
            ) : null}
            {/* No fieldAttr: transformed text (`**` → <strong>). */}
            {renderBoldMarkup(
              footnoteBody,
              "font-bold text-[color:var(--wealth-btn-ink)]",
            )}
            {footnoteLinkHref !== "" && footnoteLinkLabel.trim() ? (
              <>
                {" "}
                <WealthLink
                  href={footnoteLinkHref}
                  className="wealth-link--ink"
                >
                  <span
                    {...fieldAttr("wealth.homepage.cooperative-link-label")}
                  >
                    {footnoteLinkLabel}
                  </span>
                </WealthLink>
              </>
            ) : null}
          </p>
        </WealthReveal>
      ) : null}
    </WealthBlock>
  );
}
