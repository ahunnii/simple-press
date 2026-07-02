/* eslint-disable @next/next/no-img-element */
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";

type Order = NonNullable<RouterOutputs["order"]["getById"]>;
type Business = RouterOutputs["business"]["simplifiedGet"];

type Props = {
  order: Order;
  business: Business;
  variant: "packing-slip" | "invoice";
};

/**
 * Print CSS that hides the admin shell (sidebar + inset chrome) when printing.
 * The print routes render inside the normal /admin layout so auth and feature
 * gating still apply; this strips the chrome for a clean paper document.
 */
export function AdminPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 0.75in; }
        [data-slot="sidebar"],
        [data-slot="sidebar-trigger"] {
          display: none !important;
        }
        [data-slot="sidebar-wrapper"],
        [data-slot="sidebar-inset"],
        [data-slot="sidebar-inset"] > div {
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          min-height: 0 !important;
        }
      }
    `}</style>
  );
}

/**
 * Shared print document for packing slips and invoices.
 * Packing slips intentionally show NO prices — they go in the box.
 * Invoices add unit prices, totals, and payment status.
 */
export function OrderPrintDocument({ order, business, variant }: Props) {
  const isInvoice = variant === "invoice";
  const title = isInvoice ? "Invoice" : "Packing Slip";
  const logoUrl = business?.siteContent?.logoUrl;
  const address = order.shippingAddress;
  const isPickup = order.deliveryMethod === "pickup";
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="bg-white text-black">
      {/* Document header */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-6">
        <div className="min-w-0">
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="mb-3 h-12 w-auto object-contain"
            />
          )}
          <p className="text-lg font-bold">{business?.name}</p>
          {business?.businessAddress && (
            <p className="text-sm whitespace-pre-line">
              {business.businessAddress}
            </p>
          )}
          {business?.supportEmail && (
            <p className="text-sm">{business.supportEmail}</p>
          )}
          {business?.phoneNumber && (
            <p className="text-sm">{business.phoneNumber}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <h1 className="text-2xl font-bold tracking-tight uppercase">
            {title}
          </h1>
          <p className="mt-1 text-sm font-medium">
            Order #{order.orderNumber}
          </p>
          <p className="text-sm">{formatDate(order.createdAt)}</p>
          {isInvoice && (
            <p className="mt-2 text-sm font-semibold capitalize">
              Payment: {order.paymentStatus}
            </p>
          )}
        </div>
      </header>

      {/* Addresses */}
      <section className="grid grid-cols-2 gap-8 py-6">
        <div>
          <h2 className="mb-1.5 text-xs font-bold tracking-wide uppercase">
            {isPickup ? "Pickup Order" : "Ship To"}
          </h2>
          {isPickup ? (
            <div className="text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p>In-store pickup</p>
              {(business?.pickupLocation ?? business?.businessAddress) && (
                <p className="whitespace-pre-line">
                  {business?.pickupLocation ?? business?.businessAddress}
                </p>
              )}
            </div>
          ) : address ? (
            <address className="text-sm not-italic">
              {address.firstName} {address.lastName}
              <br />
              {address.address1}
              <br />
              {address.address2 && (
                <>
                  {address.address2}
                  <br />
                </>
              )}
              {address.city}, {address.province} {address.zip}
              <br />
              {address.country}
            </address>
          ) : (
            <p className="text-sm">No shipping address on file.</p>
          )}
        </div>

        <div>
          <h2 className="mb-1.5 text-xs font-bold tracking-wide uppercase">
            {isInvoice ? "Billed To" : "Customer"}
          </h2>
          <div className="text-sm">
            {order.customerName && (
              <p className="font-medium">{order.customerName}</p>
            )}
            <p>{order.customerEmail}</p>
            {order.customerPhone && <p>{order.customerPhone}</p>}
          </div>
        </div>
      </section>

      {/* Line items */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 pr-4 font-bold">Item</th>
            <th className="py-2 pr-4 font-bold">SKU</th>
            <th className="py-2 pr-4 text-right font-bold">Qty</th>
            {isInvoice && (
              <>
                <th className="py-2 pr-4 text-right font-bold">Unit Price</th>
                <th className="py-2 text-right font-bold">Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-300">
              <td className="py-2.5 pr-4">
                <span className="font-medium">{item.productName}</span>
                {item.variantName && (
                  <span className="block text-xs text-neutral-600">
                    {item.variantName}
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs">
                {item.sku ?? "—"}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {item.quantity}
              </td>
              {isInvoice && (
                <>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatPrice(item.price)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatPrice(item.total)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isInvoice ? (
        /* Invoice totals */
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatPrice(order.subtotal)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span>
                  Discount
                  {order.discountCode && ` (${order.discountCode.code})`}
                </span>
                <span className="tabular-nums">
                  -{formatPrice(order.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="tabular-nums">
                {formatPrice(order.shipping)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="tabular-nums">{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-black pt-1.5 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
            {(order.refundAmountCents ?? 0) > 0 && (
              <div className="flex justify-between font-medium">
                <span>Refunded</span>
                <span className="tabular-nums">
                  -{formatPrice(order.refundAmountCents ?? 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Packing slip item count — no prices on a packing slip */
        <p className="mt-4 text-right text-sm font-medium">
          {itemCount} item{itemCount !== 1 ? "s" : ""} total
        </p>
      )}

      {/* Footer */}
      <footer className="mt-10 border-t border-neutral-300 pt-4 text-center text-xs text-neutral-600">
        <p>
          Thank you for your order
          {business?.name ? ` from ${business.name}` : ""}!
        </p>
        {business?.supportEmail && (
          <p className="mt-1">Questions? Contact {business.supportEmail}</p>
        )}
      </footer>
    </div>
  );
}
