import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

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
 * The Woo-style progress band shared by cart (1), checkout (2) and order
 * complete (3): "SHOPPING CART > CHECKOUT > ORDER COMPLETE" on navy. The
 * current step is white with an underline and `aria-current="step"`; the
 * others sit in the soft navy tint. While checking out, the cart step links
 * back to the cart.
 */
export function GloveCheckoutSteps({
  current,
  labels,
  heading,
}: GloveCheckoutStepsProps) {
  const steps = [
    { label: labels.cart, key: GLOVE_STEP_FIELD_KEYS.cart, href: "/cart" },
    {
      label: labels.checkout,
      key: GLOVE_STEP_FIELD_KEYS.checkout,
      href: undefined,
    },
    {
      label: labels.complete,
      key: GLOVE_STEP_FIELD_KEYS.complete,
      href: undefined,
    },
  ] as const;

  const currentStep = steps[current - 1];
  const currentLabel = currentStep?.label ?? "";

  return (
    <section
      className="glove-on-dark bg-[var(--glove-navy)] px-[var(--glove-gutter)] py-9 text-center text-[var(--glove-on-primary)] md:py-14"
      {...sectionGroupAttr("checkout", "steps")}
    >
      <div className="glove-container">
        {heading ? <h1 className="sr-only">{heading}</h1> : null}
        <nav aria-label="Checkout progress" className="glove-hero-rise">
          {/* Phones: one compact line. The full ordered list below stays in
              the a11y tree (sr-only) so assistive tech still gets all steps. */}
          <p
            aria-hidden="true"
            className="glove-display m-0 flex flex-col items-center gap-1 sm:hidden"
          >
            <span className="inline-block border-b-2 border-[var(--glove-on-primary)] pb-1 text-[20px] leading-tight font-medium tracking-[0.04em] text-[var(--glove-on-primary)] uppercase">
              <span {...(currentStep ? fieldAttr(currentStep.key) : {})}>
                {currentLabel}
              </span>
            </span>
            <span className="text-[12px] tracking-[0.08em] text-[var(--glove-navy-soft)] uppercase">
              Step {current} of 3
            </span>
          </p>
          <ol className="glove-display m-0 flex list-none flex-wrap items-center justify-center gap-x-2 gap-y-2 p-0 text-[14px] leading-tight font-medium tracking-[0.04em] uppercase max-sm:sr-only sm:gap-x-4 sm:text-[18px] md:text-[26px]">
            {steps.map((step, i) => {
              const n = i + 1;
              const isCurrent = n === current;
              // Only the cart step is ever a way back, and only mid-checkout.
              const href = current === 2 && n === 1 ? step.href : undefined;
              const label = <span {...fieldAttr(step.key)}>{step.label}</span>;
              return (
                <Fragment key={step.key}>
                  {i > 0 ? (
                    <li aria-hidden="true" className="flex items-center">
                      <ChevronRight className="size-4 text-[var(--glove-navy-soft)] sm:size-5 md:size-7" />
                    </li>
                  ) : null}
                  <li>
                    {href && step.label ? (
                      <Link
                        href={href}
                        className="border-b-2 border-transparent pb-1 text-[var(--glove-navy-soft)] transition-colors hover:border-[var(--glove-on-primary)] hover:text-[var(--glove-on-primary)]"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span
                        aria-current={isCurrent ? "step" : undefined}
                        className={cn(
                          "inline-block border-b-2 pb-1",
                          isCurrent
                            ? "border-[var(--glove-on-primary)] text-[var(--glove-on-primary)]"
                            : "border-transparent text-[var(--glove-navy-soft)]",
                        )}
                      >
                        {label}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
      </div>
    </section>
  );
}
