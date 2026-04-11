# Your Account & Security

Your SimplePress account is your personal login identity — separate from your store's settings. This is where you manage your name, email address, password, and connected sign-in methods. Think of it as the "you" behind the store, not the store itself.

> **Accessing your account settings:** In the admin dashboard, click your avatar or name in the bottom-left corner of the sidebar, then choose **Account Settings**. On the storefront, account settings are available at `/account/settings` and `/account/security` after signing in.

---

## Your Profile

### Display Name

Your display name is visible in the admin dashboard and in any storefront account pages your customers see. You can update it at any time from Account Settings.

### Email Address

Your email address is your primary login identifier and is used for:

- Signing in
- Receiving transactional and security notifications
- Password reset requests
- Email verification

**Changing your email:** Enter a new email address in the Settings form and save. A verification email is sent to the new address. Your current email remains active until you click the link in the verification email. The change is only applied once you verify the new address.

> If you don't receive the verification email, use the **Resend Verification Email** option that appears in your account settings after a change is pending.

**Note:** Email addresses are unique across the entire SimplePress platform. If the address is already in use by another account, you will not be able to use it.

**Photo:** Screenshot of the email update card in Account Settings, with the "pending verification" state shown.

### Profile Photo

You can upload a profile photo that appears in the admin sidebar. Supported formats include JPEG and PNG. You can remove your photo at any time to revert to your initials avatar.

---

## Password

### Changing Your Password

Go to **Account > Security** and use the **Change Password** form. You will need:

1. Your current password
2. Your new password (entered twice to confirm)

When you save, all other active sessions on other devices are automatically signed out. Your current session stays active.

**Photo:** Screenshot of the Change Password card on the Security page.

### Forgot Your Password?

If you're locked out, go to the sign-in page and click **Forgot password?**. Enter your email address and a reset link will be sent. The link expires after **1 hour**. After resetting, you'll be redirected to sign in with the new password.

**Photo:** Screenshot of the Forgot Password page.

---

## Connected Sign-In Methods

### Discord

You can add Discord as an alternative sign-in method so you don't have to type your password every time. Once connected, you can sign in with either your email/password or your Discord account — both work interchangeably.

**To connect Discord:** Go to **Account > Security**, find the **Connected Accounts** section, and click **Connect** next to Discord. You'll be redirected to Discord to authorize the connection, then returned to your settings.

**To disconnect Discord:** Click **Disconnect** in the same section. You can only disconnect Discord if you still have a password set on your account — you cannot remove all sign-in methods.

**Photo:** Screenshot of the Connected Accounts (Providers) card on the Security page, with Discord shown as connected.

---

## Active Sessions

Under **Account > Security**, the **Active Sessions** section lists every device currently signed in to your account, including:

- Device type and browser
- Approximate location or IP
- When the session was created

Your current session is marked. You can sign out any other session individually — useful if you left yourself signed in on a shared or lost device.

**Signing out everywhere:** Changing your password automatically signs out all other sessions.

**Photo:** Screenshot of the Active Sessions card showing multiple sessions with a "Sign Out" button on each.

---

## What You Can and Cannot Change Here

| Action                          | Available                                                 |
| ------------------------------- | --------------------------------------------------------- |
| Update display name             | Yes                                                       |
| Change email address            | Yes (requires re-verification)                            |
| Upload / remove profile photo   | Yes                                                       |
| Change password                 | Yes                                                       |
| Connect / disconnect Discord    | Yes                                                       |
| View and revoke active sessions | Yes                                                       |
| Change your store subdomain     | No — subdomains cannot be changed after business creation |
| Change your business name       | No — use **Settings > General** in the admin dashboard    |
| Delete your account             | Contact platform support                                  |

---

## Email Verification

SimplePress requires a verified email address before you can access the admin dashboard. When you first sign up, a verification email is sent automatically. The link in that email expires after **1 hour**.

If your email is unverified, you will be blocked from the admin and prompted to verify. You can request a new verification email from the prompt shown at sign-in.

> **Email changes reset verification.** If you update your email address, your account is marked unverified again until you click the link sent to the new address. Admin access is not affected until you navigate away and sign back in — at that point you'll be prompted to verify the new address.

---

## Account Security Tips

- Use a strong, unique password that you don't use on other sites.
- Connect Discord as a backup sign-in method in case you lose access to your email temporarily.
- Periodically check your **Active Sessions** and revoke any sessions you don't recognize.
- If you suspect your account has been compromised, change your password immediately — this signs out all other devices.

---

## Storefront Customer Accounts vs. Your Owner Account

Your admin account is different from the customer accounts that shoppers create on your storefront. Customers manage their own profiles, order history, and preferences at `/account/` on your store. You cannot edit or delete customer accounts from the admin — those are read-only. See the **Customers** section of this documentation for what you can view about customer accounts.
