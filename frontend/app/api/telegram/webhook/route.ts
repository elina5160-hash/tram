import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function transliterate(word: string) {
  const a: Record<string, string> = {"Ё":"YO","Й":"I","Ц":"TS","У":"U","К":"K","Е":"E","Н":"N","Г":"G","Ш":"SH","Щ":"SCH","З":"Z","Х":"H","Ъ":"'","ё":"yo","й":"i","ц":"ts","у":"u","к":"k","е":"e","н":"n","г":"g","ш":"sh","щ":"sch","з":"z","х":"h","ъ":"'","Ф":"F","Ы":"I","В":"V","А":"A","П":"P","Р":"R","О":"O","Л":"L","Д":"D","Ж":"ZH","Э":"E","ф":"f","ы":"i","в":"v","а":"a","п":"p","р":"r","о":"o","л":"l","д":"d","ж":"zh","э":"e","Я":"YA","Ч":"CH","С":"S","М":"M","И":"I","Т":"T","Ь":"'","Б":"B","Ю":"YU","я":"ya","ч":"ch","с":"s","м":"m","и":"i","т":"t","ь":"'","б":"b","ю":"yu"}
  return word.split('').map((ch) => a[ch] || ch).join("").replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

async function sendMessage(text: string, chatId: string, replyMarkup?: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ""
  if (!token || !chatId) return false
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const idNum = /^-?\d+$/.test(chatId) ? Number(chatId) : chatId
  const payload = (pm?: string, rm?: unknown) => JSON.stringify({ chat_id: idNum, text, parse_mode: pm, reply_markup: rm })
  const attempt = async (pm?: string, rm?: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload(pm, rm) })
    const body = await res.text()
    if (!res.ok) throw new Error(body)
  }
  try {
    await attempt("HTML", replyMarkup)
    return true
  } catch (e1) {
    try {
      await attempt(undefined, replyMarkup)
      return true
    } catch (e2) {
      try {
        await attempt(undefined, undefined)
        return true
      } catch (e3) {
        try { await logEvent('send_failed', 'Telegram sendMessage failed', { chatId, e1: String(e1), e2: String(e2), e3: String(e3) }) } catch {}
        return false
      }
    }
  }
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
    const token = process.env.TELEGRAM_BOT_TOKEN || ""
    if (!token) {
      try { console.error('[webhook] Missing TELEGRAM_BOT_TOKEN') } catch {}
      return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 })
    }
    const body = await req.json()
    const update = body
    const msg = update?.message
    const chatId: string = String(msg?.chat?.id || "")
    const text: string = String(msg?.text || "")
    const firstName: string = String(msg?.from?.first_name || "User")
    const userId: number = Number(msg?.from?.id || 0)
    
    // Simplified command detection
    const isStart = text.toLowerCase().startsWith('/start')
    const isKonkurs = /^\/konkurs(?:@\w+)?\b/i.test(text) || /^\/конкурс\b/i.test(text) || /(^|\s)konkurs(\s|$)/i.test(text) || /(^|\s)конкурс(\s|$)/i.test(text)

    try { await logEvent('webhook_received', 'Incoming update', { has_message: !!msg, chatId, text, userId }) } catch {}
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

    

    // /tickets отключен

    // /contest отключен

    // Admin panel check
    if (text === '/admin' || text === '/adminpanel') {
      const admins = [1287944066, 5137709082]
      if (admins.includes(userId)) {
        let totalUsers = 0
        let topUsers: any[] = []
        if (sup) {
           const { count } = await sup.from('contest_participants').select('*', { count: 'exact', head: true })
           totalUsers = count || 0
           
           const { data } = await sup.from('contest_participants').select('first_name, username, tickets').order('tickets', { ascending: false }).limit(20)
           topUsers = data || []
        }
        
        let report = `📊 Статистика бота:\n\n👥 Всего участников: ${totalUsers}\n\n🏆 Топ-20 участников по билетам:\n`
        topUsers.forEach((u, i) => {
           report += `${i+1}. ${u.first_name} (@${u.username || '-'}) — ${u.tickets} 🎫\n`
        })
        
        await sendMessage(report, chatId)
        return NextResponse.json({ ok: true })
      }
    }

    if (isStart || isKonkurs) {
      const user = await makeUser()
      let referralCount = 0
      if (sup) {
        const { count } = await sup.from('contest_referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', userId)
        referralCount = count || 0
      }

      const subscribed = await isSubscribedToOfficial(userId)
      const tokenForMe = process.env.TELEGRAM_BOT_TOKEN || ""
      let botUsername = process.env.TELEGRAM_BOT_USERNAME || ""
      if (!botUsername && tokenForMe) {
        try {
          const resMe = await fetch(`https://api.telegram.org/bot${tokenForMe}/getMe`)
          const dataMe = await resMe.json()
          botUsername = String(dataMe?.result?.username || "")
        } catch {}
      }
      const refLink = botUsername ? `https://t.me/${botUsername}?start=ref_${userId}` : ''
      
      const ticketCount = user.tickets || 0
      
      let greeting = ''
      
      if (isStart) {
        greeting = `🎄 Привет, ${firstName}

Вот твоя реферальная ссылка для конкурса
${refLink}`
      } else {
        greeting = `🎄 Привет, ${firstName} | Разработка приложений и AI помощников!

🎫 Твои билеты: ${ticketCount}
👥 Приглашено друзей: ${referralCount}

Вот твоя реферальная ссылка для конкурса
${refLink}`
      }

      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`
      const replyMarkup = { inline_keyboard: [ [{ text: 'Переслать', url: shareUrl }] ] }
      await sendMessage(greeting, chatId, replyMarkup)
      if (String(userId) !== chatId) {
        await sendMessage(greeting, String(userId), replyMarkup)
      }
      
      try { await logEvent('webhook_start', 'Handled start/konkurs', { userId, chatId, username: botUsername, subscribed }) } catch {}
      if (!subscribed) {
        const replyMarkup2 = { inline_keyboard: [ [{ text: 'Открыть канал ЭТРА', url: 'https://t.me/etraproject_official' }] ] }
        await sendMessage('Для участия подпишитесь на официальный канал @etraproject_official и снова отправьте команду «start».', chatId, replyMarkup2)
        await logEvent('contest_not_subscribed', 'User not subscribed', { userId })
      }
      return NextResponse.json({ ok: true })
    }

    // Приветственный бонус по команде /welcom(e)
    if (/^\/welcom(e)?\b/i.test(text)) {
      const user = await makeUser()
      if (sup) {
        const { data: ref } = await sup.from('contest_referrals').select('status, referrer_id').eq('referee_id', userId).single()
        if (ref && ref.status === 'joined') {
          try { await addTickets(userId, 1, 'welcome_bonus', 'ref_welcome') } catch {}
          try { await sup.from('contest_referrals').update({ status: 'welcomed' }).eq('referee_id', userId) } catch {}
        }
      }
      await sendMessage('Тебя пригласили по реферальной ссылке. Теперь ты получаешь приветственный бонус от компании Этра.', chatId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const reset = url.searchParams.get('reset')
    const set = url.searchParams.get('set')
    const token = process.env.TELEGRAM_BOT_TOKEN || ""
    if (reset && token) {
      try { await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`) } catch {}
      let info: unknown = null
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
        info = await res.json()
      } catch {}
      return NextResponse.json({ ok: true, reset: true, webhook_info: info })
    }
    if (set && token) {
      let ok = false
      let info: unknown = null
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: set }) })
        ok = r.ok
      } catch {}
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
        info = await res.json()
      } catch {}
      return NextResponse.json({ ok, set: set, webhook_info: info })
    }
  } catch {}
  return NextResponse.json({ ok: true })
}
