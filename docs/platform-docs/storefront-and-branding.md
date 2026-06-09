# Storefront & Branding

Your storefront is the public-facing side of your store — the pages your customers see when they visit your URL. The **Content** section of your admin dashboard is where you control what it looks, feels, and reads like.

There are four main areas under Content: **Branding**, **Navigation**, **SEO**, and **Template Fields**. This page covers all of them.

---

## Getting Here

From your admin dashboard, click **Content** in the sidebar. You'll see links to each of the four sections below.

> **Photo:** Screenshot of the Content section in the admin sidebar, showing Branding, Navigation, SEO, and Template Fields.

---

## Branding

The Branding editor is where you set your store's visual identity: your template, logo, favicon, colors, social links, and footer text.

> **Photo:** Full screenshot of the Branding editor with all sections visible (template selector, logo, favicon, colors, social links, footer text).

### Template

Your template controls the overall design and layout of your storefront — the structure of your homepage, product pages, shop, and more.

To change your template, select one from the dropdown. The change takes effect immediately for your customers after you save.

**Available templates** vary by account. Most stores have access to:
- **Modern** — Clean, minimal layout
- **Elegant** — Refined, editorial feel
- **Default** — Simple fallback layout

Some templates (Bamboo, Happy Bamboo, Pollen, Dark Trend, Noise, and others) are commercial and tied to specific accounts. You will only see the templates available to your store.

> **Note:** Switching templates does not delete your content — all values you've entered for your previous template's fields are preserved in the database. However, they won't appear in the editor until you switch back to that template. See [Template Fields](#template-fields) below for more on this.

**Cannot:**
- Create or customize a template's layout/code — templates are managed by the platform
- Access commercial templates not assigned to your account

---

### Logo

Your logo appears in your storefront header and in transactional emails sent to customers.

- **Upload** a file directly, or paste in a URL
- **Accepted formats:** JPG, JPEG, PNG, GIF, WebP, SVG, AVIF
- **Recommended:** At least 200px wide, transparent PNG for best results
- A preview is shown before you save
- Uploading a new logo replaces the previous one

If no logo is uploaded, your store name is shown as text instead.

> **Photo:** Logo upload area showing the upload button and live preview.

---

### Favicon

Your favicon is the small icon that appears in the browser tab when someone visits your store.

- **Accepted formats:** JPG, JPEG, PNG, GIF, WebP, SVG, AVIF
- **Recommended size:** 32×32px or 16×16px
- Uploading a new favicon replaces the previous one

If no favicon is set, the default SimplePress favicon is used.

> **Photo:** Favicon upload field with the small preview icon visible.

---

### Colors

Three color values control your storefront's color palette — how they're applied depends on your template, but in general:

| Color | Typical Use |
|---|---|
| **Primary** | Main brand color — buttons, accents, headings |
| **Secondary** | Background tones, secondary UI elements |
| **Accent** | Highlights, badges, calls to action |

Click any color swatch to open the color picker and choose your value.

> **Photo:** Color section of the Branding editor with all three color pickers visible.

---

### Social Links

Add links to your social media profiles and they'll appear in your storefront footer. All fields are optional — only the ones you fill in will be displayed.

**Supported platforms:**
- Instagram
- Facebook
- Twitter / X
- LinkedIn
- TikTok

Enter the full URL to your profile (e.g., `https://instagram.com/yourbusiness`).

---

### Footer Text

A short line of text shown in your storefront footer — use it for a tagline, mission statement, or copyright notice.

- **Maximum:** 500 characters

---

### Saving Your Branding Changes

All changes in the Branding editor are saved together when you click **Save**. The toolbar at the top of the page shows an **Unsaved Changes** badge whenever you have edits that haven't been saved yet. You can also click **Reset** to discard your changes and return to the last saved state.

> **Keyboard shortcut:** Press `Cmd + Enter` (Mac) or `Ctrl + Enter` (Windows) to save quickly.

---

## Navigation

The Navigation editor lets you build the menu links that appear in your storefront header and footer.

> **Photo:** Navigation editor showing a list of menu items with label, URL, and reorder controls.

### Adding and Editing Menu Items

Each menu item has:
- **Label** — The text shown in the nav (max 100 characters)
- **URL** — Where the link goes (max 500 characters). Use relative paths for internal pages (e.g., `/products`, `/about`) or full URLs for external links.
- **Open in new tab** — Toggle this on for links that point to external websites

Click **+ Add Item** to add a new link. Use the trash icon to remove an item.

### Reordering Items

Use the up/down arrow buttons next to each item to change the order they appear in your menu.

### Quick Add

The sidebar provides quick-add buttons for common destinations — Products, Collections, and any custom pages you've already created — so you don't have to type URLs manually.

### Defaults

If you haven't added any nav items, your storefront defaults to showing: **Home** (`/`) and **Products** (`/products`).

**Cannot:**
- Create dropdown menus or nested navigation
- Add icons to nav items
- Style individual items differently

---

## SEO

The SEO editor sets the site-level meta tags — the title, description, and social sharing image used as defaults across all pages. Individual pages and products can override these with their own values.

> **Photo:** SEO editor with meta title, meta description, keywords, and OG image fields visible, and the search preview card below.

### Meta Title

The title shown in Google search results and your browser tab.

- **Max:** 255 characters
- **Optimal:** 50–60 characters (a live character counter guides you)

### Meta Description

The short description shown below your title in search results.

- **Max:** 500 characters
- **Optimal:** 150–160 characters (a live character counter guides you)

### Meta Keywords

A comma-separated list of keywords (e.g., `handmade candles, soy wax, Detroit`). Modern search engines largely ignore this field, but it doesn't hurt to fill it in.

- **Max:** 255 characters

### Open Graph Image

The image shown when someone shares your store link on Facebook, LinkedIn, Twitter/X, or other platforms that support Open Graph.

- **Recommended size:** 1200×630px
- **Accepted formats:** JPG, JPEG, PNG, GIF, WebP, SVG, AVIF
- Upload a file or paste in a URL

### Search Result Preview

Below the fields, a live preview card shows how your meta title and description will appear in a Google search result. It updates in real time as you type.

---

## Template Fields

Template fields are content slots defined by your template — things like hero headlines, about section text, feature callouts, and images. These let you customize the words and visuals inside your storefront pages without touching any code.

> **Photo:** Template fields editor showing page tabs (Homepage, About, Contact, etc.) and grouped content sections below.

### How Fields Are Organized

Fields are organized by **page** (e.g., Homepage, About, Contact, Shop, Blog, Global) with tabs across the top. Within each page, fields are grouped into named sections.

### Field Types

Depending on your template, you may see any of the following:

| Field Type | What It Is |
|---|---|
| **Text** | A single line of plain text |
| **Textarea** | Multiple lines of plain text |
| **Rich Text** | Formatted content — headings, bold, lists, links |
| **Image** | A single uploaded image |
| **Gallery** | A gallery you've created (see the Galleries section) |
| **Color** | A color picker value |
| **Boolean** | An on/off toggle |
| **List** | Repeating rows (e.g., feature cards, each with an icon and text) |
| **Video** | An uploaded video file (max 20MB; MP4, WebM, MOV, AVI) |
| **URL** | A web link |
| **Number** | A numeric value |

### Default Values

Every field has a default value set by the template. If you haven't saved a value for a field, the default is shown on your storefront. You don't need to fill in every field — only the ones you want to customize.

### Saving Template Fields

Use the **Save** button in the toolbar. The **Unsaved Changes** badge appears when you have edits pending. You can **Reset** to discard changes and go back to the last saved state.

> **Keyboard shortcut:** `Cmd + Enter` / `Ctrl + Enter` to save.

> **Photo:** A list-type field showing repeating card rows with per-row inputs (e.g., icon + text).

**Cannot:**
- Add new field types outside what your template defines
- See or edit fields for a template you're not currently using

---

## What You Cannot Change After Signup

- **Subdomain** — Your subdomain (e.g., `yourstore.simplepress.co`) is set during onboarding and cannot be changed afterward. If you want a custom domain, see [Domain Settings](./domain.md).
- **Template code** — Visual layout and structure are controlled by the platform, not editable by owners.
