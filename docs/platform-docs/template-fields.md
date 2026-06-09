# Template Fields (Content Customization)

Template fields are how you fill in your storefront with your own words, images, and media. Think of your template as the design framework — template fields are the content slots inside it. Every headline, hero image, about section, feature callout, and contact detail you see on your storefront comes from a template field you can edit here.

Navigate to **Content → Template Fields** in your admin dashboard to get started.

---

## How It Works

Your storefront template defines a set of named content slots. When you save a value into one of those slots, it shows up immediately on your live storefront. If you haven't filled in a slot yet, the template's built-in placeholder or default text is shown instead — your storefront is never blank.

Fields are organized into **tabs by page** — Homepage, About, Contact, Blog, Products, Collections, Testimonials, Global, and more, depending on your template. The **Global** tab contains site-wide elements like announcement banners or universal contact info.

**[PHOTO: Template fields editor — full view with page tabs (Homepage, About, etc.) across the top and field groups below]**

---

## Field Types

Depending on your template, you'll encounter several types of fields:

| Type          | What It Is                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------- |
| **Text**      | A single line — headlines, labels, taglines                                                        |
| **Textarea**  | A longer block of plain text — paragraphs, descriptions                                            |
| **Rich Text** | Formatted content with bold, italics, links, and lists via the TipTap editor                       |
| **Image**     | A single uploaded image — heroes, section backgrounds, team photos                                 |
| **Video**     | A video URL (e.g. a hosted video link) — used in select templates for background or feature videos |
| **URL**       | A plain link — useful for external references or custom media                                      |
| **Color**     | A color picker — accent colors, button colors, background fills                                    |
| **Number**    | A numeric value — e.g. years in business, item counts                                              |
| **Boolean**   | An on/off toggle — show or hide a section                                                          |
| **Gallery**   | Link one of your saved Galleries to a template section (e.g. a homepage photo grid)                |
| **List**      | A repeating set of rows — e.g. a row of feature cards, each with an icon, title, and description   |

Not every field type appears in every template — you'll only see what your active template supports.

**[PHOTO: Close-up of a rich text field with TipTap editor open (bold, links, lists visible)]**

**[PHOTO: Close-up of a list-type field showing multiple rows with expand/collapse handles and add/remove row controls]**

---

## Fields Are Organized by Page and Group

Within each page tab, fields are grouped into logical sections (e.g. "Hero Section", "About Section", "Values", "Story"). Each group has a title and description to help you understand what part of the page it controls.

**[PHOTO: A single page tab open (e.g. Homepage) showing multiple field groups with their section titles]**

---

## Default Values

Every field has a built-in default. If you clear a field or haven't filled it in yet, the default text or image is shown on your storefront — so your site always looks complete even before you've customized everything.

---

## Switching Templates

If you switch to a different template (via **Content → Branding**), the new template's fields will be shown in the editor. Your previously saved values for the old template are preserved in the database but won't be displayed — they're simply not used by the new template. If you ever switch back, your old values will reappear.

---

## Galleries in Template Fields

Some templates have a `gallery` field type that lets you link a named gallery you've created in **Content → Galleries**. This is how you embed photo grids or carousels into homepage or about sections — you create the gallery separately, then assign it here.

> **Note:** You can only link a gallery to a field if your template defines a gallery-type slot on that page. Galleries cannot be dropped into rich text content.

---

## Saving Your Changes

Changes are not auto-saved. Use the **Save** button at the top of the page to apply your edits. A confirmation toast will appear when your storefront is updated. You can also use the **Reset** button to discard unsaved changes and revert to the last saved state.

---

## What You Can Do

- Edit any field defined by your active template
- Leave fields blank to use the template's default value
- Upload images directly in image-type fields
- Add a video URL in video-type fields (where supported by your template)
- Link galleries to gallery-type fields
- Add, reorder, and remove rows in list-type fields
- Search across all fields using the search bar at the top

---

## What You Cannot Do

- Add custom fields outside what your template defines — the available slots are set by the template
- See or edit fields from a template you're not currently using
- Embed a gallery directly in a rich text editor — galleries are template-field-based only

---

## Something Missing?

We've built templates to make as much of the storefront editable as possible — text, images, videos, colors, toggles, and more. That said, some design elements are fixed in the template and aren't currently exposed as editable fields.

If there's something on your storefront you'd like to change but can't find a field for it, [reach out to us](mailto:support@simplepress.co) and we'll look into it.

---

## Screenshots Needed

- [ ] Full template fields editor with page tabs visible across the top
- [ ] A page tab open (e.g. Homepage) showing multiple field groups
- [ ] Rich text (TipTap) editor open in a richtext field
- [ ] A list-type field showing multiple rows with add/remove controls
- [ ] Image upload field with a preview visible
- [ ] Gallery selector field (dropdown showing saved galleries)
- [ ] The Save / Reset toolbar

---
