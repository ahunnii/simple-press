# Payments & Payouts

The Payments page in your admin gives you a real-time snapshot of your store's financial health: your Stripe balance, recent payout history, and your standing under the INFORM Consumers Act. Everything here flows through your connected Stripe account — if Stripe isn't connected yet, most of this page will prompt you to do that first.

> **Before you start:** Stripe must be connected in **Settings → Integrations** before any payment, balance, or payout data appears. See the [Integrations](integrations.md) guide for setup steps.

---

## What's on the Payments Page

The page is organized into three cards:

1. **INFORM Act Compliance** — tracks your annual transaction count and revenue against federal reporting thresholds
2. **Stripe Balance** — your available and pending funds in your connected Stripe account
3. **Recent Payouts** — the last 5 payouts sent to your bank account

**📷 Photo:** Full Payments page showing all three cards — INFORM Act compliance progress bars, the balance card with available/pending amounts, and the recent payouts table.

---

## Stripe Balance

Once your Stripe account is connected, the balance card shows two figures:

| Field | What it means |
| ----- | ------------- |
| **Available to Pay Out** | Funds that are cleared and ready to be sent to your bank |
| **Pending** | Funds from recent transactions still in Stripe's processing window |

Funds move from Pending → Available as Stripe processes them (typically within 2–7 business days, depending on your payout schedule).

> You can always click **View in Stripe →** at the bottom of the balance card to open your Stripe Dashboard for a more detailed breakdown.

**📷 Photo:** Stripe Balance card showing Available and Pending amounts.

### Balance not showing?

If you see a "Balance data temporarily unavailable" message, this is a temporary issue communicating with Stripe — your funds are not affected. Refresh the page to try again.

---

## Recent Payouts

The Recent Payouts card lists the last 5 payouts Stripe has sent to your bank account. Each row shows:

- **Amount** — the payout total
- **Status** — one of the following:

| Status | Meaning |
| ------ | ------- |
| Paid | Successfully deposited to your bank |
| In Transit | Sent to your bank, not yet settled |
| Pending | Queued but not yet initiated |
| Failed | The payout did not complete |
| Canceled | The payout was cancelled before it left Stripe |

- **Estimated Arrival** — the date Stripe expects the funds to land in your bank

**📷 Photo:** Recent Payouts table with at least one row showing Amount, Status badge, and Estimated Arrival date.

### Payout schedule

Your payout timing is controlled by Stripe — typically daily, weekly, or monthly depending on your account type. You cannot change your payout schedule from within SimplePress. To adjust it, go to your [Stripe Dashboard → Settings → Payouts](https://dashboard.stripe.com/settings/payouts).

---

## INFORM Act Compliance

The INFORM Consumers Act is a federal law that requires online marketplaces to collect and verify identifying information from high-volume third-party sellers. SimplePress monitors your store automatically and surfaces warnings here before any action is required on your part.

### The thresholds

You are subject to verification requirements if, in the **current calendar year**, your store reaches either:

- **200+ transactions** (paid orders, excluding refunded/cancelled), or
- **$5,000+ in annual revenue** (paid orders, excluding refunded/cancelled)

Both figures reset on January 1 each year.

### What the compliance card shows

The card displays two progress bars — one for transactions, one for revenue — showing how close you are to each threshold. The card's status badge will be one of:

| Badge | Meaning |
| ----- | ------- |
| **Below Thresholds** | You haven't reached either limit yet |
| **Verified** | You've crossed a threshold and completed Stripe verification |
| **Action Required** | You've crossed a threshold but haven't completed verification |

**📷 Photo:** INFORM Act Compliance card in three states: below threshold (green progress bars), approaching threshold (amber warning alert at top of page), and action required (red badge + destructive alert).

### Early warning

Once you hit **75% of either threshold**, a yellow warning banner appears at the top of the Payments page — even before any action is legally required. This gives you time to complete Stripe's identity verification before you're required to.

**📷 Photo:** Amber "Approaching INFORM Act Threshold" alert banner with the "Start Verification" button visible.

### How to satisfy the requirement

Completing Stripe's built-in KYC (Know Your Customer) verification satisfies the INFORM Act requirement automatically. When Stripe marks your account as `details_submitted`, the Payments page reflects this immediately and shows a **Verified** badge.

To complete verification:

1. Click **Start Verification** (in the warning banner) or **Complete Verification** (in the action-required alert).
2. You'll be taken to your Stripe Dashboard's identity verification page.
3. Follow Stripe's prompts to submit your information.
4. Once Stripe confirms, return to your SimplePress Payments page — the badge will update to Verified.

> **Note:** Most sellers who set up Stripe Connect for the first time will already complete this step as part of Stripe's onboarding. If you did, you're covered — the badge will show Verified once either threshold is reached.

---

## Automatic Tax Collection

Automatic Tax is configured in **Settings → Integrations**, but it directly affects what customers pay at checkout, so it's worth covering here.

When **Automatic Tax Collection** is enabled on your Stripe account, Stripe Tax calculates and adds sales tax to every checkout session based on the customer's shipping address and your registered tax nexus states.

**Requirements before enabling:**

- Stripe must be connected
- You must have at least one active tax registration set up in your [Stripe Tax Dashboard](https://dashboard.stripe.com/tax/registrations) (your business address + registered states)

If you try to enable automatic tax without these registrations in place, you'll get an error — nothing will be saved. See the [Integrations](integrations.md) guide for the toggle location, and **Settings → Tax** for a full guide on sales tax nexus, economic nexus thresholds by state, and how to set up your Stripe Tax registrations.

---

## Connecting and Disconnecting Stripe

Stripe connection is managed in **Settings → Integrations**. See the [Integrations](integrations.md) guide for full details, including:

- How to connect via Stripe OAuth
- What the connected state shows (Account ID, open dashboard link)
- How to disconnect (and what that means for your store)

---

## What You Can Do

- View your available and pending Stripe balance
- See the last 5 payouts (amount, status, estimated arrival)
- Monitor your INFORM Act compliance thresholds in real time
- Start or complete Stripe identity verification from the compliance alerts
- Open your full Stripe Dashboard directly from the balance card

## What You Cannot Do

- View balance or payouts before connecting Stripe
- Process refunds without an active Stripe connection (see [Orders](orders.md))
- Change your payout timing — that is set in your Stripe account settings, not in SimplePress
- Manually initiate a payout — Stripe handles this automatically on your account's schedule
- See more than the last 5 payouts in the admin — open your Stripe Dashboard for full payout history
- See balance broken down by product, order, or time period — Stripe Dashboard is the place for detailed reporting
