# Blog

The blog lets you publish articles, news, announcements, or any long-form content directly on your storefront. Each post gets its own page, and all published posts appear on a dedicated listing page at `/blog`.

> **This feature is off by default.** Enable it in **Settings > Features** before it will appear in your admin or on your storefront.

---

## Getting to Blog

In the admin sidebar, go to **Content > Blog**. This opens your list of all blog posts with their title, slug, publish status, and last-updated date.

**[Photo: Blog post list view — table with title, slug, status badges (Published/Draft), updated date, and action dropdown]**

Use the search bar at the top to filter posts by title or slug.

---

## Creating a Blog Post

Click **Create Blog Post** (top right of the list). The editor has two tabs: **Content** and **SEO**.

### Content Tab

| Field              | What it's for                                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**          | The post's headline — shown on the listing and post pages                                                                                                                                          |
| **Slug**           | The URL for this post: `yourstore.com/blog/[slug]`. Auto-generated from the title when creating a new post; you can edit it manually. Must be unique across all posts and pages for your business. |
| **Excerpt**        | A short summary of the post — shown in listing cards and used as the fallback meta description if no SEO description is set                                                                        |
| **Featured Image** | The primary image for this post — shown in the listing card and at the top of the post page                                                                                                        |
| **Content**        | The full post body, written in the rich text editor (TipTap). Supports headings, bold/italic, links, lists, block quotes, and images.                                                              |

**[Photo: Blog post editor — Content tab showing title, slug, excerpt, image upload, and TipTap editor open]**

#### Embedding a Gallery in Post Content

If you have the **Galleries** feature enabled, you can insert a gallery directly into your post body using the TipTap toolbar. This is separate from the featured image and lets you display a full image gallery inline within the post.

### SEO Tab

| Field                | Notes                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Meta Title**       | Shown in browser tabs and search results. Aim for under 60 characters. Falls back to the post title if left blank.     |
| **Meta Description** | Shown as the preview snippet in search results. Aim for under 160 characters. Falls back to the excerpt if left blank. |

**[Photo: Blog post editor — SEO tab showing meta title and meta description fields with character counts]**

### Publish Toggle

The **Published** toggle (top right of the editor toolbar) controls whether the post is visible on your storefront.

- **Off (Draft):** the post is invisible to customers — it doesn't appear in the blog listing and cannot be accessed directly by URL
- **On (Published):** the post is live and publicly visible

Toggle it on when the post is ready. You can switch it back off at any time to hide the post without deleting it.

---

## Editing a Blog Post

From the blog list, click a post title (or use the dropdown > **Edit**) to open the editor. All the same fields are available. Click **Save changes** when done.

The toolbar shows an **Unsaved Changes** badge whenever you have edits that haven't been saved yet.

**[Photo: Blog post editor toolbar — showing "Unsaved Changes" badge, Published toggle, Reset and Save buttons]**

---

## Viewing a Live Post

From the blog list, open the dropdown menu (⋮) on any published post and click **View Live**. This opens the post on your storefront in a new tab.

---

## Deleting a Blog Post

From the blog list, open the dropdown menu (⋮) and click **Delete**. You'll be asked to confirm before the post is permanently removed. This action cannot be undone.

You can also delete from within the editor itself.

---

## How Posts Appear on the Storefront

- **Listing page:** `/blog` — shows all published posts as cards, typically with the featured image, title, and excerpt. Ordered newest first.
- **Individual post:** `/blog/[slug]` — full post content, featured image, and optionally related posts depending on your template.

The exact visual design adapts to your active storefront template.

**[Photo: Storefront blog listing page — cards with images, titles, and excerpts]**

**[Photo: Storefront individual blog post — hero image, title, full content rendered]**

---

## What You Can and Cannot Do

**You can:**

- Create, edit, publish, unpublish, and delete posts at any time
- Manually edit the slug on any post (including existing ones)
- Set SEO metadata per post independently of the global site SEO
- Embed galleries in post content (if Galleries is enabled)
- Search and filter posts in the admin list

**You cannot:**

- Schedule a post to publish at a future date — the Published toggle takes effect immediately when you save
- Use the same slug on two posts or pages for your business
- Reorder posts manually — posts always display newest first on the storefront

---

## Feature Flag

Blog is **off by default**. To turn it on: go to **Settings > Features** and enable **Blog**. Disabling it removes the blog from your admin nav and hides all blog pages from the storefront (posts are not deleted).

---
