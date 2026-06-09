import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

import { DefaultOrderConfirmation } from "../../default/cart-checkout/default-order-confirmation";

export function ElegantOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "100vh" }}>
      {/* Hero */}
      <section style={{ padding: "64px 40px 48px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Check circle */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "var(--el-sage, #4a5240)",
            color: "var(--el-paper, #fbf8f2)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}>
            <svg aria-hidden={true} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5L20 7" />
            </svg>
          </div>

          <span style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
            display: "block",
            marginBottom: 16,
          }}>
            Order confirmed
          </span>

          <h1 style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(40px, 5.5vw, 72px)",
            lineHeight: 1.0,
            letterSpacing: "-0.01em",
            color: "var(--el-ink, #1c1a17)",
            marginBottom: 16,
          }}>
            Thank you.
          </h1>

          <p style={{
            fontSize: 17,
            color: "var(--el-ink-soft, #6b6659)",
            lineHeight: 1.65,
            fontFamily: "var(--font-sans, sans-serif)",
          }}>
            Your order has been received. A confirmation email is on its way to
            you now.
          </p>
        </div>
      </section>

      {/* Order details */}
      <section style={{ padding: "0 40px 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{
            background: "var(--el-paper, #fbf8f2)",
            border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
            borderRadius: 8,
            padding: "28px 28px",
            marginBottom: 32,
          }}>
            <Suspense
              fallback={
                <p style={{
                  textAlign: "center",
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--el-ink-soft, #6b6659)",
                }}>
                  Loading order details…
                </p>
              }
            >
              <DefaultOrderConfirmation business={business} />
            </Suspense>
          </div>

          <div style={{ textAlign: "center" }}>
            <Link href="/shop" style={{
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
            }}>
              Continue shopping
              <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
