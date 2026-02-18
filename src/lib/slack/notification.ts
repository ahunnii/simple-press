import { env } from "~/env";

export async function notifySlackNewDomain(domain: string, tenantId: string) {
  const webhookUrl = env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) return;

  const message = {
    text: `🚀 *New Custom Domain Added*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Custom Domain Added*\n*Domain:* ${domain}\n*Tenant:* ${tenantId}\n\n_Action required: Add to Coolify._`,
        },
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
}
