import type { ImpactPeopleGroup } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactPortrait } from "./wealth-impact-devices";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_PEOPLE_ID = "impact-people";

/**
 * Our people (surface). One block per group: a Jost caps subhead (h3) in a
 * left column on desktop, a grid of circle portraits on the right (3-up, 4-up
 * when the group has four or more). Name in Jost semibold caps, role in
 * Titillium caps. A person with no photo gets the initials portrait. On
 * phones each person becomes a row (portrait left, text right).
 *
 * Section number + visibility are the orchestrator's job.
 */
export function WealthImpactPeople({
  f,
  number,
  groups,
}: {
  f: ImpactFields;
  /** Render-order section number (cover = 1). */
  number: number;
  /** `parseImpactPeople(...)` output (non-empty, every person has a name). */
  groups: ImpactPeopleGroup[];
}) {
  const id = IMPACT_PEOPLE_ID;
  const heading = val(f, K.peopleHeading);
  return (
    <section
      {...sectionGroupAttr("impact", "people")}
      {...anchorProps(id, heading)}
      className="wealth-section wealth-on-surface wealth-impact-anchor"
    >
      <div className="wealth-container">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          eyebrow={val(f, K.peopleEyebrow)}
          eyebrowKey={K.peopleEyebrow}
          heading={heading}
          headingKey={K.peopleHeading}
        />
        <div className="wealth-impact-people">
          {groups.map((group, gi) => (
            <WealthReveal
              key={`${gi}-${group.name}`}
              threshold={0}
              className={cn(
                "wealth-impact-people__group",
                !group.name && "wealth-impact-people__group--nosub",
              )}
            >
              {group.name ? (
                <h3 className="wealth-impact-people__sub">{group.name}</h3>
              ) : null}
              <ul
                className={cn(
                  "wealth-impact-people__grid",
                  group.people.length >= 4 && "wealth-impact-people__grid--4",
                )}
              >
                {group.people.map((p) => (
                  <li
                    key={p.id}
                    {...listItemAttr(K.peopleItems, p.index)}
                    className="wealth-impact-person"
                  >
                    <ImpactPortrait
                      src={p.image}
                      alt={p.imageAlt}
                      name={p.name}
                    />
                    <p className="wealth-impact-person__name">{p.name}</p>
                    {p.role ? (
                      <p className="wealth-impact-person__role">{p.role}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </WealthReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
