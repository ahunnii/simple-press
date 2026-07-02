import { env } from "~/env";

export async function notifyDiscordDeletionRequest({
  customerId,
  businessName,
}: {
  customerId: string;
  businessName: string;
}) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) return;

  await fetch(webhookUrl, {
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

  await fetch(webhookUrl, {
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

  await fetch(webhookUrl, {
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
}
