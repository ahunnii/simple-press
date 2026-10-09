import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { GLOVE_STEP_FIELD_KEYS } from "./checkout-fields";

export type GloveCheckoutStepsProps = {
  /** 1 = cart, 2 = checkout, 3 = order complete. */
  current: 1 | 2 | 3;
  labels: { cart: string; checkout: string; complete: string };
  /**
   * Text of the page's `<h1>`, rendered screen-reader-only (the steps are the
   * visible title). Omit on a page that renders its own visible h1, such as
   * the order confirmation.
   */
  heading?: string;
};

/**
 * The progress band shared by cart (1), checkout (2) and order complete (3).
 * One quiet system at every width: the current step in Poppins as the band's
 * title, "Step n of 3" beneath it in soft lavender. The other steps are not
 * drawn as a breadcrumb; the full ordered list stays in the a11y tree
 * (screen-reader-only, `aria-current="step"` on the current item). Mid-checkout
 * a small "back" link to the first step sits on the "Step 2 of 3" line.
 */
export function GloveCheckoutSteps({
  current,
  labels,
  heading,
}: GloveCheckoutStepsProps) {
  const steps = [
    { label: labels.cart, key: GLOVE_STEP_FIELD_KEYS.cart },
    { label: labels.checkout, key: GLOVE_STEP_FIELD_KEYS.checkout },
    { label: labels.complete, key: GLOVE_STEP_FIELD_KEYS.complete },
  ] as const;

  const currentStep = steps[current - 1];
  const currentLabel = currentStep?.label ?? "";
  // Only the first step is ever a way back, and only mid-checkout.
  const showBack = current === 2 && Boolean(labels.cart);

  return (
    <section
      className="glove-band glove-band--plum glove-on-dark"
      {...sectionGroupAttr("checkout", "steps")}
    >
      <div className="glove-container relative">
        {heading ? <h1 className="sr-only">{heading}</h1> : null}
        <nav aria-label="Checkout progress" className="glove-hero-rise">
          <p
            aria-hidden="true"
            className="glove-display m-0 flex flex-col items-start gap-2"
          >
            <span className="text-[26px] leading-tight font-medium text-[var(--glove-on-primary)] md:text-[34px]">
              <span {...(currentStep ? fieldAttr(currentStep.key) : {})}>
                {currentLabel}
              </span>
            </span>
          </p>
          <p className="glove-body m-0 mt-2 flex items-center gap-2 text-[13px] text-[var(--glove-on-plum-soft)] md:text-[14px]">
            <span aria-hidden="true">Step {current} of 3</span>
            {showBack ? (
              <>
                <span aria-hidden="true">·</span>
                <Link
                  href="/cart"
                  className="relative inline-flex items-center gap-0.5 underline-offset-4 transition-colors after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:text-[var(--glove-on-primary)] hover:underline"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  <span aria-hidden="true">{labels.cart}</span>
                  <span className="sr-only">Back to {labels.cart}</span>
                </Link>
              </>
            ) : null}
          </p>
          <ol className="sr-only">
            {steps.map((step, i) => (
              <li
                key={step.key}
                aria-current={i + 1 === current ? "step" : undefined}
              >
                {step.label}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
