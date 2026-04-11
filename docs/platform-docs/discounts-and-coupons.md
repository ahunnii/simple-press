# Discounts & Coupons

Discount codes let you offer promotions at checkout — a percentage off, a fixed dollar amount, or a seasonal deal tied to an optional storefront banner. Customers enter the code in their cart before paying and the discount is applied to the order total.

> **Feature note:** The Coupons feature is **off by default** and must be enabled by a platform administrator before it appears in your admin. Once enabled, the Discounts section becomes available under your admin navigation. It also depends on the Cart feature being active.

---

## The Discounts List

Navigate to **Discounts** in your admin sidebar to see all discount codes for your store. The table shows each code, the discount amount, how many times it's been used, its expiration date, and whether it's currently active.

**Photo:** Screenshot of the discounts list table showing code, discount amount, usage count, expiry, and active/inactive badges.

---

## Creating a Discount Code

Click **New Discount** to open the discount form. You'll fill in four main areas:

### Discount Code

The code string customers type at checkout. It is automatically uppercased when saved (e.g., typing `summer20` becomes `SUMMER20`). Each code must be unique within your store — you cannot have two codes with the same text.

**Tip:** Keep codes short and memorable. Use letters and numbers only — e.g., `SAVE20`, `WELCOME10`, `WINTER2024`.

### Discount Amount

Choose the **type** and **value**:

| Type | How it works |
|------|-------------|
| **Percentage** | Deducts a percentage of the cart subtotal. Enter a number from 1–100 (e.g., `20` for 20% off). |
| **Fixed Amount** | Deducts a flat dollar amount. Enter the dollar value (e.g., `10` for $10 off). |

The discount can never exceed the cart total — if the discount amount is larger than what's in the cart, the total is simply reduced to $0.

### Restrictions

These are optional limits that control how and when a code can be used:

- **Usage Limit** — the maximum number of times the code can be redeemed across all customers. Leave blank for unlimited uses. Once the limit is hit, the code automatically stops working.
- **Expiration Date** — the date after which the code is no longer valid. Leave blank for no expiration.
- **Minimum Purchase** — the cart subtotal must be at or above this amount before the code applies. If the cart doesn't meet the minimum, the customer sees an error at checkout.
- **Maximum Discount** — caps how much the discount can take off, regardless of the cart total. Most useful with percentage codes (e.g., a 30% off code capped at $50 so a $500 order doesn't get $150 off).

### Status

The **Active** toggle controls whether the code works at checkout. Inactive codes are rejected immediately when a customer tries to apply them. You can disable a code at any time without deleting it — useful for pausing a promotion and reactivating it later.

**Photo:** Screenshot of the discount create/edit form showing the code field, discount type selector, value input, restrictions section, and active toggle.

---

## Storefront Banner

Any discount code can optionally display a promotional announcement bar at the top of your storefront to advertise the promotion to visitors.

Toggle **Advertise on storefront** on to reveal the banner fields:

- **Banner message** — the text that appears in the bar (e.g., `Summer sale — use code SUMMER20 at checkout for 20% off`). The code itself is also automatically appended.
- **Link (optional)** — a path or URL the "Shop now" link points to. Accepts relative paths like `/shop` or `/collections/summer` or a full external URL. Defaults to `/shop` if left blank.

The banner only shows when the code is **active**, within its validity window, and has not yet hit its usage limit. Once any of those conditions fail, the banner disappears automatically. If you have multiple banners set up, the most recently created valid one is shown.

> **Template support:** The announcement bar is currently rendered on the **Happy Bamboo** and **Noise** templates. On other templates, the storefront banner setting is saved but the bar will not be visible to customers.

**Photo:** Screenshot of the storefront announcement bar as seen by a customer, showing the banner text and "Shop now" link.

---

## Editing and Deleting Discounts

Click the edit icon (pencil) next to any code in the list to open its form. All fields are editable at any time, including the code string itself (as long as the new value doesn't conflict with another existing code).

To permanently delete a discount, open its edit page and click **Delete** in the toolbar. A confirmation dialog will appear before anything is removed. Deletion is permanent and cannot be undone.

> If you want to stop a code from working temporarily, use the **Active** toggle instead of deleting it.

---

## How Discounts Work at Checkout

When a customer enters a code at checkout, the platform validates it server-side in this order:

1. **Code exists** — the code must match exactly (case-insensitive).
2. **Active** — the code must have its Active toggle on.
3. **Validity window** — if a start or expiration date is set, the current time must fall within the window.
4. **Usage limit** — if a limit is set, the current usage count must be below it.
5. **Minimum purchase** — the cart subtotal must meet the minimum (if one is set).
6. **Amount calculation** — the discount is computed and capped by the maximum discount (if set) and the cart total.

If any check fails, an error message is shown and the code is not applied. The usage count only increments when an order is successfully completed through Stripe — not when the code is validated at the cart stage.

---

## Deactivating Expired Codes

The platform can automatically deactivate codes that are past their expiration date or have exhausted their usage limit. This cleanup runs when you visit the discounts section. You can also trigger it manually. Codes deactivated this way are not deleted — they remain in your list with an "Inactive" status so you have a record of them.

---

## Cannot Do

- Apply a discount retroactively to a past order — discounts are applied at checkout only
- Use the same code string for two different discounts in your store
- Enable the Coupons feature yourself — a platform administrator must turn it on
- Use Coupons without the Cart feature also being active
- Set a "starts at" date for future activation via the admin form (activation is controlled by the Active toggle and expiry date only)

---

## Tips

- **Seasonal promotions:** Create the code ahead of time, leave it inactive, then flip it on when you're ready. Set an expiration date so it automatically becomes stale after the sale ends.
- **Influencer codes:** Create unique codes per collaborator (e.g., `JANE15`) with a usage cap to track redemptions per partnership.
- **Cap your percentage codes:** A 20% code without a maximum discount cap can be very costly on large orders. Use the Maximum Discount field to protect your margins.
- **Banner + code pairing:** If you're running an active promotion, enable the storefront banner so visitors see the code without having to look for it.
