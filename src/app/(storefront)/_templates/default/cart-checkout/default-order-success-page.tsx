import { Suspense } from "react";

import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateListRows,
} from "~/lib/template-fields";

import { resolveFields } from "..";
import { DefaultOrderConfirmation } from "./default-order-confirmation";
import {
  CHECKOUT_CONFIRMATION_HEADING_DEFAULT,
  CHECKOUT_CONFIRMATION_NEXT_HEADING_DEFAULT,
  CHECKOUT_CONFIRMATION_STEPS_DEFAULT_ROWS,
  CHECKOUT_CONFIRMATION_STEPS_KEY,
  CHECKOUT_CONFIRMATION_THANKS_PREFIX_DEFAULT,
} from "./order-fields";

/**
 * Resolves the `checkout.confirmation-next-steps` list field to rendered
 * rows, matching the shared list helpers' `defaultsWhenEmpty` semantics:
 * nothing saved, or a saved list with no usable rows, falls back to the
 * built-in rows. `index` is the row's position in the SAVED list (for
 * `listItemAttr`); built-in rows use their own position, which the editor
 * ignores as out of range.
 */
function resolveConfirmationSteps(customFields: unknown) {
  const saved = parseTemplateListRows(
    getListFieldValue(customFields, CHECKOUT_CONFIRMATION_STEPS_KEY),
  )
    .map((row, index) => ({
      text: typeof row.text === "string" ? row.text.trim() : "",
      index,
    }))
    .filter((row) => row.text.length > 0);
  if (saved.length > 0) return saved;
  return CHECKOUT_CONFIRMATION_STEPS_DEFAULT_ROWS.map((row, index) => ({
    text: row.text,
    index,
  }));
}

export function DefaultOrderSuccessPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
}) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "default.checkout.confirmation-heading",
    "default.checkout.confirmation-thanks-prefix",
    "default.checkout.confirmation-next-heading",
    "default.checkout.confirmation-continue-button",
  ]);
  // Structural headings never hide — fall back to the built-in copy if
  // somehow saved blank.
  const heading =
    (f["default.checkout.confirmation-heading"] ?? "").trim() ||
    CHECKOUT_CONFIRMATION_HEADING_DEFAULT;
  const thanksPrefix =
    (f["default.checkout.confirmation-thanks-prefix"] ?? "").trim() ||
    CHECKOUT_CONFIRMATION_THANKS_PREFIX_DEFAULT;
  const nextHeading =
    (f["default.checkout.confirmation-next-heading"] ?? "").trim() ||
    CHECKOUT_CONFIRMATION_NEXT_HEADING_DEFAULT;
  // Hides its button when blank — resolve the trimmed value as-is (no
  // CONSTANT fallback) so an owner can actually clear it.
  const continueLabel = (
    f["default.checkout.confirmation-continue-button"] ?? ""
  ).trim();
  const steps = resolveConfirmationSteps(customFields);

  return (
    <div className="flex-1 px-4 py-12">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl text-center">
            <p>Loading...</p>
          </div>
        }
      >
        <DefaultOrderConfirmation
          business={business}
          heading={heading}
          thanksPrefix={thanksPrefix}
          nextHeading={nextHeading}
          continueLabel={continueLabel}
          steps={steps}
        />
      </Suspense>
    </div>
  );
}
