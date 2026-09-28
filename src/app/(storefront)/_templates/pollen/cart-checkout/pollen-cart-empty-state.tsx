import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/page-animations";

import { resolveFields } from "..";

type Props = {
  customFields: unknown;
  /**
   * `h1` on `/cart` (no page band, so this is the page's only heading);
   * `h2` on `/checkout`, where `PollenGeneralLayout`'s band already owns the h1.
   */
  headingLevel: "h1" | "h2";
  /** Spacing for the wrapper — `/cart` clears the fixed header itself. */
  className?: string;
};

/**
 * The designed empty-cart state (icon disc, heading, message, button), shared
 * by `/cart` (`PollenCartContents`) and `/checkout` (`PollenCheckoutForm`) so
 * both read as the same page. Copy comes from the `global.cart` group.
 *
 * The button keeps its hard-coded `/shop` target: `/cart` and `/checkout`
 * both `dependsOn` the `products` flag, so this never renders with the shop
 * turned off.
 */
export function PollenCartEmptyState({
  customFields,
  headingLevel,
  className,
}: Props) {
  const f = resolveFields(customFields, [
    "pollen.global.cart-empty-heading",
    "pollen.global.cart-empty-text",
    "pollen.global.cart-empty-button",
  ]);
  const heading = f["pollen.global.cart-empty-heading"] ?? "";
  const text = f["pollen.global.cart-empty-text"] ?? "";
  const buttonLabel = f["pollen.global.cart-empty-button"] ?? "";
  const Heading = headingLevel;

  return (
    <section
      {...sectionGroupAttr("global", "cart")}
      className={cn(
        "mx-auto flex max-w-7xl flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8",
        className,
      )}
    >
      <FadeIn direction="up">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#f5f2ee]">
          <ShoppingBag className="size-8 text-[#4c566a]" aria-hidden="true" />
        </div>
        <Heading
          {...fieldAttr("pollen.global.cart-empty-heading")}
          className="mt-6 text-2xl font-bold text-[#2a351f]"
        >
          {heading}
        </Heading>
        {text ? (
          <p
            {...fieldAttr("pollen.global.cart-empty-text")}
            className="mx-auto mt-2 max-w-md text-[#4c566a]"
          >
            {text}
          </p>
        ) : null}
        {buttonLabel ? (
          <Button
            className="mt-8 bg-[#215935] text-white hover:bg-[#1a4729]"
            size="lg"
            asChild
          >
            <Link href="/shop">
              <span {...fieldAttr("pollen.global.cart-empty-button")}>
                {buttonLabel}
              </span>
            </Link>
          </Button>
        ) : null}
      </FadeIn>
    </section>
  );
}
