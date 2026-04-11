# Shipping

Shipping settings live at **Settings > Shipping** in your admin dashboard. This is where you decide what — if anything — you charge customers for delivery, and whether you offer an in-store pickup option.

> For information on how to fulfill orders, add tracking numbers, and communicate shipment details to customers, see [Orders](./orders.md).

**Photo:** Screenshot of the Shipping Settings page showing the shipping type selector and in-store pickup toggle.

---

## Shipping Methods

You can choose from three shipping models:

### Free Shipping

All orders ship at no charge to the customer. Shipping will show as **Free** in the order summary at checkout.

Use this if shipping is already built into your product prices, or if you simply want to offer free shipping to everyone.

### Flat Rate

Every order is charged a fixed shipping fee, regardless of order size or weight. You set the rate (e.g., `5.99`).

Use this if your orders are fairly consistent in size and your actual shipping costs don't vary much.

### Flat Rate with Free Shipping Threshold

Same as flat rate — but if a customer's order subtotal reaches a threshold you define (e.g., `$50.00`), shipping becomes free automatically.

This is a great way to encourage larger orders. The threshold is applied to the **order subtotal** (before tax and discounts).

**Example:** Flat rate `$6.00`, free shipping threshold `$50.00`. A $45 order pays $6 shipping. A $52 order ships free.

> Shipping rates are entered in dollars (e.g., `5.99`). Always enter your rate as a standard dollar amount.

---

## In-Store Pickup

If you have a physical location, you can enable **In-Store Pickup** to let customers choose between shipping and picking up their order in person. When this toggle is on, a "Ship to address" / "In-store pickup" selector appears during checkout.

Pickup orders carry **no shipping charge**.

> SimplePress does not send pickup-specific instructions to customers. Communicate pickup logistics via your order confirmation, storefront content, or directly with the customer.

**Photo:** Screenshot of the in-store pickup toggle in Shipping Settings.

---

## What Customers See at Checkout

Customers see an order summary that breaks down:

- Subtotal
- Discount (if a coupon was applied)
- Shipping (Free / $X.XX / "In-store pickup (free)")
- Estimated Total

> Tax and the confirmed total are finalized on the Stripe Checkout page — the storefront shows estimates up until that point.

**Photo:** Screenshot of the storefront checkout order summary showing the shipping line.

---

## Cannot

- Set per-product or per-variant shipping rates
- Configure rates by region, zone, or destination country
- Use carrier-calculated rates (e.g., live USPS or UPS quotes)
- Set a weight-based rate
