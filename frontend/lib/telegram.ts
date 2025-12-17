const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

export async function sendTelegramMessage(text: string, chatId?: string, replyMarkup?: unknown) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is missing")
    return
  }

  const targetChatId = chatId || TELEGRAM_ADMIN_CHAT_ID
  if (!targetChatId) {
    console.error("Target chat ID is missing")
    return
  }

  const payload = (pm?: string) => JSON.stringify({ chat_id: targetChatId, text, parse_mode: pm, reply_markup: replyMarkup })
  const attempt = async (pm?: string) => {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload(pm) })
    if (!res.ok) throw new Error(await res.text())
  }

  let tries = 0
  let pm: string | undefined = "HTML"
  while (tries < 4) {
    try {
      await attempt(pm)
      return
    } catch (e) {
      const ms = Math.min(2000 * Math.pow(2, tries), 10000)
      await new Promise((r) => setTimeout(r, ms))
      if (tries === 0) pm = undefined
      tries += 1
      if (tries >= 4) {
        console.error("Telegram send failed", e)
        if (TELEGRAM_ADMIN_CHAT_ID && targetChatId !== TELEGRAM_ADMIN_CHAT_ID) {
          try { await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text: "Ошибка доставки уведомления", parse_mode: undefined }) }) } catch {}
        }
      }
    }
  }
}
