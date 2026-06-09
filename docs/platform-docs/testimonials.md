# Testimonials

Testimonials let you collect and display customer quotes on your storefront. There are two ways to get them: you can add them yourself from any source, or invite customers to submit their own. Both types appear on your `/testimonials` page and in a random selection on your homepage.

> **Feature flag:** Testimonials is on by default and owner-toggleable. Disabling it removes the Testimonials section from your admin nav and hides the `/testimonials` page from your storefront.

---

## Admin Overview

Go to **Content > Testimonials** in the admin sidebar to manage everything.

The page has two main tabs:

- **Testimonials** — all testimonials, filterable by source (All / Customer Submitted / Owner Added)
- **Invites** — all invite emails you've sent, filterable by status (All / Completed / Pending / Expired)

**Photo:** Screenshot of the Testimonials admin page showing both tabs and the source filter sub-tabs.

Each testimonial card shows:

- Source badge — **Owner Added** or **Customer Submitted**
- Visibility badge — **Published** (green) or **Hidden** (gray)
- The testimonial text
- Customer name and email (if available)
- Date — for owner-added entries, the recorded date; for customer-submitted entries, the relative time since submission

---

## Adding a Testimonial Yourself

If you have a quote from a customer (email, DM, in-person) that you want to add manually, use **Add Testimonial** in the top right.

**Photo:** Screenshot of the Add Testimonial dialog.

**Fields:**

| Field               | Required | Notes                                           |
| ------------------- | -------- | ----------------------------------------------- |
| Customer Name       | Yes      | Displayed publicly on the storefront            |
| Email               | No       | For your reference only; not shown to customers |
| Testimonial         | Yes      | The quote text                                  |
| Photos              | No       | Upload up to 5 images (optional)                |
| Publish Immediately | —        | Toggle on or off; defaults to published         |

Owner-added testimonials go live immediately when published. You can edit or hide them at any time.

> You can only edit testimonials that you created. Customer-submitted testimonials cannot be edited.

---

## Inviting Customers to Submit

Sending an invite delivers a one-time personalized link to a customer's inbox. They click it, write their testimonial, and it goes live automatically — no account required.

Click **Send Invite** in the top right.

**Photo:** Screenshot of the Send Invite dialog.

**Fields:**

| Field           | Notes                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Select Customer | Optional. Pick from your existing customers to pre-fill the email field.                                    |
| Email           | Required. The invite is sent here. If this email isn't in your customer list, one is created automatically. |
| Max Photos      | Set how many photos this customer can add (0–5). Defaults to 3.                                             |

Invite links expire after **30 days** and can only be used **once**. Once submitted, the code is marked as used and cannot be reused.

---

## The Customer Submission Experience

Customers can submit a testimonial in two ways:

### Via Invite Link

When a customer receives an invite, they click "Share Your Experience" in the email. The link opens a form on your storefront where they enter:

- Their name
- Their testimonial (10–1,000 characters)
- Up to the number of photos you allowed when sending the invite
- A captcha verification

No account is needed. The testimonial goes live on your site immediately after they submit.

### Without an Invite (Direct Submission)

If you want customers to be able to submit without a personal invite, they can visit `/testimonials/submit` directly. This path requires them to be signed in to a customer account.

- The testimonial uses the name on their account
- They can include up to 5 photos
- Captcha verification is required
- Submission goes live immediately

**One submission per customer:** A customer (identified by email) can only submit one testimonial per store. If they try to submit again, they'll see a message that they've already submitted.

---

## Managing Testimonials

Each testimonial has a dropdown menu (three-dot icon) with the following actions:

| Action         | Owner Added          | Customer Submitted   |
| -------------- | -------------------- | -------------------- |
| Edit           | Yes                  | No                   |
| Manage Images  | Only if photos exist | Only if photos exist |
| Publish / Hide | Yes                  | Yes                  |
| Delete         | Yes                  | Yes                  |

### Hiding vs. Deleting

- **Hide** — removes the testimonial from your storefront but keeps it in your admin. You can un-hide it later.
- **Delete** — permanently removes the testimonial. This cannot be undone.

### Managing Images

If a testimonial has photos, you'll see a **Manage Images** option in the dropdown. This opens a dialog where you can remove individual photos from the testimonial. Changes apply to the live storefront when you save.

**Photo:** Screenshot of the Manage Images dialog showing photo thumbnails with remove buttons.

---

## Invite Tracking

The **Invites** tab shows all invites you've sent, each with a status:

| Status    | Meaning                                               |
| --------- | ----------------------------------------------------- |
| Pending   | Sent and not yet used; still within the 30-day window |
| Completed | The customer submitted a testimonial using this link  |
| Expired   | 30 days passed without the customer submitting        |

Each invite card shows the email address, send date, expiry date, max photos allowed, and (if completed) the date it was used.

Expired invites are not automatically removed. If you want to give a customer another chance, you can send them a fresh invite.

**Photo:** Screenshot of the Invites tab showing pending, completed, and expired invite cards.

---

## Storefront Display

Published testimonials appear in two places:

- **`/testimonials`** — the full testimonials page, styled by your template
- **Homepage** — a random selection of published testimonials is shown in your homepage's testimonials section (exact layout depends on your template)

Testimonials are sorted by date on the `/testimonials` page, newest first.

---

## Cannot

- Edit customer-submitted testimonials (text, name, or date are locked after submission)
- Let a customer update or delete their own testimonial after submitting
- Reuse an invite code after it's been submitted — send a new invite instead
- Approve or moderate testimonials before they go live — both owner-added and customer-submitted testimonials publish immediately (you can hide them after the fact)
- Bulk-hide or bulk-delete testimonials (visibility and deletion are per-testimonial)
- Set a photo allowance higher than 5 on any invite

---
