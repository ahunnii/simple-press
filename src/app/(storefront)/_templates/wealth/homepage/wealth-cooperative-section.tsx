import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLink } from "../shared/wealth-link";
import { WealthSection } from "../shared/wealth-section";
import { WealthSectionHeading } from "../shared/wealth-section-heading";

type Props = {
  heading: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
  /**
   * When rendered as the right column of the shared band+cooperative desktop
   * row (the live site's float pair), the homepage supplies the container so
   * this section renders unpadded and left-aligned in its column.
   */
  contained?: boolean;
  className?: string;
};

/** What Is a Cooperative? — definition copy with a Resources link out. */
export function WealthCooperativeSection({
  heading,
  body,
  linkLabel,
  linkUrl,
  contained,
  className,
}: Props) {
  return (
    <WealthSection
      sectionAttrs={sectionGroupAttr("homepage", "cooperative")}
      contained={contained}
      className={className}
    >
      <div className={contained === false ? "max-w-xl" : "mx-auto max-w-3xl"}>
        <WealthSectionHeading className="mb-4">
          <span {...fieldAttr("wealth.homepage.cooperative-heading")}>
            {heading}
          </span>
        </WealthSectionHeading>
        <p className="mb-4" {...fieldAttr("wealth.homepage.cooperative-body")}>
          {body}
        </p>
        {linkLabel && linkUrl ? (
          <p>
            <WealthLink href={linkUrl}>
              <span {...fieldAttr("wealth.homepage.cooperative-link-label")}>
                {linkLabel}
              </span>
            </WealthLink>
          </p>
        ) : null}
      </div>
    </WealthSection>
  );
}
