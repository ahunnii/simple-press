# Orders

Orders are created automatically when a customer completes checkout through Stripe. You can also create them manually for phone orders, wholesale, or in-person sales. This page covers everything you can do with orders: viewing, fulfilling, refunding, cancelling, and communicating with customers.

> **Feature flag:** Orders is on by default and owner-toggleable. Disabling it hides the Orders section from your admin nav. Requires `products` to be enabled. Refunds require Stripe Connect to be configured.

---

## Order List

Go to **Orders** in the admin sidebar to see all orders for your store.

**Photo:** Screenshot of the Orders list with status badges, search bar, and the stats row at the top.

The top of the page shows three stats (hidden when you're actively filtering):

- **Total Revenue** — sum of all orders, excluding refunded ones
- **Total Orders** — all orders ever created
- **Paid Orders** — orders with a paid payment status

### Filtering & Search

Use the search bar to find orders by customer name, customer email, or order ID. Use the status filter dropdown to narrow by:

- All Statuses
- Paid
- Pending
- Processing
- Cancelled
- Refunded

Orders are sorted newest first by default.

---

## Order Statuses

Each order tracks three independent statuses. You'll see all three as badges on the order detail page.

### Order Status

| Status      | Meaning                         |
| ----------- | ------------------------------- |
| `pending`   | Order created, awaiting payment |
| `paid`      | Payment confirmed               |
| `fulfilled` | Order shipped/fulfilled         |
| `cancelled` | Order cancelled                 |
| `refunded`  | Order fully refunded            |

### Payment Status

| Status     | Meaning                  |
| ---------- | ------------------------ |
| `pending`  | Payment not yet received |
| `paid`     | Payment received         |
| `failed`   | Payment failed           |
| `refunded` | Payment refunded         |

### Fulfillment Status

| Status                | Meaning               |
| --------------------- | --------------------- |
| `unfulfilled`         | No shipments recorded |
| `partially_fulfilled` | Some items shipped    |
| `fulfilled`           | All items shipped     |

---

## Order Detail Page

Click **View** on any order from the list to open the detail page. Here's what you'll find:

**Left column:**

- **Order Items** — product name, variant, SKU, quantity, unit price, and line totals. Below the items: subtotal, discount (with code if applied), shipping, tax, and the final total.
- **Fulfillment Form** — appears when the order is paid but not yet fulfilled.

**Right column:**

- **Order Status** — current status badge and the Shipments panel (once fulfilled)
- **Customer Information** — name, email, phone
- **Shipping Address** — the address on file; you can add or edit this
- **Internal Notes** — private notes visible only to you in the admin
- **Payment** — payment status, method, and refund controls

**Photo:** Screenshot of the full order detail page with all panels labeled.

---

## Fulfillment

SimplePress uses **manual fulfillment** — you ship the order yourself and record tracking details in the admin. There is no automatic label generation or carrier integration.

> **Recommended:** [PirateShip](https://www.pirateship.com) is a free tool with deeply discounted USPS and UPS rates. You can print your labels there and copy the tracking numbers back into SimplePress.

### How to Fulfill an Order

1. Open the order from **Orders**.
2. In the fulfillment area, click **Mark as Fulfilled**.
3. If you have a tracking number, check **Include Tracking Information** and fill in the fields. If not, you can fulfill without tracking.
4. Click **Save**. The order status updates and the customer is emailed automatically.

**Photo:** Screenshot of the "Mark as Fulfilled" dialog with tracking fields filled in.

### Tracking Fields

When tracking is enabled, you'll see fields for each package:

| Field           | Required        | Notes                                          |
| --------------- | --------------- | ---------------------------------------------- |
| Carrier         | Yes             | USPS, UPS, FedEx, DHL, or Other                |
| Tracking Number | Yes             | The number from your shipping label            |
| Tracking URL    | Only if "Other" | For non-standard carriers, paste the full link |

For USPS, UPS, FedEx, and DHL, the tracking link is built automatically from the carrier and tracking number — you don't need to paste a URL.

To ship multiple packages on one order, click **Add Additional Tracking Information**. Each package gets its own entry.

### Supported Carriers

| Carrier | Tracking URL Auto-Generated? |
| ------- | ---------------------------- |
| USPS    | Yes                          |
| UPS     | Yes                          |
| FedEx   | Yes                          |
| DHL     | Yes                          |
| Other   | No — paste your own URL      |

### Emails Sent at Fulfillment

SimplePress sends one of two emails to the customer depending on whether you provided tracking:

- **With tracking:** "Your order has shipped" — includes carrier, tracking number, and a clickable tracking link.
- **Without tracking:** "Your order has been fulfilled" — notifies the customer their order is on the way.

### Adding Tracking After the Fact

If you marked an order as fulfilled before you had tracking info, or if you're sending a split shipment, you can add more shipments from the order detail page.

In the **Order Status** panel, click **Add Additional Tracking Information**. Fill in the carrier and tracking number. A new shipment record is created and an email is sent to the customer.

> Editing an existing shipment (e.g., correcting a typo) does **not** resend an email. Only new shipment records trigger customer notifications.

### Editing a Shipment

To correct a tracking number or carrier:

1. Open the order.
2. In the **Shipments** area, click the edit (pencil) icon on the shipment.
3. Update the fields and save.

No customer email is sent for edits.

### Reversing Fulfillment

If you need to un-fulfill an order (e.g., a shipment was returned before delivery), click **Mark as Unfulfilled** on the order detail page. This changes the fulfillment status back to unfulfilled but does **not** delete any shipment records already on file.

---

## Refunds

You can issue full or partial refunds from the order detail page.

### Stripe Refunds

If the customer paid through Stripe Checkout, a real money refund is processed through Stripe.

1. Open the order and find the **Payment** panel on the right.
2. Click **Issue Refund**.
3. Fill in the refund dialog.

**Photo:** Screenshot of the refund dialog with amount, reason, restock, and email options visible.

**Refund dialog fields:**

| Field                     | Notes                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| Refund Amount             | Enter any amount up to the order total; minimum $0.01              |
| Reason                    | Optional: Customer requested, Duplicate order, or Fraudulent order |
| Return items to inventory | Check this to restock inventory when the refund is processed       |
| Notify customer by email  | On by default; unchecking suppresses the refund confirmation email |

- **Full refund:** order status → Refunded, payment status → Refunded
- **Partial refund:** order status → Partial Refund; payment status remains Paid

### Manual Refunds (Non-Stripe Orders)

For orders that were paid by cash, check, or created manually without Stripe, use **Mark as Refunded** instead.

> This only updates the order status in SimplePress. No money movement occurs — you handle the actual refund outside the platform.

The options are the same: restock inventory and notify the customer by email.

### Cannot

- Refund more than the order total
- Refund an order that has already been fully refunded
- Process a Stripe refund on an order without a Stripe payment intent (use Mark as Refunded instead)

---

## Cancelling an Order

To cancel an order, open it and use the **More Options** menu (three-dot icon in the top right of the order detail page) → **Override Status** → set Status to **Cancelled**.

You'll have the option to:

- **Restock items** — restores inventory for items in the order (only applies if the order was paid or fulfilled; pending orders don't decrement inventory, so there's nothing to restore)
- **Send cancellation email** — notifies the customer

---

## Resending Emails

If a customer didn't receive an email, or you want to send a follow-up, open the order and use the **More Options** menu → **Resend Emails**.

The emails available to resend depend on the current state of the order:

| Email                 | Available When                                   |
| --------------------- | ------------------------------------------------ |
| Order Confirmation    | Payment status is Paid                           |
| Shipped (per package) | Order has shipments with tracking numbers        |
| Fulfilled             | Order is fulfilled and has no tracking shipments |
| Refund Confirmation   | Order status is Refunded                         |

---

## Manual Order Creation

You can create orders directly in the admin — no Stripe payment required. This is useful for phone orders, wholesale, in-person sales, or any situation where the customer isn't checking out on your storefront.

Go to **Orders** → **New Order** (button in the top right).

**Photo:** Screenshot of the New Order form with product selector and pricing fields visible.

### What You Can Set

**Customer:**

- Name and email (required)
- Option to send the customer an order confirmation email on creation

**Items:**

- Search and select products from your catalog; prices auto-populate
- Add multiple products/variants with individual quantities
- Or enter a direct subtotal if you're not itemizing line by line

**Pricing:**

- Shipping amount (enter in dollars)
- Tax amount (enter in dollars)
- Subtotal is calculated from your items (or entered directly)

**Payment & Fulfillment:**

- Payment Status: Pending, Paid, Failed, or Refunded
- Payment Method: Card, Cash, or Check
- Fulfillment Status: Unfulfilled, Fulfilled, or Partially Fulfilled

**Shipping Address:** Optional. You can add a delivery address for the order.

**Internal Notes:** Optional private note prepended with "[Manual Order]" automatically.

### Things to Know

- A customer record is created automatically from the name and email you enter. If a customer with that email already exists in your store, the order is linked to them.
- Manual orders appear in the Orders list alongside Stripe orders. They are identifiable by the payment method shown in the Payment panel.
- You are responsible for collecting payment outside of SimplePress for cash/check orders.

---

## Status Overrides

The **More Options** menu on any order gives you direct control over all three statuses independently:

- **Order Status** — set to any value (paid, fulfilled, cancelled, refunded, etc.)
- **Payment Status** — set to pending, paid, failed, or refunded
- **Fulfillment Status** — set to unfulfilled, partially fulfilled, or fulfilled

> Use overrides carefully. Changing a status directly (rather than using the fulfillment form or refund dialog) does not trigger customer emails or inventory adjustments. If you want those side effects, use the dedicated actions instead.

---

## Internal Notes

Each order has a private notes field visible only to you and any other admin users — customers never see it. Click the edit icon in the **Internal Notes** card to add or update a note (max 2,000 characters).

Use this for tracking special instructions, wholesale context, or anything relevant to the order that you want to remember.

---

## Shipping Address

The customer's shipping address is shown in its own panel on the order detail page. You can edit the address at any time, or add one if the order doesn't have one yet (e.g., for a manual order you created without an address).

> Editing the shipping address in the admin does not retroactively change what was sent to Stripe or affect any in-transit shipment — it only updates the record in SimplePress.

---

## Automatic Emails Reference

| Email                         | Triggered By                                                       |
| ----------------------------- | ------------------------------------------------------------------ |
| Order Confirmation (customer) | Stripe checkout completion, or on manual order creation if enabled |
| New Order Notification (you)  | Stripe checkout completion                                         |
| Order Shipped                 | Fulfillment with tracking, or new shipment with tracking           |
| Order Fulfilled               | Fulfillment without tracking, or new shipment without tracking     |
| Refund Confirmation           | Refund processed (Stripe or manual) with "Notify customer" enabled |
| Cancellation Confirmation     | Order cancelled with "Send email" enabled                          |

> Emails use your business name and logo. You cannot customize the email templates themselves. Preview all email templates at **Settings > Email Previews**.

---

## Cannot

- Edit order items or prices after an order is placed
- Combine two orders into one
- Assign an order to a different customer after creation
- Process a Stripe refund without Stripe Connect configured
- Bulk-fulfill or bulk-cancel orders
- Set a future fulfillment or cancellation date
- Generate shipping labels directly in SimplePress (use PirateShip or your carrier of choice)

---
