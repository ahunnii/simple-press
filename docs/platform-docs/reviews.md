# Product Reviews

Product Reviews let customers leave star ratings and written feedback on your products. You moderate every customer submission before it goes live, and you can also add reviews yourself — useful for seeding a new store or adding quotes from customers who reached out directly.

> **Feature flag:** Product Reviews is off by default and **not owner-toggleable**. It must be enabled by the platform team. Once enabled, it requires both **Products** and **Customer Accounts** to be active. To request activation, contact support.

---

## Admin Overview

Go to **Reviews** in the admin sidebar once the feature is enabled.

**Photo:** Screenshot of the Reviews admin page showing the four tabs (Pending, Published, Hidden, All) and the source filter.

The page is organized into four tabs:

| Tab | What it shows |
| --- | ------------- |
| **Pending** | Customer-submitted reviews waiting for your approval (badge shows count) |
| **Published** | Approved reviews visible on your storefront |
| **Hidden** | Reviews you've hidden — kept in the system but not displayed publicly |
| **All** | Every review regardless of status |

Each tab can be filtered further by **source**: All / Customer / Owner Added.

### What Each Review Card Shows

- Star rating (1–5)
- Source badge — **Customer** or **Owner Added**
- **Verified Purchase** badge — shown when the reviewer's order is confirmed
- Status badge — Pending / Published / Hidden
- Product name
- Review headline (if provided)
- Review text (clamped to 3 lines)
- Thumbnail images (if any)
- Reviewer name, email, and title
- Date — formatted date for owner-added reviews; relative time for customer reviews

---

## Approving Customer Reviews

Customer-submitted reviews are **not published automatically**. They land in the **Pending** tab and stay there until you take action.

To approve a review, open its dropdown menu (three-dot icon) and click **Approve**. The review immediately appears on your storefront and its rating is counted toward the product's average.

You can reverse this at any time — the same menu will show **Unapprove** once a review is published.

> All decisions are per-review. There is no bulk approve option.

---

## Adding a Review Yourself

Use the **Add Review** button in the top right to add a review under any customer's name. This is useful for adding quotes from customers who emailed you directly, or for seeding initial reviews on a new product.

**Photo:** Screenshot of the Add Review dialog.

**Fields:**

| Field | Required | Notes |
| ----- | -------- | ----- |
| Product | Yes | Which product this review is for |
| Reviewer Name | Yes | Shown publicly on the storefront |
| Email | No | For your reference only; not shown to customers |
| Reviewer Title | No | Displayed under the name, e.g. "Verified Buyer" or "Professional Chef" |
| Review Date | No | Defaults to today; can be backdated |
| Rating | Yes | 1–5 stars |
| Review Headline | No | Short title for the review |
| Review Text | Yes | The full review body |
| Verified Purchase | No | Toggle on to show the Verified Purchase badge |
| Publish Immediately | — | Defaults to on; turn off to save as pending |

Owner-added reviews default to published. You can edit or delete them at any time.

---

## Managing Reviews

Each review has a dropdown menu with the following actions, depending on its source and status:

| Action | Customer Review | Owner-Added Review |
| ------ | --------------- | ------------------ |
| Approve / Unapprove | Yes | Yes |
| Hide / Unhide | Yes | Yes |
| Edit | No | Yes |
| Delete | Yes | Yes |

### Hiding vs. Deleting

- **Hide** — removes the review from public display but keeps it in your admin. The rating is excluded from your product's average while hidden. You can un-hide it later.
- **Delete** — permanently removes the review and recalculates the product's rating. Cannot be undone.

A confirmation dialog is shown before deletion.

### Editing Owner-Added Reviews

If you need to correct a review you added yourself, open its dropdown and click **Edit**. All fields can be changed except the product the review is linked to.

Customer-submitted reviews cannot be edited — only approved, hidden, or deleted.

---

## The Customer Submission Experience

Customers can submit a review from any product page by clicking **Write a Review**. They must be **signed in** to a customer account.

**Photo:** Screenshot of the Write a Review dialog on a product page.

**Fields customers fill out:**

| Field | Required | Limits |
| ----- | -------- | ------ |
| Rating | Yes | 1–5 stars |
| Review Title | Yes | Max 200 characters |
| Review Text | Yes | Min 10 characters, max 2,000 characters |
| Photos | No | Up to 5 images |
| Video URL | No | Optional link |

If the customer has a confirmed order for the product, a **Verified Purchase** badge is automatically added to their review.

After submitting, the customer sees a success message. The review goes into your **Pending** tab — it is not published until you approve it.

**One review per product:** A customer (identified by email) can only submit one review per product. Trying to submit a second time shows an error.

---

## Helpful Voting

Each published review shows **thumbs-up / thumbs-down** voting buttons. Customers can vote once per review. Votes adjust the helpful and not-helpful counts shown on each review.

Logged-in customers vote by user account. Visitors vote by IP address (one vote per IP per review).

Votes don't affect whether a review is shown or hidden — they're purely informational, helping other customers find the most useful feedback.

---

## How Ratings Appear on Your Storefront

When reviews are approved, two product-level stats are automatically updated:

- **Average Rating** — the mean of all approved, visible ratings (shown to one decimal place)
- **Review Count** — the total number of approved, visible reviews

These stats are displayed on product cards and product pages across all templates — star badges, rating numbers, and review counts all draw from these values.

> The storefront display of the full review list (individual review cards, sort controls, rating breakdown bars) varies by template. If your template doesn't show the full review list on product pages, reach out to support and we can enable it for your template.

---

## Cannot

- Edit customer-submitted reviews (text, name, title, or date are locked after submission)
- Respond to reviews — there is no reply system
- Publish customer reviews without approving them first
- Approve or moderate reviews in bulk
- Allow customers to update or delete their own reviews after submitting
- Toggle the feature on or off yourself (contact support to enable or disable)
