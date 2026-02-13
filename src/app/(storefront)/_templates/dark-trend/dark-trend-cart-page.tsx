import type { RouterOutputs } from "~/trpc/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

import { DarkTrendCartContents } from "./dark-trend-cart-contents";

export async function DarkTrendCartPage({
  business,
}: {
  business: NonNullable<RouterOutputs["business"]["get"]>;
}) {
  return (
    <main className="flex-1 bg-[#1A1A1A] px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mt-10 mb-20 w-full space-y-4">
          <Breadcrumb className="mx-auto w-full">
            <BreadcrumbList className="mx-auto w-full justify-center text-center">
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="text-white/80 hover:text-white"
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-purple-500">
                  Cart
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mb-2 text-center text-4xl font-bold text-white lg:text-7xl">
            Cart
          </h1>
        </div>

        <DarkTrendCartContents business={business} />
      </div>
    </main>
  );
}
