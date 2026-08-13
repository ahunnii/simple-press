import { env } from "~/env";

/**
 * Throws if the webhook responds with a non-2xx status (e.g. a revoked or
 * misconfigured webhook URL) so a misfiring webhook doesn't fail silently.
 * Callers already wrap these senders in try/catch or `.catch()` that reports
 * to Sentry, so throwing here is sufficient — no need to report from here too.
 */
async function assertOk(response: Response, context: string): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `Discord webhook request failed (${context}): ${response.status} ${response.statusText}`,
    );
  }
}

export async function notifyDiscordDeletionRequest({
  customerId,
  businessName,
}: {
  customerId: string;
  businessName: string;
}) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "🗑️ Customer Deletion Request",
          description:
            "A customer has requested deletion of their personal data. Please process this request.",
          color: 0xed4245,
          fields: [
            {
              name: "Business",
              value: businessName,
              inline: true,
            },
            {
              name: "Customer ID",
              value: `\`${customerId}\``,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  await assertOk(response, "deletion-request");
}

export async function notifyDiscordDomainRemoved({
  domain,
  businessName,
  businessId,
  subdomain,
  ownerEmail,
}: {
  domain: string;
  businessName: string;
  businessId: string;
  subdomain: string;
  ownerEmail: string;
}) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;

  const platformDomain =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "simplepress.co";
  const subdomainUrl = `${subdomain}.${platformDomain}`;
  const adminUrl = `https://platform.${platformDomain}/domains`;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "🗑️ Custom Domain Removed",
          description:
            "A store owner has removed their custom domain. Remove it from Coolify so it can be reclaimed.",
          color: 0xed4245,
          fields: [
            {
              name: "Business",
              value: businessName,
              inline: true,
            },
            {
              name: "Owner Email",
              value: ownerEmail,
              inline: true,
            },
            {
              name: "Removed Domain",
              value: `\`${domain}\``,
              inline: false,
            },
            {
              name: "Falling Back To",
              value: `\`${subdomainUrl}\``,
              inline: false,
            },
            {
              name: "Business ID",
              value: `\`${businessId}\``,
              inline: false,
            },
          ],
          footer: {
            text: `Platform domains → ${adminUrl}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  await assertOk(response, "domain-removed");
}

export async function notifyDiscordEditorNote({
  businessName,
  subdomain,
  authorEmail,
  pageLabel,
  body,
}: {
  businessName: string;
  subdomain: string;
  authorEmail: string;
  pageLabel: string;
  body: string;
}) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;

  const platformDomain =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "simplepress.co";
  const subdomainUrl = `${subdomain}.${platformDomain}`;
  const adminUrl = `https://platform.${platformDomain}/notes`;

  const truncatedBody =
    body.length > 950 ? `${body.slice(0, 950)}…` : body;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "📝 New Site Note",
          description: "A client left a note in their site editor.",
          color: 0x5865f2,
          fields: [
            {
              name: "Business",
              value: businessName,
              inline: true,
            },
            {
              name: "Site",
              value: `\`${subdomainUrl}\``,
              inline: true,
            },
            {
              name: "From",
              value: authorEmail,
              inline: true,
            },
            {
              name: "Page",
              value: pageLabel,
              inline: false,
            },
            {
              name: "Note",
              value: truncatedBody,
              inline: false,
            },
          ],
          footer: {
            text: `Review notes → ${adminUrl}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  await assertOk(response, "editor-note");
}

export async function notifyDiscordQuoteSubmission({
  businessName,
  subdomain,
  calculatorName,
  contactName,
  contactEmail,
  estimateLabel,
  answerSummary,
}: {
  businessName: string;
  subdomain: string;
  calculatorName: string;
  contactName: string;
  contactEmail: string;
  estimateLabel: string;
  answerSummary: string;
}) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;

  const platformDomain =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "simplepress.co";
  const subdomainUrl = `${subdomain}.${platformDomain}`;

  const truncatedSummary =
    answerSummary.length > 950
      ? `${answerSummary.slice(0, 950)}…`
      : answerSummary;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "🧮 New quote request",
          description: "A visitor submitted a quote calculator.",
          color: 0x5865f2,
          fields: [
            {
              name: "Business",
              value: businessName,
              inline: true,
            },
            {
              name: "Site",
              value: `\`${subdomainUrl}\``,
              inline: true,
            },
            {
              name: "Calculator",
              value: calculatorName,
              inline: false,
            },
            {
              name: "Contact",
              value: `${contactName} (${contactEmail})`,
              inline: false,
            },
            {
              name: "Estimate",
              value: estimateLabel,
              inline: false,
            },
            {
              name: "Answers",
              value: truncatedSummary,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  await assertOk(response, "quote-submission");
}

export async function notifyDiscordNewDomain({
  domain,
  businessName,
  businessId,
  subdomain,
  ownerEmail,
}: {
  domain: string;
  businessName: string;
  businessId: string;
  subdomain: string;
  ownerEmail: string;
}) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;

  const platformDomain =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "simplepress.co";
  const subdomainUrl = `${subdomain}.${platformDomain}`;
  const adminUrl = `https://platform.${platformDomain}/domains`;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "🌐 New Custom Domain Request",
          description:
            "A store owner has requested a custom domain. Add it to Coolify, then mark it active in the platform admin.",
          color: 0x5865f2,
          fields: [
            {
              name: "Business",
              value: businessName,
              inline: true,
            },
            {
              name: "Owner Email",
              value: ownerEmail,
              inline: true,
            },
            {
              name: "Subdomain",
              value: `\`${subdomainUrl}\``,
              inline: false,
            },
            {
              name: "Custom Domain",
              value: `\`${domain}\``,
              inline: false,
            },
            {
              name: "Business ID",
              value: `\`${businessId}\``,
              inline: false,
            },
          ],
          footer: {
            text: `Review pending domains → ${adminUrl}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  await assertOk(response, "new-domain");
}
