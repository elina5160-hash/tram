import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"

function transliterate(word: string) {
  const a: Record<string, string> = {"Ё":"YO","Й":"I","Ц":"TS","У":"U","К":"K","Е":"E","Н":"N","Г":"G","Ш":"SH","Щ":"SCH","З":"Z","Х":"H","Ъ":"'","ё":"yo","й":"i","ц":"ts","у":"u","к":"k","е":"e","н":"n","г":"g","ш":"sh","щ":"sch","з":"z","х":"h","ъ":"'","Ф":"F","Ы":"I","В":"V","А":"A","П":"P","Р":"R","О":"O","Л":"L","Д":"D","Ж":"ZH","Э":"E","ф":"f","ы":"i","в":"v","а":"a","п":"p","р":"r","о":"o","л":"l","д":"d","ж":"zh","э":"e","Я":"YA","Ч":"CH","С":"S","М":"M","И":"I","Т":"T","Ь":"'","Б":"B","Ю":"YU","я":"ya","ч":"ch","с":"s","м":"m","и":"i","т":"t","ь":"'","б":"b","ю":"yu"}
  return word.split('').map((ch) => a[ch] || ch).join("").replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

async function sendMessage(text: string, chatId: string, replyMarkup?: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ""
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }) })
}

async function logEvent(type: string, message: string, data?: unknown) {
  const sup = getServiceSupabaseClient() || getSupabaseClient()
  if (sup) {
    try {
      await sup.from('bot_logs').insert({ created_at: new Date().toISOString(), type, message, data })
    } catch {}
  } else {
    try {
      console.log('[bot_log]', { type, message, data })
    } catch {}
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const update = body
    const msg = update?.message
    const chatId: string = String(msg?.chat?.id || "")
    const text: string = String(msg?.text || "")
    const firstName: string = String(msg?.from?.first_name || "User")
    const userId: number = Number(msg?.from?.id || 0)
    if (!chatId || !text) return NextResponse.json({ ok: true })

    const sup = getServiceSupabaseClient() || getSupabaseClient()

    const makeUser = async () => {
      if (!sup) return { user_id: userId, first_name: firstName, username: String(msg?.from?.username || ""), personal_promo_code: transliterate(firstName) + "15", tickets: 0, ticket_numbers: [] as string[] }
      const { data: user } = await sup.from('contest_participants').select('*').eq('user_id', userId).single()
      if (user) return user
      let promo = transliterate(firstName) + "15"
      const { data: exists } = await sup.from('contest_participants').select('personal_promo_code').eq('personal_promo_code', promo).single()
      if (exists) promo = promo + String(userId).slice(-3)
      const { data: created } = await sup.from('contest_participants').insert({ user_id: userId, first_name: firstName, username: String(msg?.from?.username || ""), personal_promo_code: promo, tickets: 0 }).select().single()
      return created
    }

    if (/^\/start\b/i.test(text)) {
      const payload = text.split(/\s+/)[1] || ""
      if (payload.startsWith('ref_')) {
        const raw = Number(payload.replace('ref_', ''))
        const referrerId = Number.isFinite(raw) ? raw : 0
        if (!referrerId || referrerId <= 0) {
          await logEvent('referral_invalid', 'Invalid referral payload', { userId, payload })
        } else if (referrerId === userId) {
          await logEvent('referral_self', 'Self-referral blocked', { userId })
        } else {
          if (sup) {
            const { data: existing } = await sup.from('contest_referrals').select('*').eq('referee_id', userId).single()
            if (!existing) {
              await sup.from('contest_referrals').insert({ referrer_id: referrerId, referee_id: userId, status: 'joined' })
              await logEvent('referral_joined', 'Referral recorded', { referee: userId, referrer: referrerId })
              try { await addTickets(referrerId, 1, 'referral_bonus', String(userId)) } catch {}
              await logEvent('referral_bonus_awarded', 'Tickets awarded', { to: referrerId, count: 1, by: userId })
              try { await sendMessage(`👋 Новый друг присоединился по вашей ссылке! (Всего приглашено: больше 0)`, String(referrerId)) } catch {}
            }
          } else {
            const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID || ""
            if (adminChat) await sendMessage(`🔔 Новая реферальная регистрация: referee=${userId}, referrer=${referrerId}`, adminChat)
            try { await sendMessage(`👋 По вашей ссылке присоединился новый участник (ID: ${userId}).`, String(referrerId)) } catch {}
          }
        }
      }
      const user = await makeUser()
      const botUser = update?.my_chat_member?.new_chat_member?.user || null
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || String(update?.bot?.username || botUser?.username || "")
      const refLink = `https://t.me/${botUsername}?start=ref_${userId}`
      const webAppUrl = process.env.WEB_APP_URL || "https://google.com"
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`
      const ticketCount = Array.isArray((user as any).ticket_numbers) ? (user as any).ticket_numbers.length : (user as any).tickets || 0
      const replyMarkup = { inline_keyboard: [ [{ text: '🎁 Мои билеты и Конкурс', web_app: { url: `${webAppUrl}/contest?client_id=${userId}` } }], [{ text: '🛒 Магазин', web_app: { url: `${webAppUrl}?client_id=${userId}` } }], [{ text: '🔗 Поделиться ссылкой', url: shareUrl }] ] }
      await sendMessage(
        `🎄 Привет, ${user.first_name}! \n\n` +
        `Ты участвуешь в конкурсе <b>"Дари Здоровье"</b>! 🎁\n\n` +
        `🎫 Твои билеты: <b>${ticketCount}</b>\n` +
        `🔖 Твой промокод для друзей: <code>${(user as any).personal_promo_code || ''}</code> (-15%)\n` +
        `🔗 Твоя ссылка: <a href="${refLink}">${refLink}</a>\n\n` +
        `Перешли это сообщение друзьям или нажми кнопку ниже, чтобы поделиться.`,
        chatId,
        replyMarkup
      )
      return NextResponse.json({ ok: true })
    }

    if (/^\/tickets\b/i.test(text)) {
      const user = await makeUser()
      const count = Array.isArray((user as any).ticket_numbers) ? (user as any).ticket_numbers.length : (user as any).tickets || 0
      const nums = Array.isArray((user as any).ticket_numbers) && (user as any).ticket_numbers.length ? (user as any).ticket_numbers.join(', ') : ''
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || String(update?.bot?.username || "")
      const refLink = `https://t.me/${botUsername}?start=ref_${userId}`
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`
      const replyMarkup = { inline_keyboard: [ [{ text: '🔗 Поделиться ссылкой', url: shareUrl }] ] }
      await sendMessage(`🎫 Билетов: <b>${count}</b>${nums ? `\nНомера: ${nums}` : ''}`, chatId, replyMarkup)
      return NextResponse.json({ ok: true })
    }

    if (/^\/contest\b/i.test(text)) {
      const user = await makeUser()
      const webAppUrl = process.env.WEB_APP_URL || "https://google.com"
      const replyMarkup = { inline_keyboard: [ [{ text: 'Открыть подробности', web_app: { url: `${webAppUrl}/contest?client_id=${userId}` } }] ] }
      await sendMessage(
        `🏆 <b>Твой профиль участника</b>\n\n` +
        `🎫 Билетов: <b>${Array.isArray((user as any).ticket_numbers) ? (user as any).ticket_numbers.length : (user as any).tickets || 0}</b>\n` +
        `🔖 Промокод: <code>${(user as any).personal_promo_code}</code>`,
        chatId,
        replyMarkup
      )
      return NextResponse.json({ ok: true })
    }

    if (/^\/konkurs\b/i.test(text)) {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || String(update?.bot?.username || "")
      const refLink = `https://t.me/${botUsername}?start=ref_${userId}`
      const greeting = `🎄 Привет, ${firstName} | Разработка приложений и AI помощников!\nВот твоя реферальная ссылка для конкурса\n${refLink}`
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`
      const replyMarkup = { inline_keyboard: [ [{ text: 'Переслать', url: shareUrl }] ] }
      await sendMessage(greeting, chatId, replyMarkup)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
