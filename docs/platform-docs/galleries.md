# Galleries

Galleries let you build curated image collections that you can embed directly into your storefront through template content fields. Instead of pasting individual image URLs into every field, you build a gallery once, choose how it displays, and reference it wherever your template supports one.

---

## Creating a Gallery

Go to **Galleries** in the admin sidebar and click **New Gallery**.

You will need to provide:

- **Name** — displayed internally in the admin (e.g., "Summer Lookbook")
- **Slug** — the gallery's unique identifier, auto-generated from the name. You can edit it before saving, but **the slug cannot be changed after the gallery is created**
- **Description** — optional; some templates display this alongside the gallery on the storefront

Once the gallery is created, you land in the gallery editor where you can upload images and configure the display.

> **Photo:** New gallery form (name, slug, description fields).

---

## Uploading and Managing Images

Inside the gallery editor, use the **Images** tab to add photos.

- Drag files directly onto the upload area, or click to browse
- Multiple files can be uploaded at once
- **Maximum file size: 5 MB per image**
- After uploading, each image can be given:
  - **Alt text** — describes the image for screen readers and SEO; recommended for every image
  - **Caption** — optional text shown below or over the image (depending on your layout and caption settings)

**Reordering images:** Drag images by their handle to change the display order. The order you set here is the order customers see on the storefront.

**Editing an image:** Click the edit icon on any image to update its alt text or caption without re-uploading.

**Deleting an image:** Click the delete icon on an image to remove it. This cannot be undone.

> **Photo:** Gallery editor — Images tab with uploaded photos, drag handles, and edit/delete buttons visible.

> **Photo:** Image edit modal showing alt text and caption fields.

---

## Layout Options

Switch to the **Settings** tab in the gallery editor to choose how your images are arranged. There are five layout types:

| Layout | Description |
|---|---|
| **Grid** | Uniform rows and columns — all images the same size |
| **Masonry** | Pinterest-style cascading columns — variable heights create a waterfall effect |
| **Carousel** | One image at a time with left/right navigation and dot indicators; keyboard arrow keys also work |
| **Collage** | The first image is large (spanning two columns), the remaining images fill smaller cells around it |
| **Justified** | Images fill each row edge-to-edge at a fixed row height, stretching to maintain aspect ratio — similar to Flickr's layout |

A **live preview** updates as you change settings so you can see the layout before saving.

### Grid and Masonry settings

When using Grid or Masonry, you can also set:

- **Columns** — how many columns across (2, 3, 4, or 5)
- **Gap** — the space between images in pixels (0–64)
- **Aspect ratio** — shape of each image cell: 1:1 (square), 4:3, 16:9, or Auto (preserves original proportions)

### Display settings (all layouts)

- **Show captions** — toggle whether image captions appear on the storefront
- **Enable lightbox** — when on, customers can click any image to view it full-size in an overlay; keyboard navigation (arrow keys, Escape) works in the lightbox

> **Photo:** Gallery settings tab — layout selector, columns/gap/aspect ratio options, and the live layout preview side by side.

> **Photo:** Side-by-side examples of the five layout types on a storefront.

---

## Using a Gallery in Your Storefront

Galleries are not published to a standalone page — they appear on your storefront by being linked to a **template content field**. If your template includes a gallery-type field (for example, a homepage gallery section), you will see a gallery selector in the **Template Fields** editor under **Storefront > Content**.

To use a gallery:

1. Create and populate the gallery in **Galleries**
2. Go to **Storefront > Content > Template Fields**
3. Find the field that accepts a gallery (e.g., "Homepage Gallery")
4. Select your gallery from the dropdown
5. Save — the gallery appears live on your storefront immediately

If your current template does not define any gallery-type fields, you will not see a gallery selector in the template fields editor. Galleries can still be created and saved for later use.

> **Photo:** Template fields editor showing a gallery-type field with the gallery selector dropdown open.

---

## Managing Your Galleries

The main **Galleries** page shows all your galleries as cards with a preview of the first few images and the total image count.

From here you can:

- **Edit** a gallery — opens the gallery editor to update images, layout, or settings
- **Delete** a gallery — permanently removes the gallery and all its images; this cannot be undone

> **⚠️ Note:** If a deleted gallery was linked to a template field, that field will show no gallery until you assign a replacement. Customers will see an empty section on the storefront in the meantime.

> **Photo:** Galleries list page showing gallery cards with image previews and image counts.

---

## What You Cannot Do

- **Change a gallery's slug** after it has been created — slugs are set once and locked
- **Embed a gallery in a page or blog post** via the rich text editor — galleries are only available through template fields, not inline in text content
- **Use a gallery in a template** that does not define a `gallery`-type field — if your template does not support it, the option will not appear
- **Upload images larger than 5 MB** — files above this limit will be rejected at upload
- **Recover deleted images or galleries** — deletion is permanent with no trash or undo

---

## Feature Flag

Galleries are **on by default** and can be toggled by you in **Settings > Features**. Disabling the feature hides the Galleries section from your admin sidebar and removes any gallery content from your storefront. Your gallery data is preserved — re-enabling the feature restores everything.
