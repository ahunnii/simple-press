# Tax

> **Important:** SimplePress is not a tax advisor, accountant, or attorney. Nothing on this page — or anywhere else in the platform — is legal or tax advice. Sales tax law is complex, varies by state, and changes frequently. **Consult a qualified tax professional for guidance specific to your business** before making any decisions about collection, registration, or filing.

---

## Overview

SimplePress integrates with **Stripe Tax** to automatically calculate and add the correct sales tax to customer orders at checkout. Once you connect your Stripe account and configure your tax registrations in Stripe, you can enable automatic collection with a single toggle — no code changes required.

This page covers:

- What sales tax nexus is and why it matters for online sellers
- How and where to enable automatic tax collection
- What Stripe Tax does (and what it doesn't do)
- The INFORM Consumers Act and your compliance indicator
- Helpful external resources

---

## Understanding Sales Tax Nexus

"Nexus" is the legal term for a connection to a state that creates an obligation to collect and remit sales tax. There are two kinds:

- **Physical nexus** — you have a physical presence in the state, such as an office, warehouse, or employees.
- **Economic nexus** — you exceed a certain volume of sales or transactions into a state, even without any physical presence.

The 2018 Supreme Court decision in _South Dakota v. Wayfair, Inc._ established that states can require remote sellers to collect sales tax based on economic activity alone. Since then, nearly every state with a sales tax has enacted economic nexus laws.

**Most states use a threshold of $100,000 in sales or 200 transactions per calendar year**, but the specifics vary — and change. A few examples:

| State                      | Threshold                                |
| -------------------------- | ---------------------------------------- |
| New York                   | $500,000 in sales AND 100+ transactions  |
| California, Texas, Florida | $500,000 in sales (no transaction count) |
| Most other states          | $100,000 in sales OR 200 transactions    |

Because these thresholds shift, always verify the current rules using the resources at the bottom of this page rather than relying on any static reference, including this one.

> **When should you register?** As a general rule, register for a sales tax permit in a state before (or as soon as) you cross that state's threshold. A tax professional can help you assess your current exposure and determine when and where you need to register.

---

## Enabling Automatic Tax Collection

Automatic tax collection is handled through Stripe Tax. Here's what the setup looks like at a high level:

### Step 1 — Set up Stripe Tax on your Stripe account

Before enabling the toggle in SimplePress, your Stripe account must be fully configured for Stripe Tax. This means:

1. **Add your business address** in the Stripe Tax Dashboard (Stripe uses this to determine your home-state nexus).
2. **Add at least one active tax registration.** Go to [Stripe Tax → Registrations](https://dashboard.stripe.com/tax/registrations) and add each state where you have nexus. You'll need the sales tax permit number for each state.
3. **Verify each registration shows "Active" status.** Pending or incomplete registrations do not trigger tax collection.

> You only need to register the states where you have nexus — Stripe Tax will only collect tax from customers in states where you have an active registration. Customers in all other states will not be charged tax.

**📸 Photo:** Screenshot of the Stripe Tax Registrations dashboard showing Active registrations.

### Step 2 — Enable the toggle in SimplePress

Once your Stripe Tax account is fully configured:

1. Go to **Settings → Integrations** in your admin.
2. Under your connected Stripe account, find the **Automatic Tax Collection** toggle.
3. Turn it on.

SimplePress will verify with Stripe that your Tax setup is active before saving. If your Stripe Tax configuration is incomplete, you'll see an error message explaining what's missing — the toggle will not save until the issue is resolved.

**📸 Photo:** Screenshot of Settings → Integrations with the Automatic Tax Collection toggle visible.

### Step 3 — Test a checkout

After enabling, place a test order from an address in one of your registered states. Stripe Tax will calculate and add the appropriate tax at checkout automatically.

---

## What Stripe Tax Does (and Doesn't Do)

**Stripe Tax handles:**

- Calculating the correct tax rate for each checkout based on the customer's shipping address and your active registrations
- Adding tax to the order total at checkout
- Tracking collected tax by state in the Stripe Tax Dashboard

**Stripe Tax does NOT handle:**

- Filing your periodic sales tax returns with each state
- Remitting collected tax to the states on your behalf

You are responsible for filing returns and sending collected taxes to the appropriate states on the required schedule. Consider using an automated filing service such as **TaxJar AutoFile** or **Avalara Returns** to manage this. A tax professional can also help you understand your filing obligations.

> **Critical:** Enabling automatic tax without any active Stripe Tax registrations will cause checkout sessions to fail. Always add at least one registration in Stripe before turning on the toggle.

---

## Adding Registrations as Your Business Grows

When your sales into a new state approach that state's nexus threshold, here's the general process:

1. **Monitor your sales by state.** Use the Stripe Tax Dashboard or a third-party nexus tracker to see where you're approaching thresholds.
2. **Register for a sales tax permit** in that state through their Department of Revenue portal.
3. **Add the registration to Stripe Tax.** Go to [Stripe Tax → Registrations](https://dashboard.stripe.com/tax/registrations), click _Add a registration_, select the state, and enter your permit number.
4. **No changes needed in SimplePress.** Stripe begins collecting tax from that state's customers automatically once the registration is active.

---

## The INFORM Consumers Act

The INFORM Consumers Act (effective June 2023) requires online marketplaces to verify the identity of "high-volume third-party sellers" — defined as sellers who complete **200+ transactions** or generate **$5,000+ in gross revenue** on the platform in a calendar year.

When your store approaches these thresholds, your **Payments page** will show a compliance alert. Completing Stripe's KYB/KYC identity and business verification (`details_submitted = true` on your Stripe account) satisfies the INFORM Act's verification requirement. If you went through the full Stripe onboarding, you are likely already compliant.

**📸 Photo:** Screenshot of the Payments page showing the INFORM Act compliance indicator.

> Stripe Connect requires all connected accounts to submit business details during onboarding. The SimplePress Payments page will show a green indicator once your Stripe account has completed this process.

---

## Can and Can't

**You can:**

- Enable or disable automatic tax collection from Settings → Integrations (Stripe must be connected)
- Add, modify, or remove tax registrations directly in the Stripe Tax Dashboard at any time
- View the INFORM Act compliance status on your Payments page

**You cannot:**

- Enable automatic tax collection without a connected Stripe account
- Enable automatic tax collection if Stripe Tax is not fully configured on your Stripe account (the platform checks this automatically before saving)
- Use SimplePress to file tax returns or remit taxes to states — this must be done outside the platform

---

## External Resources

These are authoritative third-party references for sales tax law and compliance. SimplePress has no affiliation with these services.

- [Stripe Tax Documentation](https://stripe.com/docs/tax) — Official docs for setting up Stripe Tax
- [Stripe Tax Registrations Dashboard](https://dashboard.stripe.com/tax/registrations) — Manage your state tax registrations in Stripe
- [TaxJar: Economic Nexus Guide](https://www.taxjar.com/sales-tax/economic-nexus/) — State-by-state thresholds, regularly updated
- [Avalara: State Sales Tax Rates](https://www.avalara.com/taxrates/en/state-rates.html) — Current rates by state
- [IRS: Online Sellers](https://www.irs.gov/businesses/small-businesses-self-employed/online-sellers) — Federal tax guidance for online sellers
- [FTC: INFORM Consumers Act](https://www.ftc.gov/business-guidance/blog/2023/06/inform-act) — FTC guidance on INFORM Act requirements

---

_Again: this page is for informational purposes only. It is not legal or tax advice. Consult a qualified tax professional for guidance specific to your situation._

---
