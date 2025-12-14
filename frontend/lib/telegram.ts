const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

export async function sendTelegramMessage(text: string, chatId?: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is missing")
    return
  }

  const targetChatId = chatId || TELEGRAM_ADMIN_CHAT_ID
  if (!targetChatId) {
    console.error("Target chat ID is missing")
    return
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: text,
        parse_mode: "HTML",
      }),
    })
    
    if (!res.ok) {
        const err = await res.text()
        console.error("Failed to send Telegram message:", err)
    }
  } catch (e) {
    console.error("Error sending Telegram message:", e)
  }
}
