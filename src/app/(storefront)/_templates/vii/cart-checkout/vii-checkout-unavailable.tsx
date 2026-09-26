import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { ViiReveal } from "../shared/vii-reveal";

type Props = {
  /**
   * Passed by `ViiCheckoutPage`'s guard, which already holds the business.
   * Omitted by `checkout/page.tsx`, which renders `<t.CheckoutUnavailable />`
   * with no props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * ViiCheckoutUnavailable — rendered inside ViiLayout when the store has not
 * yet connected Stripe. ViiLayout already provides the skip link, header,
 * and footer landmarks, so this component renders only its inner content.
 *
 * `checkout/page.tsx` renders `<t.CheckoutUnavailable />` with zero props,
 * so when none are given this component reads the tenant itself through the
 * tRPC server caller purely so the owner's own copy resolves. The `.catch`
 * matters: if that read fails for any reason, `resolveFields` substitutes
 * the field defaults and the shopper still gets a finished screen instead
 * of a broken page.
 */
export async function ViiCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "vii.checkout.unavailable-heading",
    "vii.checkout.unavailable-body",
  ]);

  const heading = f["vii.checkout.unavailable-heading"] ?? "";
  const body = f["vii.checkout.unavailable-body"] ?? "";

  return (
    <div
      {...sectionGroupAttr("checkout", "unavailable")}
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(64px, 10vw, 120px) clamp(24px, 6vw, 96px)",
        background: "var(--vii-cream)",
        minHeight: "60vh",
      }}
    >
      <ViiReveal style={{ maxWidth: 480, textAlign: "center" }}>
        {/* Decorative copper mark */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 32,
            height: 2,
            background: "var(--vii-copper)",
            marginBottom: 32,
          }}
        />

        <h1
          {...fieldAttr("vii.checkout.unavailable-heading")}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 500,
            lineHeight: 1.2,
            color: "var(--vii-navy)",
            marginBottom: body ? 20 : 40,
          }}
        >
          {heading}
        </h1>

        {body ? (
          <p
            {...fieldAttr("vii.checkout.unavailable-body")}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              lineHeight: 1.6,
              letterSpacing: "0.02em",
              color: "var(--vii-ink-soft)",
              marginBottom: 40,
            }}
          >
            {body}
          </p>
        ) : null}

        <Link
          href="/shop"
          className="vii-cta-btn"
          style={{
            position: "relative",
            overflow: "hidden",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 32px",
            background: "var(--vii-copper-deep)",
            color: "var(--vii-paper)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: "var(--radius)",
            textDecoration: "none",
            transition: "background 0.2s ease",
          }}
        >
          Back to shop
        </Link>
      </ViiReveal>
    </div>
  );
}
