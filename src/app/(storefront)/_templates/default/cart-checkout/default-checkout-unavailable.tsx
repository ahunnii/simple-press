import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";
import { api } from "~/trpc/server";

import { defaultCheckoutUnavailableData } from "./unavailable-fields";

type Props = {
  /**
   * Passed by `DefaultCheckoutPage`'s guard, which already holds the
   * business. Omitted by `checkout/page.tsx`, which renders
   * `<t.CheckoutUnavailable />` with no props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Resolved against this screen's own field module (same semantics as the
 * template root's `resolveFields`), so each key gets its saved value or its
 * declared default whether or not the root map includes these fields.
 */
const FIELD_MAP = new Map(
  defaultCheckoutUnavailableData.map((field) => [field.key, field]),
);

/**
 * Checkout unavailable — rendered when the store hasn't connected Stripe.
 * Also the fallback for every template without its own.
 *
 * The route renders it with zero props, so when none are given the
 * component reads the tenant itself through the tRPC server caller purely
 * so the owner's own copy resolves. The `.catch` matters: if that read
 * fails for any reason, the field defaults apply and the shopper still gets
 * a finished screen instead of a broken page.
 */
export async function DefaultCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveTemplateFields(
    resolved,
    [
      "default.checkout.unavailable-heading",
      "default.checkout.unavailable-body",
      "default.checkout.unavailable-button-text",
      "default.checkout.unavailable-button-link",
    ],
    FIELD_MAP,
  );

  const body = f["default.checkout.unavailable-body"] ?? "";
  const buttonText = f["default.checkout.unavailable-button-text"] ?? "";
  const buttonLink = f["default.checkout.unavailable-button-link"] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-[#0a0a0a] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <header className="border-b border-[#e8e8e8] px-6 py-4">
        <span className="text-sm font-medium">Checkout</span>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center p-4"
        {...sectionGroupAttr("checkout", "unavailable")}
      >
        <div className="max-w-md text-center">
          <h1
            {...fieldAttr("default.checkout.unavailable-heading")}
            className="mb-4 text-2xl font-bold text-[#0a0a0a]"
          >
            {f["default.checkout.unavailable-heading"] ?? ""}
          </h1>
          {body ? (
            <p
              {...fieldAttr("default.checkout.unavailable-body")}
              className="text-[#6b6b6b]"
            >
              {body}
            </p>
          ) : null}
          {buttonText ? (
            <Link
              href={buttonLink || "/shop"}
              {...fieldAttr("default.checkout.unavailable-button-text")}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
            >
              {buttonText}
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}
