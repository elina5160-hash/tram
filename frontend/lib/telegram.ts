const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "" // Token must be provided in env
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "1287944066" // Fallback admin ID

function normalizeChatId(id: string) {
  const s = String(id || "").trim()
  if (!s) return s
  // If it starts with -100, it's already a supergroup/channel id
  if (/^\-100\d+$/.test(s)) return s
  // If it starts with -, leave it alone (group)
  if (s.startsWith('-')) return s
  // If it is a positive number, it is likely a user ID, do NOT prepend -100
  // Previously we prepended -100 to any 9+ digit number, which broke user IDs like 6215554905
  return s
}

export async function isSubscribedToOfficial(userId: number | string) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ""
  if (!token || !userId) return false
  const channel = '@etraproject_official'
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(channel)}&user_id=${userId}`)
    const data = await res.json()
    const st = String(data?.result?.status || '')
    return ['member', 'creator', 'administrator'].includes(st)
  } catch {
    return false
  }
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
