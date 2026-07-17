export interface ExportSummary {
  storeName: string;
  /** ISO datetime. */
  exportedAt: string;
  counts: {
    pages: number;
    blogPosts: number;
    policies: number;
    faqs: number;
    testimonials: number;
    products: number;
    orders: number;
    customers: number;
    discounts: number;
    reviews: number;
  };
}

/**
 * Builds the plain-language migration guide (README.md) bundled at the root
 * of a WordPress-offboarding export zip. Written for a small-business owner,
 * not a developer — the technical dump lives in data.json instead.
 */
export function buildReadme(summary: ExportSummary): string {
  const { storeName, exportedAt, counts } = summary;
  const exportedDate = new Date(exportedAt).toISOString().split("T")[0];

  return `# Moving ${storeName} to WordPress

This export was generated on ${exportedDate}. It contains everything from your
SimplePress store, packaged so you can rebuild it on WordPress and
WooCommerce. Follow the steps below in order — each one builds on the last.

## What's in this export

| File | Contents | Count |
| ---- | -------- | ----- |
| \`content.wxr.xml\` | Pages | ${counts.pages} |
| \`content.wxr.xml\` | Blog posts | ${counts.blogPosts} |
| \`content.wxr.xml\` | Policy pages | ${counts.policies} |
| \`content.wxr.xml\` | FAQs | ${counts.faqs} |
| \`content.wxr.xml\` | Testimonials | ${counts.testimonials} |
| \`products.csv\` | Products | ${counts.products} |
| \`records/orders.csv\` + \`records/order-items.csv\` | Orders | ${counts.orders} |
| \`records/customers.csv\` + \`records/customer-addresses.csv\` | Customers | ${counts.customers} |
| \`records/discounts.csv\` | Discount codes | ${counts.discounts} |
| \`records/reviews.csv\` | Product reviews | ${counts.reviews} |
| \`data.json\` | Everything above, machine-readable | — |

## Step 1 — Set up WordPress

If you don't already have a WordPress site, you'll need hosting and a fresh
WordPress install first. Most hosts (Bluehost, SiteGround, WP Engine, and
others) will install WordPress for you automatically when you sign up. If
you're starting from scratch, [wordpress.org](https://wordpress.org/) has a
current list of recommended hosts and a step-by-step install guide.

## Step 2 — Import your content

In your new WordPress site, go to **Tools → Import**, find **WordPress** in
the list, and click **Install Now** (WordPress will prompt you to install a
small importer plugin the first time — that's expected). Once it's
installed, click **Run Importer** and upload the \`content.wxr.xml\` file from
this export.

WordPress will ask you to assign the imported posts and pages to a user —
choose yourself or whichever admin account you'll be using. On the next
screen, **check the box labeled "Download and import file attachments."**

**Important: run this import while your SimplePress store is still online.**
Your product photos, blog images, and other media are downloaded live from
your SimplePress store's servers during the import — they are not included as
files inside this zip. If your store has already been taken offline, those
images will fail to import.

## Step 3 — Set up your store (WooCommerce)

Install the free **WooCommerce** plugin from **Plugins → Add New**, and run
through its short setup wizard (you can skip or adjust most of it — you'll
configure shipping and payments yourself in the next steps).

Once WooCommerce is active, go to **Products → Import**, and upload the
\`products.csv\` file from this export. It's formatted for WooCommerce's
built-in CSV importer, so the column mapping screen should match up
automatically — just confirm the mapping and click **Run the importer**.

## Step 4 — Reconnect Stripe

Install the **WooCommerce Stripe Payment Gateway** plugin and connect it to
the **same Stripe account** you used with SimplePress. Because it's the same
account, your Stripe customer records and full payment history carry over
automatically — you don't need to re-enter or migrate any of that.

## Your records (records/ folder)

WordPress and WooCommerce don't have a built-in importer for historical
orders, customers, discount codes, or reviews the way they do for products
and content, so these are provided as plain CSV files for your records:

- \`records/orders.csv\` and \`records/order-items.csv\` — full order history
- \`records/customers.csv\` and \`records/customer-addresses.csv\` — customer
  contacts and saved addresses
- \`records/discounts.csv\` — your discount/coupon codes
- \`records/reviews.csv\` — product reviews

You can keep these for bookkeeping as-is, or use a plugin such as **WP All
Import** (Pro) or **WebToffee Import Export Suite for WooCommerce** if you
want to bring historical orders and customers directly into WooCommerce.
Discount codes are usually fastest to just re-create by hand under
**WooCommerce → Marketing → Coupons** — there typically aren't many, and it
only takes a minute or two per code.

## What didn't transfer

- **Theme and design.** WordPress themes work differently from SimplePress
  templates, so your visual design does not carry over — you'll need to pick
  a new WordPress theme and rebuild the look of your site. Your raw site text
  (headlines, descriptions, etc.) is preserved in \`data.json\` so you have it
  on hand while rebuilding.
- **Shipping zone configuration.** Your shipping rates and zones will need to
  be re-created under **WooCommerce → Settings → Shipping**.
- **Embedded widgets or iframes.** Third-party embeds (booking widgets, maps,
  etc.) may be stripped out by WordPress during import. Check your imported
  pages and re-add any embeds manually.
- **Draft pages.** Pages that were unpublished drafts in SimplePress import
  as drafts in WordPress too — review and publish them when you're ready.

## data.json

This file is a complete, machine-readable dump of everything listed above,
plus a few internal fields that have no WordPress equivalent. It's mainly
useful for a developer, or as an input file for a more advanced import tool —
you shouldn't need to open it yourself unless something above doesn't look
right and you want to double-check the original data.
`;
}
