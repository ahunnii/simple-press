import Link from "next/link";

import type { DefaultCartPageTemplateProps } from "../../types";

import { DefaultCartContents } from "./default-cart-contents";

export async function DefaultCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return (
    <div>
      {/* Page hero */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
            <Link href="/" className="hover:text-[#0a0a0a] transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Cart</span>
          </nav>
          <h1 className="font-serif text-[clamp(40px,5vw,72px)] font-semibold leading-[1.04] tracking-[-0.03em]">
            Your cart
          </h1>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <DefaultCartContents business={business} />
        </div>
      </section>
    </div>
  );
}
