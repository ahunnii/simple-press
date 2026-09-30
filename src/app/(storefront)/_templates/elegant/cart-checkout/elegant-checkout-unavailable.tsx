import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";

type Props = {
  /**
   * Passed by a parent that already holds the business. Omitted by
   * `checkout/page.tsx`, which renders `<t.CheckoutUnavailable />` with no
   * props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — rendered when the store hasn't connected Stripe.
 *
 * The route renders it with zero props, so when none are given the
 * component reads the tenant itself through the tRPC server caller purely
 * so the owner's own copy resolves. The `.catch` matters: if that read
 * fails for any reason, `resolveFields` substitutes the field defaults and
 * the shopper still gets a finished screen instead of a broken page.
 */
export async function ElegantCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "elegant.checkout.unavailable-heading",
    "elegant.checkout.unavailable-body",
    "elegant.checkout.unavailable-cta",
  ]);

  const body = f["elegant.checkout.unavailable-body"] ?? "";
  const ctaText = f["elegant.checkout.unavailable-cta"] ?? "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "80px 40px",
        background: "var(--el-cream, #f5f1ea)",
      }}
      {...sectionGroupAttr("checkout", "unavailable")}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
            display: "block",
            marginBottom: 16,
          }}
        >
          Checkout
        </span>
        <h1
          {...fieldAttr("elegant.checkout.unavailable-heading")}
          style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "var(--el-ink, #1c1a17)",
            marginBottom: 16,
          }}
        >
          {f["elegant.checkout.unavailable-heading"] ?? ""}
        </h1>

        {body ? (
          <p
            {...fieldAttr("elegant.checkout.unavailable-body")}
            style={{
              fontSize: 16,
              color: "var(--el-ink-soft, #6b6659)",
              lineHeight: 1.65,
              marginBottom: 32,
              fontFamily: "var(--font-sans, sans-serif)",
              whiteSpace: "pre-line",
            }}
          >
            {body}
          </p>
        ) : null}

        {ctaText ? (
          <Link
            href="/shop"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 26px",
              borderRadius: 999,
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              background: "var(--el-ink, #1c1a17)",
              color: "var(--el-paper, #fbf8f2)",
              textDecoration: "none",
              fontFamily: "var(--font-sans, sans-serif)",
            }}
          >
            <span {...fieldAttr("elegant.checkout.unavailable-cta")}>
              {ctaText}
            </span>
            <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
