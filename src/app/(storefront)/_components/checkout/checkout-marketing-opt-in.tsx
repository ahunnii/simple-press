import type { CSSProperties } from "react";
import { useId } from "react";

type Props = {
  /** `marketingOptInEnabled` from `useCheckoutForm` (the emailMarketing flag). */
  enabled: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Store display name, e.g. "Acme Goods". */
  businessName: string;
  className?: string;
  style?: CSSProperties;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  labelClassName?: string;
  labelStyle?: CSSProperties;
  /** Overrides the default "Email me news and offers from <Store>". */
  label?: string;
};

/**
 * "Email me news and offers from <Store>" checkbox for the checkout form.
 *
 * Deliberately UNCHECKED by default (consent has to be an affirmative act) and
 * rendered as nothing when the store has email marketing off, so a store that
 * can't send campaigns never collects an opt-in it has no use for. The value
 * goes to `create-session` -> Stripe metadata -> the webhook, which records
 * consent (source CHECKOUT) only when this was ticked.
 *
 * A native input on purpose: it needs no styling system, submits harmlessly
 * inside the form, and every template can theme it through the className /
 * style props (and `accent-color`) the way `CheckoutTermsNotice` is themed.
 */
export function CheckoutMarketingOptIn({
  enabled,
  checked,
  onCheckedChange,
  businessName,
  className,
  style,
  inputClassName,
  inputStyle,
  labelClassName,
  labelStyle,
  label,
}: Props) {
  const id = useId();
  if (!enabled) return null;

  return (
    <div
      className={className ?? "flex items-start gap-2 text-sm"}
      style={style}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={inputClassName ?? "mt-0.5 size-4 shrink-0"}
        style={inputStyle}
      />
      <label htmlFor={id} className={labelClassName} style={labelStyle}>
        {label ?? `Email me news and offers from ${businessName}`}
      </label>
    </div>
  );
}
