# Email Previews

The Email Previews page lets you see exactly how your transactional emails will look before they reach your customers. You can find it in the admin sidebar under **Emails**.

---

## What Are Transactional Emails?

Transactional emails are automated messages sent to customers (and to you) when something happens — an order is placed, a shipment is added, a refund is issued, and so on. These are not marketing emails. They are triggered by specific events and go out automatically without any action on your part.

Your business logo and name appear in every email. If you have a logo uploaded under **Storefront & Branding**, it will be used. If not, the email falls back to displaying your business name as text.

---

## Using the Preview Page

The page is split into two panels:

- **Left — Templates:** a list of buttons, one per email type
- **Right — Preview:** an iframe that renders the selected email

Click any template button to load a live preview in the right panel. The preview renders using real data from your account where possible (your business name, logo, and a recent order if one exists). If no real order is found, sample placeholder data is used instead.

**Photo:** Screenshot of the email preview page — left panel showing template list, right panel showing a rendered email.

---

## Available Email Templates

| Template                          | Sent to           | Triggered when                                         |
| --------------------------------- | ----------------- | ------------------------------------------------------ |
| **Order Confirmation**            | Customer          | Order is created at checkout                           |
| **Order Shipped**                 | Customer          | You add a shipment with tracking info                  |
| **New Order (owner)**             | You (the owner)   | A new order comes in                                   |
| **Order Fulfilled (no tracking)** | Customer          | You mark an order as fulfilled without adding tracking |
| **Order Refunded**                | Customer          | You issue a refund                                     |
| **Welcome Email**                 | Customer          | A customer creates an account                          |
| **Contact Form**                  | You (the owner)   | A visitor submits the contact form                     |
| **Testimonial Invite**            | Customer          | You send a testimonial invite link                     |
| **Verify Email**                  | Customer or owner | An account needs email verification                    |
| **Reset Password**                | Customer or owner | A password reset is requested                          |

> **Note:** There is also an order cancellation email sent to customers when you cancel an order, but it does not currently have a preview on this page.

---

## What You Can and Cannot Do

**You can:**

- Preview any of the 10 email templates listed above
- See how your logo and business name appear in the rendered layout
- Verify the formatting and content of emails before customers receive them

**You cannot:**

- Edit or customize the email templates — they are managed at the platform level and are the same for all businesses
- Send a test email to yourself from this page — it is a visual preview only
- Preview the order cancellation email (not currently available)

> **Known issue:** Clicking **Reset Password** currently does not display a preview. The button triggers the render but the result is not shown. This is a known bug. All other templates preview correctly.

---

## Tips

- **Check your logo first.** If no logo is uploaded, emails will display your business name as plain text. Upload your logo under **Storefront & Branding** before reviewing these previews.
- **Order-based previews use real data.** The order confirmation, new order notification, and refund previews pull from your most recent order. If your store is new and has no orders yet, sample values are used instead.
- **Previews reflect the current state.** If you update your business name or logo, come back here and reload a preview to confirm the change appears correctly.

---

**Photo:** Close-up of the rendered Order Confirmation email showing the logo, order number, line items, and totals.

---
