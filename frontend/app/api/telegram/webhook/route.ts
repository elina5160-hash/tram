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

async function isSubscribedToOfficial(userId: number) {
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

    // /start отключен, чтобы не конфликтовать с другим ботом

    // /tickets отключен

    // /contest отключен

    if (/^\/konkurs(?:@\w+)?\b/i.test(text) || /^\/конкурс\b/i.test(text) || /(^|\s)konkurs(\s|$)/i.test(text) || /(^|\s)конкурс(\s|$)/i.test(text)) {
      const subscribed = await isSubscribedToOfficial(userId)
      if (!subscribed) {
        const replyMarkup = { inline_keyboard: [ [{ text: 'Открыть канал ЭТРА', url: 'https://t.me/etraproject_official' }], [{ text: 'Проверить подписку', callback_data: 'check_sub' }] ] }
        await sendMessage('Для участия подпишитесь на официальный канал @etraproject_official и снова отправьте команду «конкурс».', chatId, replyMarkup)
        await logEvent('contest_not_subscribed', 'User not subscribed', { userId })
        return NextResponse.json({ ok: true })
      }
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
