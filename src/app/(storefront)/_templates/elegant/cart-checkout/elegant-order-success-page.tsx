import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { resolveFields } from "..";
import { ElegantOrderConfirmation } from "./elegant-order-confirmation";

export function ElegantOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  const f = resolveFields(business.siteContent?.customFields, [
    "elegant.checkout.success-eyebrow",
    "elegant.checkout.success-heading",
    "elegant.checkout.success-body",
    "elegant.checkout.success-button",
    "elegant.checkout.success-note",
  ]);

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "100vh" }}>
      <Suspense
        fallback={
          <div style={{ padding: "120px 40px", textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--el-ink-soft, #6b6659)",
              }}
            >
              Loading order details…
            </p>
          </div>
        }
      >
        <ElegantOrderConfirmation
          business={business}
          eyebrow={f["elegant.checkout.success-eyebrow"] ?? ""}
          heading={f["elegant.checkout.success-heading"] ?? ""}
          body={f["elegant.checkout.success-body"] ?? ""}
          buttonLabel={f["elegant.checkout.success-button"] ?? ""}
          note={f["elegant.checkout.success-note"] ?? ""}
        />
      </Suspense>
    </div>
  );
}
