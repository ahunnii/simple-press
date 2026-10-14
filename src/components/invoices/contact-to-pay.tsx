type Props = {
  businessName: string;
  email?: string | null;
  phone?: string | null;
};

/**
 * The "How to pay" content for an invoice that has a balance but no payment
 * methods attached (the owner unticked every method) — points the customer at
 * the issuer instead of showing an empty section. Shared by the hosted page
 * and the builder preview so both say the same thing. Deliberately free of
 * server-only imports so a client component can render it.
 */
export function ContactToPay({ businessName, email, phone }: Props) {
  const emailValue = email?.trim();
  const phoneValue = phone?.trim();
  const linkClass = "font-medium text-neutral-900 underline underline-offset-2";

  return (
    <div className="space-y-1 text-sm text-neutral-600">
      <p>To pay this invoice, contact {businessName}.</p>
      {emailValue && (
        <p>
          <a href={`mailto:${emailValue}`} className={linkClass}>
            {emailValue}
          </a>
        </p>
      )}
      {phoneValue && (
        <p>
          <a
            href={`tel:${phoneValue.replace(/[^\d+]/g, "")}`}
            className={linkClass}
          >
            {phoneValue}
          </a>
        </p>
      )}
    </div>
  );
}
