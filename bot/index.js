const telegrafModule = require('telegraf')
const { Telegraf, Markup } = telegrafModule
try { console.log('telegraf module keys:', Object.keys(telegrafModule)) } catch {}
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../frontend/.env.local') })

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000'

// Telegram WebApp buttons REQUIRE HTTPS. 
// If we are on localhost (http), we must provide a valid HTTPS URL for the button to render,
// even if it doesn't lead to our local app (it will just open an external site).
// Ideally, use ngrok to tunnel localhost to https.
const isLocalhost = webAppUrl.includes('localhost') || webAppUrl.includes('http://')
const safeWebAppUrl = isLocalhost ? 'https://google.com' : webAppUrl 
// NOTE: For development, use ngrok to get a real https url pointing to localhost:3000

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Service Role for admin access

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing')
}

const bot = new Telegraf(token)
try {
  console.log('Telegraf ctor typeof:', typeof Telegraf)
  console.log('Bot instance keys:', Object.keys(bot || {}))
  console.log('Composer.on typeof:', typeof telegrafModule.Composer?.prototype?.on)
  console.log('bot constructor:', bot && bot.constructor && bot.constructor.name)
  console.log('bot has on:', 'on' in (bot || {}), 'typeof', typeof bot.on)
} catch {}
let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

// Cache bot username
let botUsername = ''
bot.telegram.getMe().then((me) => {
    botUsername = me.username
})


function transliterate(word) {
    const a = {"Ё":"YO","Й":"I","Ц":"TS","У":"U","К":"K","Е":"E","Н":"N","Г":"G","Ш":"SH","Щ":"SCH","З":"Z","Х":"H","Ъ":"'","ё":"yo","й":"i","ц":"ts","у":"u","к":"k","е":"e","н":"n","г":"g","ш":"sh","щ":"sch","з":"z","х":"h","ъ":"'","Ф":"F","Ы":"I","В":"V","А":"A","П":"P","Р":"R","О":"O","Л":"L","Д":"D","Ж":"ZH","Э":"E","ф":"f","ы":"i","в":"v","а":"a","п":"p","р":"r","о":"o","л":"l","д":"d","ж":"zh","э":"e","Я":"YA","Ч":"CH","С":"S","М":"M","И":"I","Т":"T","Ь":"'","Б":"B","Ю":"YU","я":"ya","ч":"ch","с":"s","м":"m","и":"i","т":"t","ь":"'","б":"b","ю":"yu"};
    return word.split('').map(function (char) {
        return a[char] || char;
    }).join("").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

async function getOrCreateUser(ctx) {
    const userId = ctx.from.id
    const firstName = ctx.from.first_name || 'User'
    const username = ctx.from.username || ''

    if (!supabase) {
        return {
            user_id: userId,
            first_name: firstName,
            username,
            personal_promo_code: transliterate(firstName) + '15',
            tickets: 0,
            ticket_numbers: []
        }
    }
    let { data: user } = await supabase
      .from('contest_participants')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!user) {
        // Generate Promo Code
        let promoCode = transliterate(firstName) + '15'
        
        // Check uniqueness
        const { data: existing } = await supabase.from('contest_participants').select('personal_promo_code').eq('personal_promo_code', promoCode).single()
        if (existing) {
            promoCode = promoCode + userId.toString().slice(-3)
        }

        const { data: newUser, error } = await supabase.from('contest_participants').insert({
            user_id: userId,
            first_name: firstName,
            username: username,
            personal_promo_code: promoCode,
            tickets: 0
        }).select().single()
        
        if (error) {
            console.error('Error creating user:', error)
            return null
        }
        return newUser
    }
    return user
}

async function isSubscribedToOfficial(userId) {
  const channel = '@etraproject_official'
  try {
    const res = await bot.telegram.getChatMember(channel, userId)
    const st = String(res && res.status ? res.status : '')
    return ['member', 'creator', 'administrator'].includes(st)
  } catch (e) {
    return false
  }
}
 
if (false) {
bot.on('text', async (ctx) => {
  const msg = (ctx.message && ctx.message.text) ? String(ctx.message.text) : ''
  const isStart = /^\/start\b/i.test(msg)
  const isKonkurs = /^\/konkurs(?:@\w+)?\b/i.test(msg) || /^\/конкурс\b/i.test(msg) || /(^|\s)konkurs(\s|$)/i.test(msg) || /(^|\s)конкурс(\s|$)/i.test(msg)
  if (!isStart && !isKonkurs) return
  const userId = ctx.from.id

  const subscribed = await isSubscribedToOfficial(userId)
  if (!subscribed) {
    const keyboardSub = Markup.inlineKeyboard([[Markup.button.url('Открыть канал ЭТРА', 'https://t.me/etraproject_official')]])
    await ctx.reply('Для участия подпишитесь на официальный канал @etraproject_official и снова отправьте команду «start».', keyboardSub)
    return
  }

  const user = await getOrCreateUser(ctx)
  if (!user) {
    await ctx.reply('Произошла ошибка при регистрации в конкурсе.')
    return
  }

  const startPayload = (ctx.startPayload || ctx.payload || '')
  if (startPayload && startPayload.startsWith('ref_')) {
    const referrerId = startPayload.replace('ref_', '')
    if (referrerId && referrerId != userId) {
      if (supabase) {
        const { data: existingRef } = await supabase
          .from('contest_referrals')
          .select('*')
          .eq('referee_id', userId)
          .single()
        if (!existingRef) {
          const { error: refError } = await supabase.from('contest_referrals').insert({
            referrer_id: referrerId,
            referee_id: userId,
            status: 'joined'
          })
          if (!refError) {
            const { count } = await supabase
              .from('contest_referrals')
              .select('*', { count: 'exact', head: true })
              .eq('referrer_id', referrerId)
            let reward = 0
            if (count === 3) reward = 1
            if (count === 5) reward = 2
            if (count === 10) reward = 5
            if (reward > 0) {
              const { data: refUser } = await supabase.from('contest_participants').select('tickets').eq('user_id', referrerId).single()
              if (refUser) {
                await supabase.from('contest_participants').update({ tickets: refUser.tickets + reward }).eq('user_id', referrerId)
                await supabase.from('contest_tickets_log').insert({ user_id: referrerId, amount: reward, reason: `referral_milestone_${count}` })
                try { await bot.telegram.sendMessage(referrerId, `🎁 <b>Поздравляем!</b>\nВы пригласили ${count} друзей и получили +${reward} 🎟 билетов!`, { parse_mode: 'HTML' }) } catch (e) {}
              }
            } else {
              try { await bot.telegram.sendMessage(referrerId, `👋 Новый друг присоединился по вашей ссылке! (Всего приглашено: ${count})`) } catch (e) {}
            }
          }
        }
      } else {
        try { await bot.telegram.sendMessage(referrerId, `👋 По вашей ссылке присоединился новый участник (ID: ${userId}). Проверьте админку для деталей.`) } catch (e) {}
        try {
          const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID
          if (adminChat) {
            await bot.telegram.sendMessage(adminChat, `🔔 Новая реферальная регистрация: referee=${userId}, referrer=${referrerId}`)
          } else {
            console.log(`Referral (no DB): referee=${userId}, referrer=${referrerId}`)
          }
        } catch (e) {}
      }
    }
  }

  const separator = webAppUrl.includes('?') ? '&' : '?'
  const urlWithId = `${webAppUrl}${separator}client_id=${userId}`
  const contestUrl = `${webAppUrl}/contest${separator}client_id=${userId}`
  const safeSeparator = safeWebAppUrl.includes('?') ? '&' : '?'
  const safeUrlWithId = `${safeWebAppUrl}${safeSeparator}client_id=${userId}`
  const safeContestUrl = `${safeWebAppUrl}/contest${safeSeparator}client_id=${userId}`
  const refLink = `https://t.me/${botUsername || (ctx.botInfo && ctx.botInfo.username) || ''}?start=ref_${userId}`
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🎁 Мои билеты и Конкурс', safeContestUrl)],
    [Markup.button.webApp('🛒 Магазин', safeUrlWithId)],
    [Markup.button.url('🔗 Поделиться ссылкой', shareUrl)]
  ])
  const ticketCount = Array.isArray(user.ticket_numbers) ? user.ticket_numbers.length : (user.tickets || 0)
  await ctx.replyWithHTML(
    `🎄 Привет, ${user.first_name}! \n\n` +
    `Ты участвуешь в конкурсе <b>"Дари Здоровье"</b>! 🎁\n\n` +
    `🎫 Твои билеты: <b>${ticketCount}</b>\n` +
    `🔖 Твой промокод для друзей: <code>${user.personal_promo_code || ''}</code> (-15%)\n` +
    `🔗 Твоя ссылка: <a href="${refLink}">${refLink}</a>\n\n` +
    `Перешли это сообщение друзьям или нажми кнопку ниже, чтобы поделиться.`,
    keyboard
  )
})
}

async function handleStartOrKonkurs(ctx) {
  const userId = ctx.from.id
  const subscribed = await isSubscribedToOfficial(userId)
  if (!subscribed) {
    const keyboardSub = Markup.inlineKeyboard([[Markup.button.url('Открыть канал ЭТРА', 'https://t.me/etraproject_official')]])
    await ctx.reply('Для участия подпишитесь на официальный канал @etraproject_official и снова отправьте команду «start».', keyboardSub)
    return
  }

  const user = await getOrCreateUser(ctx)
  if (!user) {
    await ctx.reply('Произошла ошибка при регистрации в конкурсе.')
    return
  }

  const startPayload = (ctx.startPayload || ctx.payload || '')
  if (startPayload && startPayload.startsWith('ref_')) {
    const referrerId = startPayload.replace('ref_', '')
    if (referrerId && referrerId != userId) {
      if (supabase) {
        const { data: existingRef } = await supabase
          .from('contest_referrals')
          .select('*')
          .eq('referee_id', userId)
          .single()
        if (!existingRef) {
          const { error: refError } = await supabase.from('contest_referrals').insert({
            referrer_id: referrerId,
            referee_id: userId,
            status: 'joined'
          })
          if (!refError) {
            const { count } = await supabase
              .from('contest_referrals')
              .select('*', { count: 'exact', head: true })
              .eq('referrer_id', referrerId)
            let reward = 0
            if (count === 3) reward = 1
            if (count === 5) reward = 2
            if (count === 10) reward = 5
            if (reward > 0) {
              const { data: refUser } = await supabase.from('contest_participants').select('tickets').eq('user_id', referrerId).single()
              if (refUser) {
                await supabase.from('contest_participants').update({ tickets: refUser.tickets + reward }).eq('user_id', referrerId)
                await supabase.from('contest_tickets_log').insert({ user_id: referrerId, amount: reward, reason: `referral_milestone_${count}` })
                try { await bot.telegram.sendMessage(referrerId, `🎁 <b>Поздравляем!</b>\nВы пригласили ${count} друзей и получили +${reward} 🎟 билетов!`, { parse_mode: 'HTML' }) } catch (e) {}
              }
            } else {
              try { await bot.telegram.sendMessage(referrerId, `👋 Новый друг присоединился по вашей ссылке! (Всего приглашено: ${count})`) } catch (e) {}
            }
          }
        }
      } else {
        try { await bot.telegram.sendMessage(referrerId, `👋 По вашей ссылке присоединился новый участник (ID: ${userId}). Проверьте админку для деталей.`) } catch (e) {}
        try {
          const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID
          if (adminChat) {
            await bot.telegram.sendMessage(adminChat, `🔔 Новая реферальная регистрация: referee=${userId}, referrer=${referrerId}`)
          } else {
            console.log(`Referral (no DB): referee=${userId}, referrer=${referrerId}`)
          }
        } catch (e) {}
      }
    }
  }

  const refLink = `https://t.me/${botUsername || (ctx.botInfo && ctx.botInfo.username) || ''}?start=ref_${userId}`
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`
  const keyboard = Markup.inlineKeyboard([[Markup.button.url('Переслать', shareUrl)]])
  const greeting = `🎄 Привет, ${user.first_name} | Разработка приложений и AI помощников!\nВот твоя реферальная ссылка для конкурса\n${refLink}`
  await ctx.replyWithHTML(greeting, keyboard)
}

bot.start(handleStartOrKonkurs)
bot.hears(/^\/konkurs(?:@\w+)?\b/i, handleStartOrKonkurs)
bot.hears(/^\/конкурс\b/i, handleStartOrKonkurs)


(async () => {
  try { await bot.telegram.deleteWebhook({ drop_pending_updates: false }) } catch (e) {}
  await bot.launch()
  console.log('Bot started (polling)')
})()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
