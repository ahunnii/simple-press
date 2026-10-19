import type { PaymentMarkId } from "~/lib/stripe/accepted-payment-marks";
import { cn } from "~/lib/utils";

/** Accessible names for each logo in `public/payment-marks/`. */
export const PAYMENT_MARK_LABELS: Record<PaymentMarkId, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  paypal: "PayPal",
  klarna: "Klarna",
  affirm: "Affirm",
  afterpay_clearpay: "Afterpay",
  cashapp: "Cash App Pay",
  amazon_pay: "Amazon Pay",
  us_bank_account: "Bank account",
};

type PaymentMarksProps = {
  /** From `getAcceptedPaymentMarks*` (server). Empty → renders nothing. */
  marks: readonly PaymentMarkId[];
  className?: string;
  itemClassName?: string;
};

/**
 * Row of "we accept" logos (38×24 card-style pills from
 * `public/payment-marks/`, see the README there). Server- and client-safe:
 * no hooks, the list is resolved by the layout.
 */
export function PaymentMarks({
  marks,
  className,
  itemClassName,
}: PaymentMarksProps) {
  if (marks.length === 0) return null;
  return (
    <ul
      aria-label="Accepted payment methods"
      className={cn(
        "m-0 flex list-none flex-wrap items-center gap-1.5 p-0",
        className,
      )}
    >
      {marks.map((id) => (
        <li key={id} className={cn("flex", itemClassName)}>
          {/* eslint-disable-next-line @next/next/no-img-element --
              tiny static SVGs; next/image would pass them through unoptimized
              anyway (SVG) and only add a wrapper. */}
          <img
            src={`/payment-marks/${id}.svg`}
            alt={PAYMENT_MARK_LABELS[id]}
            width={38}
            height={24}
            loading="lazy"
            decoding="async"
            className="block h-6 w-[38px]"
          />
        </li>
      ))}
    </ul>
  );
}
