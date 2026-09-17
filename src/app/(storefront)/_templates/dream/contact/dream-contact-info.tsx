import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamHeading } from "../shared/dream-heading";
import { DreamSection } from "../shared/dream-section";

type Props = {
  heading: string;
  email: string;
  phone: string;
  hours: string;
  serviceArea: string;
};

/**
 * Email / phone / hours / service-area lines, each hidden when blank
 * (design.md "Estimate Quote › Contact info"). The four values are
 * `dream.global.*` fields already defined in the template root — this
 * section only owns its own heading. Hideable (contact.info).
 */
export function DreamContactInfo({
  heading,
  email,
  phone,
  hours,
  serviceArea,
}: Props) {
  // Service area alone doesn't earn a band (finish-review "Rest/empty
  // states"): hide the whole section unless there's at least one of
  // email/phone/hours to show alongside it.
  const hasCoreContact =
    email.trim().length > 0 ||
    phone.trim().length > 0 ||
    hours.trim().length > 0;
  if (!hasCoreContact) return null;

  const lines = [
    { value: email, key: "dream.global.contact-email" },
    { value: phone, key: "dream.global.contact-phone" },
    { value: hours, key: "dream.global.contact-hours" },
    { value: serviceArea, key: "dream.global.service-area" },
  ].filter((line) => line.value.trim().length > 0);

  return (
    <DreamSection
      sectionAttrs={sectionGroupAttr("contact", "info")}
      aria-label="Contact info"
      tone="sky"
    >
      <div className="mx-auto max-w-[520px] text-center">
        <DreamHeading as="h2" fieldKey="dream.contact.info-heading">
          {heading}
        </DreamHeading>
        {lines.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-2 text-[var(--dream-soft)]">
            {lines.map((line) => (
              <li key={line.key} {...fieldAttr(line.key)}>
                {line.value}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DreamSection>
  );
}
