# Customers

The Customers section gives you a read-only view of everyone who has placed an order or created an account on your storefront. You can search your list, review individual purchase history, and see at a glance how many of your customers have opted into marketing emails.

---

## The Customer List

Navigate to **Customers** in your admin sidebar to see your full customer list.

At the top of the page you'll see two summary cards:

- **Total Customers** — the total number of customer records in your store
- **Accepts Marketing** — how many customers have opted in to receive marketing emails

The table below shows every customer with the following columns:

| Column | What it shows |
|---|---|
| Name | First and last name (if provided) |
| Email | The email address used at checkout or signup |
| Orders | Total number of orders placed |
| Total Spent | Lifetime spend across all orders |
| Marketing | Whether the customer has opted in or out of marketing emails |
| Joined | The date their customer record was first created |

You can search by name or email using the search bar. The table updates to match your query.

**📷 Photo needed:** Customer list showing the summary cards, search bar, and table with several rows — marketing badge variants (opted in vs. opted out) both visible.

---

## Customer Detail

Click **View** on any customer to open their detail page. This page is divided into two sections:

### Order History

A full table of every order this customer has placed, including order status, items, and totals. Clicking an order takes you directly to the order detail page.

### Customer Info

A sidebar card shows:

- **Name** (if they provided one)
- **Email**
- **Phone** (if provided)
- **Marketing preference** — opted in or opted out
- **Total Orders** and **Total Spent** summary

**📷 Photo needed:** Customer detail page showing the order history table on the left and the customer info / summary cards on the right.

---

## How Customers Are Created

You never create customers manually — they are created automatically in two ways:

1. **Guest checkout:** When someone places an order without creating an account, a Customer record is created using their email address. They are not linked to a user account yet.
2. **Account signup:** When a shopper creates an account on your storefront and verifies their email, they are linked to their Customer record. If they had placed orders as a guest with the same email address, those orders are automatically linked to their account — no action needed from you.

---

## What Customers See on the Storefront

Your customers have their own account area on your storefront at `/account`. From there they can:

- **View order history** — a list of all their past orders with status and tracking details
- **View order details** — individual order pages showing items, shipment tracking, and shipping address
- **Manage their address book** — add, edit, delete, and set a default shipping address
- **Update account settings** — change their display name, email, and password
- **Update security settings** — manage their login credentials and connected accounts
- **Set marketing preferences** — opt in or out of marketing emails

> **Note:** Customers must be signed in to access their account area. Pages redirect to sign-in if a session is not active.

---

## Marketing Opt-In

The **Accepts Marketing** flag is set by the customer — either during checkout or from their account preferences page. You can see the status for every customer but **you cannot override it**. Customers control their own preference.

---

## What You Cannot Do

- **Edit customer profiles** — name, email, phone, and shipping addresses are read-only in the admin
- **Delete customers** — customer records cannot be removed from the admin
- **Message customers directly** — there is no built-in messaging or bulk email tool in the admin; the marketing opt-in status is informational only
- **Merge duplicate customer records** — if the same person checks out as a guest multiple times with different emails, those records remain separate

---

## Feature Flag

The `customerAccounts` feature is **on by default** and is not owner-toggleable. Contact platform support if you have questions about this feature.
