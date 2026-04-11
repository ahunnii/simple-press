# Inventory Management

Inventory management in SimplePress lets you track stock levels for your products and variants, control whether customers can order when stock runs out, and stay on top of low-stock situations before they become a problem.

---

## Where to Find Inventory Settings

There is no standalone inventory page. Inventory settings live directly on each product in the **Products** section of your admin. Open any product, scroll down to the **Inventory** section, and you will find all the controls described below.

---

## Enabling Inventory Tracking

Every product has a **Track Inventory** toggle. It is off by default.

- **Off:** The product is always treated as in stock. Customers can always add it to their cart and check out, regardless of any quantity you may have entered.
- **On:** The platform enforces your stock quantity. Customers cannot check out an item that has no available stock (unless you also enable backorders — see below).

Enabling tracking on a product applies to **all of its variants**, too. There is no per-variant toggle; it is a product-level setting.

> **Tip:** If your product line has a mix of tracked and untracked items, create separate products rather than trying to work around this at the variant level.

---

## Setting Inventory Quantities

### Products without variants

When tracking is enabled on a simple product (no variants), an **Inventory Quantity** field appears below the toggle. Enter the number of units you have on hand. This field is hidden if tracking is off.

### Products with variants

When a product has variants, each variant has its own **Inventory Quantity** field inside the variant manager. There is no single shared quantity — each size, color, or option you sell is tracked independently.

**Bulk quantity set:** In the variant manager, you can select multiple variants using the checkboxes and set a quantity for all of them at once. This is useful when restocking a full product line.

> **Note:** You cannot set a negative inventory quantity manually. The system will reject values below zero.

---

## Allow Backorders

When **Track Inventory** is on, a second toggle appears: **Allow Backorders**.

- **Off (default):** Once stock reaches zero, customers cannot add the item to their cart. It will appear as out of stock on the storefront.
- **On:** Customers can still check out even when quantity is zero or lower. This is useful if you make to order, accept pre-orders, or are comfortable fulfilling after restocking.

When backorders are enabled, inventory will decrement past zero. A variant showing `−3` means three more units were ordered than you had available. The platform tracks this so you know exactly how many units you need to fulfil outstanding orders.

> This setting is per-product and applies to all variants.

---

## How Inventory Is Decremented

When a customer completes checkout through Stripe, the platform automatically reduces your stock:

1. **At checkout creation** — the system checks availability first. If a variant is out of stock (and backorders are off), the item is flagged as unavailable and the customer sees an error before they ever reach Stripe. They cannot proceed with that item.
2. **When the payment is confirmed** — on the Stripe webhook, inventory is decremented inside a database transaction using a conditional update. If two customers attempt to buy the last unit simultaneously, only one will succeed; the other will have their inventory flagged as an oversell (their order still goes through, but the platform logs the discrepancy).

> Inventory decrements happen atomically — the platform never double-counts a sale, even under simultaneous purchases.

---

## Oversells

In rare high-traffic situations, a customer may complete payment for an item that sold out between their cart check and payment confirmation. When this happens:

- The order is still created and confirmed (Stripe has already charged them)
- The inventory quantity is **not** changed (it was already at zero)
- The system logs the event internally so the discrepancy is recorded

You will need to fulfil these orders manually — either by restocking and shipping, or by contacting the customer to arrange a refund or substitution.

---

## Low-Stock Alerts

The **Dashboard** surfaces a low-stock section that shows your most urgently low variants at a glance:

- Any published product variant with **10 or fewer units** remaining appears in the alert list
- Variants are sorted from lowest stock to highest, so the most urgent items appear first
- Up to **5 variants** are shown at a time — follow the link to the product to manage stock

The threshold of 10 units is fixed; it cannot be changed per product. Only **published** products appear in the alert — drafts and unpublished products are excluded.

> **Photo:** Screenshot of the dashboard low-stock alert section, showing variant names, product names, and remaining quantities.

---

## Restocking After a Refund or Cancellation

When you refund or cancel an order, the refund/cancellation dialog includes a **Restock items** toggle:

- **On:** Inventory quantities are restored for all items in the order, as if the sale never happened.
- **Off:** Inventory is not restored — use this if the customer is keeping the item, if the product was damaged, or if you do not want to re-list the stock.

See the **Orders** documentation for full details on refunds and cancellations.

---

## Checking Stock on a Product

To see current stock levels:

1. Go to **Products** in the admin sidebar
2. Open the product you want to check
3. Scroll to the **Inventory** section

For variants, each row in the variant manager shows the current quantity next to the variant name when inventory tracking is enabled. You can update any quantity directly from this view and save the product.

> **Photo:** Screenshot of the product edit page showing the Inventory section with Track Inventory toggle on, Inventory Quantity field, and Allow Backorders toggle visible.

> **Photo:** Screenshot of the variant manager with inventory tracking enabled, showing per-variant quantity fields and the bulk-set quantity option.

---

## Feature Flag

Inventory management is **on by default** for all stores. You cannot turn it off yourself — it is managed at the platform level. If you disable the **Products** feature in Settings > Features, inventory management is also disabled (since there are no products to track).

---

## What You Can and Cannot Do

**You can:**

- Enable or disable inventory tracking per product
- Set and update inventory quantities for products and individual variants
- Set a single quantity across multiple selected variants at once
- Allow backorders on a product (customers can order past zero)
- Choose whether to restock items when a refund or cancellation is processed
- View low-stock alerts on the dashboard

**You cannot:**

- Enter a negative inventory quantity manually
- Configure the low-stock alert threshold (it is fixed at 10 units)
- Turn the inventory feature off yourself (admin-managed)
- Set different backorder rules per variant — it is a product-level toggle
- View a full inventory history log in the admin (changes are tracked internally but are not displayed in the interface)
