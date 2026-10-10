/**
 * Guides that are not tied to one platform: hiring help, keeping your domain
 * name, and payments/customers/subscriptions.
 */
import { callout, esc } from "../html";
import { SITE_DETAILS_PATH, SITE_EXPORT_DIRS, type SiteExportFile } from "../types";
import {
  GUIDE_PATHS,
  count,
  fileName,
  folder,
  guideFile,
  h2,
  link,
  ol,
  siteDetailsLink,
  stampCheckedNote,
  ul,
} from "./shared";
import type { SiteExportSummary } from "./types";

export function buildHiringGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.hiring;
  const body =
    `<p>If building a new site yourself sounds like too much, you can hire a web designer or developer. This export is designed so you can hand it to them as it is. They will not need access to SimplePress.</p>` +
    h2("What to send them") +
    `<p>The simplest thing is to send the whole ZIP file you downloaded. It contains:</p>` +
    ul([
      `${folder("START HERE.html")} and ${siteDetailsLink(doc)}: an overview, your business details, hours and links.`,
      `${folder(SITE_EXPORT_DIRS.photos)}: every photo and video from your site.`,
      `${folder(SITE_EXPORT_DIRS.pages)}, ${folder(SITE_EXPORT_DIRS.blog)}, ${folder(SITE_EXPORT_DIRS.products)}, ${folder(SITE_EXPORT_DIRS.services)}, ${folder(SITE_EXPORT_DIRS.events)}, ${folder(SITE_EXPORT_DIRS.galleries)}: readable copies of your content, to copy and paste from.`,
      `${folder(SITE_EXPORT_DIRS.importFiles)}: ready-made product and blog files for WordPress, Shopify, Wix, Squarespace and Square.`,
      `${folder(SITE_EXPORT_DIRS.spreadsheets)}: your data in spreadsheet form.`,
      `${folder(SITE_EXPORT_DIRS.developers)}: the same data in a format developers prefer.`,
      ...(summary.extraFolders ?? []).map(
        (f) =>
          `${folder(f.dir)}: ${esc(f.what)}${
            f.links.length > 0
              ? ` (${f.links.map((l) => link(doc, l.path, l.label)).join(", ")})`
              : ""
          }`,
      ),
    ]) +
    callout(
      `<p><strong>Think before you share customer information.</strong> The ${folder(SITE_EXPORT_DIRS.spreadsheets)} folder holds your customers' names, emails, addresses and orders. If the person you hire only needs to build the website, take that folder out of the ZIP first, or remove the customer and order files. Only share them if the job needs them, and ask the person to delete them when they are done.</p>`,
      "warn",
    ) +
    h2("Also send, if you have them") +
    ul([
      "Your logo as an image file, and your brand colors and fonts if you have chosen them.",
      "Screenshots of your current site, or its address, so they can see what it looks like now. A style guide or site pictures, if someone made them for you.",
      "Examples of other websites you like.",
      "Your web address login details only when they are needed. See the domain guide, and never send passwords by email if you can avoid it.",
    ]) +
    h2("What to tell them") +
    ol([
      "Which platform you want to use, or ask for their advice. The options are explained on the START HERE page.",
      `What you sell or offer (${esc(summaryLine(summary))}).`,
      "What must work on day one, for example taking payments, a contact form, or a booking page.",
      "Your deadline and your budget.",
      `That you want to keep your web address. Point them to ${link(doc, GUIDE_PATHS.domain, "Keeping your domain name")} and ${link(doc, GUIDE_PATHS.payments, "Payments, customers and subscriptions")}.`,
    ]) +
    h2("About the site code") +
    `<p>The code behind SimplePress templates is open source under the AGPL-3.0 license. In plain terms, that means the software is free to use and study, and anyone who changes and runs it must share their changes under the same license. The license texts are in the ${folder(SITE_EXPORT_DIRS.licenses)} folder. A developer can read them. This does not affect your own content, photos or business information, which belong to you.</p>` +
    callout(
      "<p>The photos in a <strong>Template &amp; stock images</strong> folder (inside Photos), if there is one, are not yours. They came with the design. Ask your designer to replace them or confirm the license.</p>",
      "tip",
    ) +
    stampCheckedNote();
  return guideFile(doc, "Hiring a designer or developer", summary, body, "What to hand over, and what to ask for.");
}

function summaryLine(summary: SiteExportSummary): string {
  const c = summary.counts;
  const parts: string[] = [];
  if (c.products > 0) parts.push(count(c.products, "product"));
  if (c.services > 0) parts.push(count(c.services, "service"));
  if (c.events > 0) parts.push(count(c.events, "event"));
  if (c.posts > 0) parts.push(count(c.posts, "blog post"));
  if (c.pages > 0) parts.push(count(c.pages, "page"));
  return parts.length > 0 ? parts.join(", ") : "your pages and content";
}

export function buildDomainGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.domain;
  const { business, hasCustomDomain } = summary;
  let body: string;
  if (hasCustomDomain) {
    const domain = business.customDomain ?? "";
    body =
      `<p>Your site uses your own web address, <strong>${esc(domain)}</strong>. A web address like this is called a <em>domain name</em>. You rent it from a company called a <em>registrar</em> (for example, where you first bought it). <strong>SimplePress does not own your domain, and you do not have to give it up</strong>. You can point it at your new site.</p>` +
      h2("How to move it") +
      ol([
        "Set up your new site first. Do not change anything about your domain until the new site is ready.",
        `Find where your domain is registered. If you do not remember, look up ${esc(domain)} on a lookup tool such as lookup.icann.org. It shows the registrar. Log in there. Check old emails for a receipt if you cannot remember your login.`,
        "In your new platform, look for a setting called something like <strong>Connect a domain</strong> or <strong>Use a domain I already own</strong>. It gives you a list of values to enter, called <em>DNS records</em> (or new <em>nameservers</em>).",
        `At your registrar, open the DNS settings for ${esc(domain)}. Replace the records that point to your old site with the values your new platform gave you. Copy them exactly.`,
        "Save, then wait. The change can take up to 48 hours to reach everyone, though it is often much faster. During that time some visitors may still see your old site.",
        "Once your new site loads at your address, you can close the old one.",
      ]) +
      callout(
        "<p>If you use email addresses on this domain (like you@yourbusiness.com), do not delete or change the <strong>MX records</strong> at your registrar. Those make your email work. Only change the records the new platform asks for.</p>",
        "warn",
      ) +
      callout(
        "<p>Some platforms let you buy or transfer the domain to them instead. That is fine, but you do not have to. Moving the DNS records is enough, and you stay in control.</p>",
        "tip",
      ) +
      h2("Keep it renewed") +
      `<p>Domains are rented by the year. Make sure your registrar has a working payment card and that auto-renew is on, so you do not lose your address.</p>`;
  } else {
    body =
      `<p>Your old address was <strong>${esc(business.siteUrl)}</strong>, a free address that belongs to SimplePress. That kind of address cannot be moved to another platform. Once you close the old site, it will stop working.</p>` +
      h2("Get your own web address") +
      ol([
        "Choose a name that is short, easy to spell, and close to your business name. A <em>domain name</em> looks like yourbusiness.com.",
        "Buy it from a <em>registrar</em>, which is a company that sells domain names, or buy it directly from the platform you are moving to. Most platforms sell domains from their dashboard, which is the easiest route. Expect a yearly fee, and check prices before you pay.",
        "If you buy it from the platform, it connects itself. If you buy it somewhere else, the platform will show you how to connect it, usually by entering a few values in your registrar's DNS settings. It can take up to 48 hours to start working.",
        "Tell your customers about the new address, and update it on your social media pages, business listings and email signature.",
      ]) +
      callout(
        "<p>Keep the old site online until the new address works, and until your customers know where to find you.</p>",
        "tip",
      ) +
      h2("Keep it renewed") +
      `<p>Domains are rented by the year. Turn on auto-renew so you do not lose your address.</p>`;
  }
  body += stampCheckedNote();
  return guideFile(doc, "Keeping your domain name", summary, body, "Your web address can come with you.");
}

export function buildPaymentsGuide(summary: SiteExportSummary): SiteExportFile {
  const doc = GUIDE_PATHS.payments;
  const c = summary.counts;
  const related = summary.spreadsheets.filter((s) =>
    /customer|order|subscri|loyalty|invoice/i.test(s.path),
  );
  let body =
    `<p>This guide explains what happens to your customers, orders and payments when you move your site. Read it before you close your old site.</p>` +
    h2("Where your payments live") +
    (summary.hasStripe
      ? `<p>When customers paid on your SimplePress site, the money went to <strong>your own Stripe account</strong>. Stripe is a payment company. You own that account, not SimplePress. That means your payment history, payouts, refunds and your customers' saved cards all stay in your Stripe account. They do not disappear when you close your SimplePress site. Log in at stripe.com to see them.</p>`
      : `<p>This site has not connected a Stripe account. If you took payments some other way, those records are with that provider. Log in to it to see your payment history.</p>`);
  if (c.subscriptions > 0) {
    body += callout(
      `<p><strong>You have ${count(c.subscriptions, "subscription")}.</strong> Subscriptions are billed by Stripe on a schedule, and they keep charging customers even after you close the old site. Before you close it, either cancel them in your Stripe account or move them to your new platform, and tell your customers. Otherwise customers may be charged for something that is no longer provided.</p>`,
      "warn",
    );
  }
  body +=
    h2("Taking payments on your new site") +
    ul([
      "<strong>WordPress, Wix and Squarespace</strong> can connect to a Stripe account. Look in the payment settings for Stripe. You may be able to connect the same Stripe account you already use, which keeps all your history in one place.",
      "<strong>Shopify and Square</strong> have their own payment systems (Shopify Payments and Square Payments). Customers' saved cards cannot simply be copied across. Customers will need to enter their card again.",
      "Each platform and each country has its own list of payment options and fees. Check your new platform's payment settings before you decide.",
    ]) +
    `<p>If you want to move saved cards from Stripe to another payment company, contact Stripe's support. They can arrange it between approved companies. Do not try to copy card numbers yourself, because it is not allowed.</p>` +
    h2("Customers and order history") +
    `<p>Your customer and order lists are in the ${folder(SITE_EXPORT_DIRS.spreadsheets)} folder as spreadsheets (${count(c.customers, "customer")}, ${count(c.orders, "order")}${c.invoices > 0 ? `, ${count(c.invoices, "invoice")}` : ""}).</p>` +
    (related.length > 0
      ? ul(
          related.map(
            (s) => `${link(doc, s.path, fileName(s.path))} (${count(s.rows, "row")})`,
          ),
        )
      : "") +
    ul([
      "Keep the order spreadsheets with your business records. Check how long your country or state requires you to keep sales records for tax.",
      "New platforms have their own accounts, so customers often have to sign up again. You could send them a short email with the new address.",
      "Before you email your customer list, check you are allowed to. Rules about marketing emails vary, and a customer who agreed to hear from one site has not necessarily agreed to hear from another.",
    ]) +
    callout(
      `<p><strong>Your customers' personal information is in these spreadsheets.</strong> Store the file safely, do not share it publicly, and delete the parts you do not need.</p>`,
      "warn",
    ) +
    (c.loyaltyMembers > 0
      ? `<p>You also have ${count(c.loyaltyMembers, "loyalty member")}. Most platforms cannot import loyalty points, so decide whether you want to honor them in a new app, and let members know.</p>`
      : "") +
    h2("Before you close the old site") +
    ol([
      "Check your new site can take a test payment.",
      c.subscriptions > 0 ? "Cancel or move all subscriptions in Stripe." : "Check there are no repeat payments still set up in Stripe.",
      "Check you have downloaded this export and saved it somewhere safe, such as a USB drive and a cloud folder.",
      `Keep your ${link(doc, SITE_DETAILS_PATH, "Site details")} page. It has your business information in one place.`,
    ]) +
    stampCheckedNote();
  return guideFile(doc, "Payments, customers and subscriptions", summary, body, "What happens to your money, your customers and your subscriptions.");
}
