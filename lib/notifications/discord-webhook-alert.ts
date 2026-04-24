import "server-only";

import { getServerEnv } from "@/lib/env";

export async function sendDiscordWebhookAlert(input: { text: string }) {
  const env = getServerEnv();

  if (!env.DISCORD_ALERT_ENABLED) {
    return;
  }

  if (env.DISCORD_WEBHOOK_URLS.length === 0) {
    throw new Error(
      "DISCORD_WEBHOOK_URLS is required when Discord alerts are enabled",
    );
  }

  const results = await Promise.allSettled(
    env.DISCORD_WEBHOOK_URLS.map((webhookUrl) =>
      sendSingleDiscordWebhookAlert(webhookUrl, input.text),
    ),
  );
  const failedCount = results.filter(
    (result) => result.status === "rejected",
  ).length;

  if (failedCount > 0) {
    throw new Error(`Discord webhook alerts failed for ${failedCount} target(s)`);
  }
}

async function sendSingleDiscordWebhookAlert(webhookUrl: string, text: string) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: text.slice(0, 2000),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Discord webhook request failed with ${response.status}: ${responseText}`,
    );
  }
}
