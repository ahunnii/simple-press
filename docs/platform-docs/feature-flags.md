# Features

The Features page lets you turn parts of your store on or off. Disabling a feature removes it from your admin panel and hides the corresponding pages and functionality from your storefront. This is useful if you run a service-based business with no products, a content-only site, or simply want to keep your admin tidy.

Go to **Settings → Features** to manage your enabled features.

---

## How It Works

**Photo:** Screenshot of the Settings → Features page showing all toggleable feature categories and switches.

Features are grouped into four categories: E-Commerce, Content, Customers, and Marketing. Each feature has a toggle switch. Changes take effect immediately — there's no save button. A brief notification confirms each change.

Some features **depend on other features**. If a feature's dependency is disabled, the toggle for the dependent feature is grayed out and shows a badge like **"Requires Products"**. Re-enabling the dependency makes the dependent feature toggleable again.

> **Important:** Disabling a feature removes its admin nav item and blocks access to those storefront pages, but it does **not** automatically update your storefront navigation menu. If you've added links to that section in your nav (e.g., a "Shop" link or "Blog" link), you'll need to remove them manually in **Settings → Storefront & Branding → Navigation**.

---

## Which Features You Can Toggle

Only a subset of features are owner-toggleable. The rest are always on or can only be changed by the platform team.

### E-Commerce

| Feature         | Default | Notes                                                                                                                                                                                    |
| --------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Products**    | On      | Enables your product catalog and all product-related admin pages. Disabling this also disables Orders, Cart, Inventory, Coupons, Collections, and Reviews — they all depend on Products. |
| **Orders**      | On      | Enables order receiving, management, fulfillment, and all order-related features. Requires Products.                                                                                     |
| **Collections** | Off     | Groups products into curated collections visible on your storefront. Requires Products.                                                                                                  |

The following E-Commerce features are always on (platform-managed) and do not appear as toggles:

- **Shopping Cart & Checkout** — The add-to-cart and checkout flow. Requires Products.
- **Inventory Management** — Stock tracking and low-stock alerts. Requires Products.
- **Coupons & Discounts** — Discount codes. Off by default; contact support to enable.

### Content

| Feature       | Default | Notes                                     |
| ------------- | ------- | ----------------------------------------- |
| **Galleries** | On      | Image galleries shown on your storefront. |
| **Blog**      | Off     | Blog with posts and articles.             |

**Custom Pages** (your `/about`, `/contact`, policies, etc.) is always on and cannot be disabled.

### Marketing

| Feature          | Default | Notes                                         |
| ---------------- | ------- | --------------------------------------------- |
| **Testimonials** | On      | Customer testimonials collection and display. |

The following Marketing features are always on or require platform activation:

- **Contact Form** — Always on by default; not owner-toggleable. See [Contact Form](./contact-form.md).
- **Customer Accounts** — Always on; cannot be disabled.
- **Product Reviews** — Off by default; requires platform activation. See [Product Reviews](./reviews.md).

---

## What Happens When You Disable a Feature

### Disabling Products

This is the most impactful toggle. Disabling Products cascades to everything that depends on it:

- Your `/shop` storefront page returns a 404
- All product, order, inventory, and collection pages disappear from your admin
- Coupons, Collections, and Reviews become unavailable
- The Shopping Cart & Checkout feature is also deactivated

Re-enabling Products restores everything — your products, orders, and inventory data are all preserved.

### Disabling Orders

- The Orders section disappears from your admin sidebar
- New orders cannot be placed through checkout
- Existing order data is preserved and accessible again when you re-enable it

### Disabling Collections

- The `/collections` storefront pages return a 404
- The Collections admin section is hidden
- Collection data is preserved

### Disabling Galleries

- Your gallery admin section is hidden
- Gallery-related sections on your storefront are hidden
- Gallery content is preserved

### Disabling Blog

- The `/blog` storefront pages return a 404
- The Blog admin section is hidden
- All blog post content is preserved

### Disabling Testimonials

- The `/testimonials` storefront page is hidden
- Testimonials admin section is hidden
- All testimonial content is preserved

---

## Common Use Cases

**Service business with no products**
Disable Products. This removes the shop, cart, orders, and inventory from both your admin and storefront. Your site becomes a content- and contact-focused presence.

**Content or portfolio site**
Disable Products, enable Blog and Galleries. Your storefront focuses on articles, images, and a contact form — no shopping at all.

**Soft launch**
Keep Products enabled but disable Orders temporarily. Your products are visible but customers cannot check out.

---

## Features That Require Platform Activation

Some features are not toggleable by you and require the platform team to enable them:

| Feature                 | Why                                                                |
| ----------------------- | ------------------------------------------------------------------ |
| **Product Reviews**     | Off by default; enables customer review submissions and moderation |
| **Coupons & Discounts** | Off by default; enables discount codes at checkout                 |

To request either of these, contact support. Once enabled by the platform team, the feature will appear active in your admin even though you won't see a toggle for it.

---

## Frequently Asked Questions

**Will disabling a feature delete my data?**
No. All data (products, orders, blog posts, gallery images, testimonials, etc.) is preserved when you disable a feature. Re-enabling it restores full access.

**Why is a feature's toggle grayed out?**
It has a dependency that's currently disabled. The badge next to the toggle tells you which feature needs to be enabled first.

**I disabled Blog but the "Blog" link is still in my storefront header. Why?**
Disabling a feature doesn't automatically remove links from your storefront navigation. Go to **Settings → Storefront & Branding → Navigation** to remove the link manually.

**Can I disable Customer Accounts?**
No. Customer Accounts is a platform feature that is always on.

**A feature I need isn't on this page. What do I do?**
Some features are managed by the platform team and don't have owner-facing toggles. Contact support and we can make the change for you.

---
