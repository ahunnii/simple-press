# Pages & Policies

The Pages & Policies section lets you create standalone content pages for your storefront — things like an About page, an FAQ, or a Contact page — and manage your four standard policy documents (Privacy Policy, Terms of Service, Returns & Refunds, and Shipping Policy). Both are managed under **Content** in the admin sidebar.

---

## Custom Pages

### Getting There

In the admin sidebar, go to **Content > Pages**. This opens your list of all custom pages with their title, slug, publish status, and last-updated date.

Use the search bar at the top to filter by title or slug.

**[Photo: Custom pages list — table with title, slug, Published/Draft status badges, updated date, and action dropdown (⋮)]**

---

### Creating a Page

Click **Create Page** in the top right. The editor has two tabs: **Content** and **SEO**.

#### Content Tab

| Field | What it's for |
|---|---|
| **Title** | The page's heading, shown on the storefront |
| **Slug** | The URL path for the page (e.g., slug `our-story` → `yourstore.com/our-story`). Auto-generated from the title when creating a new page; you can edit it manually. Must be unique. |
| **Short Description** | A brief summary of the page — used as the fallback meta description if no SEO description is set |
| **Content** | The full page body, written in the rich text editor (TipTap). Supports headings, bold/italic, links, lists, and block quotes. |

**[Photo: Page editor — Content tab showing title field, slug field (with "/" prefix), short description, and TipTap editor open]**

#### A note on slugs

The slug becomes the live URL path for your page. A few rules to keep in mind:

- Slugs are automatically generated from your title when creating a new page (e.g., "Our Story" → `our-story`)
- You can edit the slug manually at any time — including after the page is published
- Slugs must be unique across all your pages; if you try to save a duplicate, you'll get an error
- Keep them short, lowercase, and hyphen-separated for best results

#### Embedding a Gallery

If you have the **Galleries** feature enabled, you can insert a gallery directly into your page content using the TipTap toolbar. This lets you display a full image gallery inline within the page body.

#### SEO Tab

| Field | Notes |
|---|---|
| **Meta Title** | Shown in browser tabs and search results. Aim for under 60 characters. Falls back to the page title if left blank. |
| **Meta Description** | Shown as the preview snippet in search results. Aim for under 160 characters. Falls back to the short description if left blank. |

**[Photo: Page editor — SEO tab showing meta title (with character count) and meta description fields]**

---

### The Published Toggle

The **Published** toggle in the editor toolbar controls whether the page is visible on your storefront.

- **Off (Draft):** the page is invisible to customers and cannot be accessed directly by URL
- **On (Published):** the page is live at `yourstore.com/[slug]`

You can toggle it on and off at any time without losing your content.

**[Photo: Page editor toolbar — showing Published toggle, Unsaved Changes / Saved badge, Reset button, and Save button]**

---

### Editing a Page

From the page list, click the page title (or open the ⋮ dropdown and click **Edit**). All fields are available. Click **Save changes** when done.

The toolbar shows an **Unsaved Changes** badge whenever you have edits that haven't been saved yet.

---

### Viewing a Live Page

From the page list, open the ⋮ dropdown on any published page and click **View Live**. This opens the page on your storefront in a new tab.

---

### Deleting a Page

From the page list, open the ⋮ dropdown and click **Delete**. You'll be prompted to confirm before the page is permanently removed. This cannot be undone.

---

### How Pages Appear on the Storefront

Custom pages are accessible at `yourstore.com/[slug]`. They are rendered using your active storefront template's generic page layout, which includes your header, footer, and overall branding.

Pages are not automatically added to your navigation menu — if you want a page to appear in your header or footer nav, go to **Content > Navigation** and add it as a menu item manually.

---

## Policies

### Getting There

In the admin sidebar, go to **Content > Policies**. This opens the policies editor with four tabs — one for each standard policy document.

**[Photo: Policies editor — showing the four tabs (Privacy, Terms, Returns, Shipping) and the TipTap editor for the active policy]**

---

### The Four Policies

| Tab | Slug | Storefront URL |
|---|---|---|
| Privacy | `privacy-policy` | `yourstore.com/privacy-policy` |
| Terms | `terms-of-service` | `yourstore.com/terms-of-service` |
| Returns | `refund-policy` | `yourstore.com/refund-policy` |
| Shipping | `shipping-policy` | `yourstore.com/shipping-policy` |

Each policy has a fixed slug — you cannot change the URL for a policy page.

---

### Editing a Policy

Click the tab for the policy you want to edit. The rich text editor (TipTap) lets you write or update the policy content with full formatting: headings, bold/italic, links, lists, and block quotes.

When you're done editing any or all of the tabs, click **Save content** to save all four at once.

#### Using a Template

Each policy tab has a **Use Template** button that loads a pre-written starter template for that policy type. The template is a sensible starting point but is intentionally generic — you should review and customize it to reflect your actual business practices before publishing.

> **Important:** The templates contain placeholder text such as `[your email]`, `[X] days`, and `[Your Business Name]`. Fill these in before your store goes live.

**[Photo: Policy editor showing the "Use Template" button, loaded template content in the TipTap editor, with placeholder text visible]**

---

### Policies Are Always Published

Unlike custom pages, policies do not have a draft/published toggle. When you save a policy, it is immediately live at its storefront URL.

If you haven't saved content for a policy yet, the page does not exist on your storefront — it simply returns a "not found" response until you save something.

---

### The Platform Policy Notice

On your **Privacy Policy** and **Terms of Service** pages, a notice is automatically appended at the bottom of the page on the storefront. It reads:

> *This store is hosted on the SimplePress platform, operated by Center for Generative Justice LLC. Your use of this store is also subject to the SimplePress Terms of Service and Privacy Policy.*

**This notice cannot be removed.** It is required because your store runs on the SimplePress platform and customers are subject to both your policies and the platform's policies.

The notice only appears on `privacy-policy` and `terms-of-service` — it does not appear on your refund or shipping policy pages.

**[Photo: Storefront privacy policy page — scrolled to the bottom showing the "Powered by SimplePress" platform notice banner]**

---

## What You Can and Cannot Do

**You can:**
- Create, edit, publish, unpublish, and delete custom pages at any time
- Manually edit a page's slug at any time (including after it's published)
- Set per-page SEO metadata independently of the global site SEO
- Embed galleries in page content (if Galleries is enabled)
- Use starter templates for all four policy pages
- Leave a policy blank — it simply won't appear on your storefront until you save content

**You cannot:**
- Use the same slug on two pages — duplicates are blocked with an error
- Change the slug of a policy page — policy slugs are fixed (`privacy-policy`, `terms-of-service`, `refund-policy`, `shipping-policy`)
- Remove the platform policy notice from your Privacy Policy or Terms of Service pages
- Schedule a page to publish at a future date — the Published toggle takes effect immediately when you save
- Add pages to your storefront navigation automatically — you must add them manually in Content > Navigation

---

## Feature Flag

Pages is **on by default** and is not owner-toggleable. If you can't access Content > Pages, contact support.

> **Depends on:** The Blog feature depends on Pages being enabled.
