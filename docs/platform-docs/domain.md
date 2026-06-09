# Custom Domain

Your store comes with a permanent subdomain right out of the box — something like `yourstore.simplepress.co`. That URL works immediately and never goes away. But if you have your own domain name (like `myshop.com`), you can connect it so customers visit your brand instead.

---

## Your Default Subdomain

The moment your store is created, you're assigned a subdomain based on your business name. This is your permanent store address and **cannot be changed** — it is locked at signup.

> **Example:** `yourstore.simplepress.co`

Your subdomain will always work, even after a custom domain is active. Think of it as a reliable fallback.

---

## Adding a Custom Domain

> **Photo needed:** Domain Settings page showing the "Add Custom Domain" form (before a domain has been entered).

To connect your own domain:

1. Go to **Settings → Domain** in your admin dashboard
2. Enter your domain name in the field — just the domain itself, no `https://` or `www`
   - **Example:** `myshop.com`
3. Click **Add Custom Domain**

Once submitted, your domain is saved with a **Pending DNS** status. At this point, two things happen automatically:

- The platform team receives a notification and manually adds your domain to the server infrastructure (Coolify). **You don't need to do anything to trigger this — it happens behind the scenes.**
- You'll see the DNS instructions you need to configure on your end (see below)

> **Note:** There is a short window between when you add your domain and when it's live on the server. The platform team handles this manually after receiving the notification. If you've configured your DNS correctly and verification is still failing after 24–48 hours, reach out to support.

---

## Configuring Your DNS

After adding your domain, you'll see DNS configuration instructions in the admin. You need to add two **A records** at your domain registrar (wherever you bought your domain — Namecheap, GoDaddy, Cloudflare, Squarespace Domains, etc.):

| Type | Name | Value              |
| ---- | ---- | ------------------ |
| A    | @    | _(shown in admin)_ |
| A    | www  | _(shown in admin)_ |

Both records should point to the same IP address shown in your admin panel. Each record has a copy button next to the value so you can paste it directly into your registrar.

> **Photo needed:** Domain Settings page in the "Pending DNS" state, showing the DNS instructions card with the A record values, copy buttons, and the "Verify DNS" button.

**DNS changes can take anywhere from a few minutes to 48 hours to propagate.** This is controlled by your domain registrar, not by SimplePress.

---

## Verifying Your Domain

Once you've added the DNS records, come back to **Settings → Domain** and click **Verify DNS**.

The platform will automatically check whether your domain is pointing to the correct server. If everything looks good, your domain status will update to **Active**.

If verification fails, double-check:

- Both A records (`@` and `www`) are saved at your registrar
- You're pointing to the exact IP address shown in your admin
- Enough time has passed for DNS to propagate (try again after a few hours)

---

## Domain Statuses

| Status             | What it means                                                |
| ------------------ | ------------------------------------------------------------ |
| **Not Configured** | No custom domain has been added yet                          |
| **Pending DNS**    | Domain saved — waiting for DNS to be configured and verified |
| **Active**         | Domain is verified and live                                  |

> **Photo needed:** Domain Settings page showing an Active domain with the green "Active" badge.

---

## Removing a Custom Domain

You can remove your custom domain at any time from **Settings → Domain**. The Remove Domain button appears whenever a domain is configured — both while it's pending DNS setup and after it's active.

> **Photo needed:** Domain Settings page showing the "Remove Domain" button next to the Verify DNS button (Pending DNS state) and below the active confirmation (Active state).

Clicking **Remove Domain** shows a confirmation dialog. After confirming:

- Your custom domain is immediately cleared from your store
- Your store falls back to its permanent subdomain (`yourstore.simplepress.co`) right away — there is no downtime on the subdomain
- The platform team receives a notification to remove the domain from the server so it can be reclaimed

You can add a new custom domain at any time after removing one.

> **If you're removing a domain to switch to a different one**, remove the current domain first, then add the new one. This notifies the platform team for both operations.

---

## What You Can and Cannot Do

**You can:**

- Add one custom domain to your store
- Verify it yourself once DNS is configured
- Remove your custom domain and fall back to your subdomain at any time
- Add a new custom domain after removing one
- Continue using your subdomain at any time, even after a custom domain is active

**You cannot:**

- Change your subdomain (it's permanent)
- Use a domain that's already registered to another store on the platform
- Add more than one custom domain
- Skip the DNS configuration step — the domain must point to the correct server to be verified

---

## Frequently Asked Questions

**Do I need to buy a domain through SimplePress?**
No. Purchase your domain from any registrar you prefer. SimplePress only needs you to point it at our server via DNS records.

**Will my old subdomain stop working?**
No — your `yourstore.simplepress.co` subdomain always remains active. It's a permanent fallback.

**How long does setup take?**
After adding your domain, the platform team is notified and adds it to the server. Then you configure DNS. Total time varies, but most stores are live within a few hours to a day once DNS propagates.

**What if my domain is already in use?**
If another SimplePress store has already claimed your domain, you'll see an error when you try to add it. In that case, reach out to support.

**What happens to my store when I remove a custom domain?**
Your store switches back to its subdomain immediately. There is no gap in availability — customers can still reach your store at `yourstore.simplepress.co` right away. The platform team is notified to remove the old domain from the server in the background.

**Can I reuse a domain I previously removed?**
Yes. After removing a domain and adding it back, it goes through the same Pending DNS → Active flow again.
