import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";

import { OrderStatusLookupForm } from "./_components/order-status-lookup-form";

export const metadata = {
  title: "Order Status",
  robots: { index: false, follow: false },
};

export default async function OrderStatusLookupPage() {
  const business = await checkBusiness();
  if (!business) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <header className="mb-10 text-center">
        <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
          {business.name}
        </p>
        <h1 className="mb-3 text-2xl font-medium tracking-tight sm:text-3xl">
          Check your order status
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-[#6b6b6b]">
          Enter the email address and order number from your confirmation email
          and we&apos;ll send you a secure link to view your order — no account
          needed.
        </p>
      </header>

      <OrderStatusLookupForm />
    </main>
  );
}
