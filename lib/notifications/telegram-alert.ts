import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/lib/env";

const telegramConfigSchema = z.object({
  botToken: z.string().min(1, "TELEGRAM_BOT_TOKEN is required when Telegram alerts are enabled"),
  chatId: z.string().min(1, "TELEGRAM_CHAT_ID is required when Telegram alerts are enabled"),
});

export async function sendTelegramAlert(input: { text: string }) {
  const env = getServerEnv();

  if (!env.TELEGRAM_ALERT_ENABLED) {
    return;
  }

  const config = telegramConfigSchema.parse({
    botToken: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
  });

  const response = await fetch(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: input.text,
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Telegram sendMessage request failed with ${response.status}: ${responseText}`,
    );
  }
}
