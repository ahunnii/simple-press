# Integrations

Connect third-party services to your store from **Settings → Integrations**. This page is split into two sections: Stripe (payments) and Umami (analytics).

---

## Stripe Connect

Stripe is the payment processor powering your storefront. Until you connect a Stripe account, your store cannot accept customer payments, process refunds, or display your balance and payout history.

**📷 Photo:** Integrations page showing the Stripe Connect card with a "Not Connected" badge and the "Connect with Stripe" button.

### Connecting your Stripe account

1. Go to **Settings → Integrations**.
2. In the **Stripe Connect** card, click **Connect with Stripe**.
3. You'll be redirected to Stripe to authorize the connection. Sign in to your existing Stripe account or create a new one.
4. After authorizing, you'll be returned to the Integrations page. The card will update to show a **Connected** badge and your Stripe Account ID.

> Stripe handles the entire authorization handoff securely. Your Stripe credentials are never stored by SimplePress.

**📷 Photo:** Stripe Connect card in the connected state — showing the Account ID field, "Open Dashboard" and "Disconnect" buttons, and the Connected badge.

### Once connected

- Your Stripe Account ID is displayed for reference.
- Payments from customer orders are deposited directly into your Stripe account according to your Stripe payout schedule.
- You can open your Stripe Dashboard at any time using the **Open Dashboard** button.

### Automatic Tax Collection

When your Stripe account is connected, you'll see an **Automatic Tax Collection** toggle. When enabled, Stripe Tax automatically calculates and adds sales tax to every checkout session.

**Before enabling this**, you must have active tax registrations set up on your Stripe account for the states where you collect tax. Enabling the toggle without registrations will return an error — no changes will be saved.

- To manage your tax registrations, visit your Stripe Tax Dashboard (linked from the error message if one appears).
- For a full guide on sales tax, nexus, and how to set up Stripe Tax, see **Settings → Tax**.

**📷 Photo:** Auto Tax toggle section within the Stripe card — showing the label, description, and toggle in the on/off state. Include an example of the error alert if toggled without registrations.

### Disconnecting Stripe

Click **Disconnect** to remove your Stripe account from the store. You'll be asked to confirm before anything is removed.

> **Important:** Disconnecting Stripe immediately disables payment acceptance on your storefront. Existing orders and their history are not affected, but you will not be able to process new refunds until you reconnect.

---

**What you can do:**

- Connect a Stripe account via OAuth
- View your connected Stripe Account ID
- Open your Stripe Dashboard directly from the admin
- Enable or disable Automatic Tax Collection
- Disconnect your Stripe account

**What you cannot do:**

- Accept customer payments before Stripe is connected
- Enable Automatic Tax Collection without active Stripe Tax registrations on your connected account
- Change your payout schedule or timing — that is controlled by Stripe on your account directly
- Process refunds without an active Stripe connection

---

## Umami Analytics

Umami is a privacy-focused, open-source analytics tool that tracks visitor behavior on your storefront without storing personal data or using cookies.

> **Note:** The Umami section only appears if the platform has analytics enabled. If you don't see it, it has not been activated for your account.

**📷 Photo:** Umami Analytics card showing the Website ID input, the Enable Analytics toggle, and the badge indicating whether it's enabled or disabled.

### Setting up Umami

1. If you don't have an Umami account, click **Sign up for Umami** in the card to create one.
2. In your Umami dashboard, add your storefront URL as a website and copy the **Website ID** (a string like `abc123-def456-ghi789`).
3. Paste the Website ID into the **Website ID** field in the Umami card.
4. Toggle **Enable Analytics** on.
5. Click **Save Changes**.

When both the Website ID is filled in and the toggle is on, the card shows an **Enabled** badge. If either is missing, analytics will not be collected even if the toggle is on.

### What Umami tracks

Umami collects page views, referrer sources, browser/device data, and session durations — all without cookies or personally identifiable information. Data is visible in your Umami dashboard, not within the SimplePress admin.

---

**What you can do:**

- Enter your Umami Website ID
- Enable or disable analytics tracking on your storefront
- Access the Umami sign-up page from within the admin

**What you cannot do:**

- View analytics data inside the SimplePress admin — all reporting is in your Umami dashboard
- Use a different analytics provider through this integration (Umami is the only supported option)

<!-- Note that the Umami section is conditionally rendered based on NEXT_PUBLIC_ENABLE_UMAMI — owners might wonder why they don't see it at all. -->
