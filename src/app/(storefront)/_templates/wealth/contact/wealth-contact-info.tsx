import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

type Props = {
  addressLine1: string;
  addressLine2: string;
  appointmentLabel: string;
};

/**
 * Office note — address + "By Appointment Only" as a hairline-topped aside,
 * rendered inside the form block's left column. Hideable (contact.info).
 */
export function WealthContactInfo({
  addressLine1,
  addressLine2,
  appointmentLabel,
}: Props) {
  if (!addressLine1.trim() && !addressLine2.trim() && !appointmentLabel.trim())
    return null;
  return (
    <div
      className="wealth-contact-note"
      {...sectionGroupAttr("contact", "info")}
    >
      <address className="wealth-contact-note__address">
        {addressLine1.trim() ? (
          <span {...fieldAttr("wealth.contact.info-address-line1")}>
            {addressLine1}
          </span>
        ) : null}
        {addressLine2.trim() ? (
          <span {...fieldAttr("wealth.contact.info-address-line2")}>
            {addressLine2}
          </span>
        ) : null}
      </address>
      {appointmentLabel.trim() ? (
        <p
          className="wealth-contact-note__appt"
          {...fieldAttr("wealth.contact.info-appointment-label")}
        >
          {appointmentLabel}
        </p>
      ) : null}
    </div>
  );
}
