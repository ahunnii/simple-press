import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";

import { resolveFields } from "..";
import { ViiOrderConfirmation } from "./vii-order-confirmation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

// ─── Fallback loading shell ───────────────────────────────────────────────────

function ViiOrderLoadingFallback({ loadingText }: { loadingText: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        background: "var(--vii-cream)",
        padding: "clamp(48px, 8vh, 96px) clamp(24px, 6vw, 96px)",
      }}
    >
      <p
        role="status"
        aria-live="polite"
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "clamp(18px, 2vw, 24px)",
          fontWeight: 400,
          color: "var(--vii-ink-soft)",
          margin: 0,
          letterSpacing: "0.01em",
        }}
      >
        {loadingText || "Confirming your order…"}
      </p>
    </div>
  );
}

// ─── Server component entry ───────────────────────────────────────────────────

export function ViiOrderSuccessPage({ business }: Props) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "vii.order.overline",
    "vii.order.thank-you-heading",
    "vii.order.thank-you-accent",
    "vii.order.next-steps",
    "vii.order.continue-cta",
    "vii.order.loading-text",
    "vii.order.no-order-heading",
    "vii.order.no-order-body",
  ]);

  const loadingText = f["vii.order.loading-text"] ?? "Confirming your order…";

  return (
    <Suspense fallback={<ViiOrderLoadingFallback loadingText={loadingText} />}>
      <ViiOrderConfirmation
        business={business}
        overline={f["vii.order.overline"] ?? ""}
        thankYouHeading={f["vii.order.thank-you-heading"] ?? ""}
        thankYouAccent={f["vii.order.thank-you-accent"] ?? ""}
        nextSteps={f["vii.order.next-steps"] ?? ""}
        continueCta={f["vii.order.continue-cta"] ?? ""}
        loadingText={loadingText}
        noOrderHeading={f["vii.order.no-order-heading"] ?? ""}
        noOrderBody={f["vii.order.no-order-body"] ?? ""}
      />
    </Suspense>
  );
}
