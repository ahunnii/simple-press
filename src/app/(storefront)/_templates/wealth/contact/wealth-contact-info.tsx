import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  addressLine1: string;
  addressLine2: string;
  appointmentLabel: string;
};

/** Address note block. Hideable (contact.info). */
export function WealthContactInfo({
  addressLine1,
  addressLine2,
  appointmentLabel,
}: Props) {
  return (
    <section
      aria-label="Office address"
      {...sectionGroupAttr("contact", "info")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[720px] px-[var(--wealth-gutter)] text-center">
        {addressLine1 ? (
          <p {...fieldAttr("wealth.contact.info-address-line1")}>
            {addressLine1}
          </p>
        ) : null}
        {addressLine2 ? (
          <p
            {...fieldAttr("wealth.contact.info-address-line2")}
            className="mt-1"
          >
            {addressLine2}
          </p>
        ) : null}
        {appointmentLabel ? (
          <p
            {...fieldAttr("wealth.contact.info-appointment-label")}
            className="mt-[var(--wealth-rhythm)] italic"
            style={{ fontFamily: "var(--font-wealth-sub)" }}
          >
            {appointmentLabel}
          </p>
        ) : null}
      </div>
    </section>
  );
}
