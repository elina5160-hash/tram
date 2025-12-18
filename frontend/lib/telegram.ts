const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

function normalizeChatId(id: string) {
  const s = String(id || "").trim()
  if (!s) return s
  if (/^\-100\d+$/.test(s)) return s
  if (/^\d{9,}$/.test(s)) return `-100${s}`
  return s
}

export async function sendTelegramMessage(text: string, chatId?: string, replyMarkup?: unknown) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is missing")
    return
  }

  const targetChatIdRaw = chatId || TELEGRAM_ADMIN_CHAT_ID
  const targetChatId = targetChatIdRaw ? normalizeChatId(targetChatIdRaw) : undefined
  if (!targetChatId) {
    console.error("Target chat ID is missing")
    return
  }

  const payload = (pm?: string, id?: string) => JSON.stringify({ chat_id: id || targetChatId, text, parse_mode: pm, reply_markup: replyMarkup })
  const attempt = async (pm?: string, id?: string) => {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload(pm, id) })
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
        try {
          const altId = normalizeChatId(String(targetChatIdRaw))
          if (altId && altId !== targetChatId) {
            await attempt(undefined, altId)
            return
          }
        } catch {}
        console.error("Telegram send failed", e)
        if (TELEGRAM_ADMIN_CHAT_ID && targetChatId !== TELEGRAM_ADMIN_CHAT_ID) {
          try { await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: normalizeChatId(TELEGRAM_ADMIN_CHAT_ID), text: "Ошибка доставки уведомления", parse_mode: undefined }) }) } catch {}
        }
      }
    }
  }
}
