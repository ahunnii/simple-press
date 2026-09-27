import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { dreamTelHref } from "../shared/dream-contact-details";
import { DreamHeading } from "../shared/dream-heading";
import { DreamSection } from "../shared/dream-section";

type Props = {
  heading: string;
  email?: string;
  phone?: string;
  /** Settings → Business Hours rows; wins over `legacyHours`. */
  hoursRows: { label: string; value: string }[];
  /** Legacy saved single-line hours, used only when `hoursRows` is empty. */
  legacyHours?: string;
  serviceArea: string;
};

/**
 * Email / phone / hours / service-area lines, each hidden when blank
 * (design.md "Estimate Quote › Contact info"). Email, phone and hours come
 * from Settings (with the retired `dream.global.contact-*` fields as a silent
 * legacy fallback — see `resolveDreamContactDetails`); service area is the
 * `dream.global.service-area` field. This section only owns its heading.
 * Hideable (contact.info), and hides itself when every line is blank.
 */
export function DreamContactInfo({
  heading,
  email,
  phone,
  hoursRows,
  legacyHours,
  serviceArea,
}: Props) {
  const area = serviceArea.trim();
  const hasHours = hoursRows.length > 0 || Boolean(legacyHours);
  if (!email && !phone && !hasHours && !area) return null;

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
        <ul className="mt-6 flex flex-col gap-2 text-[var(--dream-soft)]">
          {email ? (
            <li>
              <a href={`mailto:${email}`} className="dream-link">
                {email}
              </a>
            </li>
          ) : null}
          {phone ? (
            <li>
              <a href={dreamTelHref(phone)} className="dream-link">
                {phone}
              </a>
            </li>
          ) : null}
          {hoursRows.length > 0 ? (
            <li>
              <dl className="m-0 flex flex-col gap-1">
                {hoursRows.map((row, i) => (
                  <div
                    key={`${row.label}-${i}`}
                    className="flex flex-wrap justify-center gap-x-2"
                  >
                    <dt>{row.label}</dt>
                    <dd className="m-0">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ) : legacyHours ? (
            <li>{legacyHours}</li>
          ) : null}
          {area ? (
            <li {...fieldAttr("dream.global.service-area")}>{area}</li>
          ) : null}
        </ul>
      </div>
    </DreamSection>
  );
}
