import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCheckoutPageTemplateProps } from "../../types";

import { ElegantCheckoutForm } from "./elegant-checkout-form";

export async function ElegantCheckoutPage({
  business,
}: DefaultCheckoutPageTemplateProps) {
  // if (!business.isStripeConnected) {
  //   return (
  //     <div style={{
  //       display: "flex",
  //       alignItems: "center",
  //       justifyContent: "center",
  //       minHeight: "60vh",
  //       padding: "80px 40px",
  //       background: "var(--el-cream, #f5f1ea)",
  //     }}>
  //       <div style={{ maxWidth: 480, textAlign: "center" }}>
  //         <span style={{
  //           fontFamily: "var(--font-mono, ui-monospace)",
  //           fontSize: 11,
  //           letterSpacing: "0.22em",
  //           textTransform: "uppercase",
  //           color: "var(--el-ink-soft, #6b6659)",
  //           display: "block",
  //           marginBottom: 16,
  //         }}>
  //           Checkout
  //         </span>
  //         <h1 style={{
  //           fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
  //           fontWeight: 400,
  //           fontSize: "clamp(32px, 4vw, 48px)",
  //           color: "var(--el-ink, #1c1a17)",
  //           marginBottom: 16,
  //         }}>
  //           Checkout unavailable
  //         </h1>
  //         <p style={{
  //           fontSize: 16,
  //           color: "var(--el-ink-soft, #6b6659)",
  //           lineHeight: 1.65,
  //           marginBottom: 32,
  //           fontFamily: "var(--font-sans, sans-serif)",
  //         }}>
  //           This store hasn&apos;t set up payment processing yet. Please
  //           contact the store owner.
  //         </p>
  //         <Link href="/shop" style={{
  //           display: "inline-flex",
  //           alignItems: "center",
  //           gap: 10,
  //           padding: "14px 26px",
  //           borderRadius: 999,
  //           fontSize: 13,
  //           letterSpacing: "0.08em",
  //           textTransform: "uppercase",
  //           fontWeight: 500,
  //           background: "var(--el-ink, #1c1a17)",
  //           color: "var(--el-paper, #fbf8f2)",
  //           textDecoration: "none",
  //           fontFamily: "var(--font-sans, sans-serif)",
  //         }}>
  //           Continue shopping
  //           <ArrowRight aria-hidden={true} style={{ width: 14, height: 14 }} />
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "100vh" }}>
      <section style={{ padding: "24px 40px 80px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href="/cart"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              textDecoration: "none",
              marginBottom: 32,
            }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} />
            Back to bag
          </Link>

          {/* Heading */}
          <div style={{ marginBottom: 48 }}>
            <span
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
                display: "block",
                marginBottom: 14,
              }}
            >
              Secure checkout
            </span>
            <h1
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontWeight: 400,
                fontSize: "clamp(40px, 5.5vw, 72px)",
                lineHeight: 0.95,
                letterSpacing: "-0.01em",
                color: "var(--el-ink, #1c1a17)",
              }}
            >
              Almost there.
            </h1>
          </div>

          <ElegantCheckoutForm business={business} />
        </div>
      </section>
    </div>
  );
}
