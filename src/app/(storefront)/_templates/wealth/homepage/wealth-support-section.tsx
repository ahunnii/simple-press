import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthSection } from "../shared/wealth-section";
import { WealthSectionHeading } from "../shared/wealth-section-heading";

type Props = {
  heading: string;
  body: string;
  buttonLabel: string;
  /**
   * The homepage orchestrator renders Support DCWF beside Mission in a 2-col
   * desktop region (design.md: "narrow right column"), so it supplies the
   * shared container/gutter and per-row padding itself and asks this
   * section to render unpadded/uncontained.
   */
  contained?: boolean;
  className?: string;
};

/**
 * Support DCWF — narrow sidebar-style donate callout. Hideable, and the
 * caller additionally forces it off entirely when the `donations` feature
 * flag is disabled (no /donate route to send visitors to).
 */
export function WealthSupportSection({
  heading,
  body,
  buttonLabel,
  contained,
  className,
}: Props) {
  return (
    <WealthSection
      sectionAttrs={sectionGroupAttr("homepage", "support")}
      contained={contained}
      className={className}
    >
      <div className="max-w-md">
        <WealthSectionHeading className="mb-4">
          <span {...fieldAttr("wealth.homepage.support-heading")}>
            {heading}
          </span>
        </WealthSectionHeading>
        <p className="mb-6" {...fieldAttr("wealth.homepage.support-body")}>
          {body}
        </p>
        <WealthLedgeButton href="/donate" variant="donate">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M12 21s-7.5-4.6-10.2-9.3C.3 9 1.4 5.4 4.7 4.4c2-.6 4 .1 5.3 1.8C11.3 4.5 13.3 3.8 15.3 4.4c3.3 1 4.4 4.6 2.9 7.3C15.5 16.4 12 21 12 21z" />
          </svg>
          <span {...fieldAttr("wealth.homepage.support-button-label")}>
            {buttonLabel}
          </span>
        </WealthLedgeButton>
      </div>
    </WealthSection>
  );
}
