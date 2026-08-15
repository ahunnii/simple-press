import type { CSSProperties } from "react";
import Link from "next/link";

/**
 * The composed disclosure shape returned by `useCheckoutForm` as
 * `termsDisclosure`. `merchantLinks` only ever contains entries for policy
 * Pages that actually exist (see `CheckoutMerchantPolicies` in
 * `_templates/types.ts`) — this component never has to decide what's safe to
 * link, it just renders what it's given.
 */
export type CheckoutTermsDisclosure = {
  /** The merchant's display name, e.g. "Acme Goods". */
  merchantName: string;
  /** Ordered list of merchant policy links that exist for this store. */
  merchantLinks: { label: string; href: string }[];
  /** Platform Terms of Service — always present, every store has one. */
  platformHref: string;
};

type Props = {
  disclosure: CheckoutTermsDisclosure;
  className?: string;
  style?: CSSProperties;
  linkClassName?: string;
  linkStyle?: CSSProperties;
};

/**
 * Passive fine-print disclosure rendered immediately above the place-order
 * button in every template's checkout form. Deliberately NOT a checkbox —
 * the platform surfaces merchant policies as links, matching how Shopify
 * checkout does it, rather than blocking submission on an explicit tick.
 *
 * Degrades gracefully: when a merchant has published neither a
 * terms-of-service nor a refund-policy page, `merchantLinks` is empty and the
 * sentence drops the merchant clause entirely rather than naming a policy
 * that isn't there.
 */
export function CheckoutTermsNotice({
  disclosure,
  className,
  style,
  linkClassName,
  linkStyle,
}: Props) {
  const { merchantName, merchantLinks, platformHref } = disclosure;

  return (
    <p className={className} style={style}>
      By placing your order you agree to{" "}
      {merchantLinks.length > 0 && (
        <>
          {merchantName}&apos;s{" "}
          {merchantLinks.map((link, i) => (
            <span key={link.href}>
              {i > 0 && " and "}
              <Link
                href={link.href}
                className={linkClassName}
                style={linkStyle}
              >
                {link.label}
              </Link>
            </span>
          ))}
          , and to{" "}
        </>
      )}
      SimplePress&apos;s{" "}
      <Link href={platformHref} className={linkClassName} style={linkStyle}>
        Terms of Service
      </Link>
      .
    </p>
  );
}
