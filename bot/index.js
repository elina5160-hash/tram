const { Telegraf, Markup } = require('telegraf')
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
const supabase = createClient(supabaseUrl, supabaseKey)

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

bot.start(async (ctx) => {
  const userId = ctx.from.id
  const user = await getOrCreateUser(ctx)
  
  if (!user) {
      return ctx.reply('Произошла ошибка при регистрации в конкурсе.')
  }

  // Handle Referral
  // ctx.payload is available in Telegraf for /start payload
  const startPayload = ctx.payload || '' 
  
  if (startPayload.startsWith('ref_')) {
      const referrerId = startPayload.replace('ref_', '')
      
      // Prevent self-referral
      if (referrerId && referrerId != userId) {
          // Check if referral record exists
          const { data: existingRef } = await supabase
              .from('contest_referrals')
              .select('*')
              .eq('referee_id', userId)
              .single()
              
          if (!existingRef) {
              // Record referral
              const { error: refError } = await supabase.from('contest_referrals').insert({
                  referrer_id: referrerId,
                  referee_id: userId,
                  status: 'joined'
              })
              
              if (!refError) {
                  // Count referrals for referrer
                  const { count } = await supabase
                      .from('contest_referrals')
                      .select('*', { count: 'exact', head: true })
                      .eq('referrer_id', referrerId)
                  
                  let reward = 0
                  if (count === 3) reward = 1
                  if (count === 5) reward = 2
                  if (count === 10) reward = 5
                  
                  // Notify Referrer
                  if (reward > 0) {
                      // Add tickets
                      const { data: refUser } = await supabase.from('contest_participants').select('tickets').eq('user_id', referrerId).single()
                      if (refUser) {
                          await supabase.from('contest_participants').update({ tickets: refUser.tickets + reward }).eq('user_id', referrerId)
                          
                          // Log
                          await supabase.from('contest_tickets_log').insert({
                              user_id: referrerId,
                              amount: reward,
                              reason: `referral_milestone_${count}`
                          })
                          
                          try {
                              await bot.telegram.sendMessage(referrerId, `🎁 <b>Поздравляем!</b>\nВы пригласили ${count} друзей и получили +${reward} 🎟 билетов!`, { parse_mode: 'HTML' })
                          } catch (e) {}
                      }
                  } else {
                      try {
                          await bot.telegram.sendMessage(referrerId, `👋 Новый друг присоединился по вашей ссылке! (Всего приглашено: ${count})`)
                      } catch (e) {}
                  }
              }
          }
      }
  }

  const separator = webAppUrl.includes('?') ? '&' : '?'
  const urlWithId = `${webAppUrl}${separator}client_id=${userId}`
  const contestUrl = `${webAppUrl}/contest${separator}client_id=${userId}`
  
  // Safe URLs for buttons (Must be HTTPS)
  const safeSeparator = safeWebAppUrl.includes('?') ? '&' : '?'
  const safeUrlWithId = `${safeWebAppUrl}${safeSeparator}client_id=${userId}`
  const safeContestUrl = `${safeWebAppUrl}/contest${safeSeparator}client_id=${userId}`

  const refLink = `https://t.me/${botUsername || ctx.botInfo.username}?start=ref_${userId}`

  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🎁 Мои билеты и Конкурс', safeContestUrl)],
    [Markup.button.webApp('🛒 Магазин', safeUrlWithId)],
    [Markup.button.url('🔗 Поделиться ссылкой', shareUrl)]
  ])

  ctx.replyWithHTML(
    `🎄 Привет, ${user.first_name}! \n\n` +
    `Ты участвуешь в конкурсе <b>"Дари Здоровье"</b>! 🎁\n\n` +
    `🎫 Твои билеты: <b>${user.tickets}</b>\n` +
    `🔖 Твой промокод для друзей: <code>${user.personal_promo_code}</code> (-15%)\n` +
    `🔗 Твоя ссылка: <code>${refLink}</code>`,
    keyboard
  )
})

bot.command('contest', async (ctx) => {
    const user = await getOrCreateUser(ctx)
    if (!user) return
    
    const userId = ctx.from.id
    const separator = webAppUrl.includes('?') ? '&' : '?'
    const contestUrl = `${webAppUrl}/contest${separator}client_id=${userId}`
    
    // Safe URLs for buttons (Must be HTTPS)
    const safeSeparator = safeWebAppUrl.includes('?') ? '&' : '?'
    const safeContestUrl = `${safeWebAppUrl}/contest${safeSeparator}client_id=${userId}`
    
    const refLink = `https://t.me/${botUsername || ctx.botInfo.username}?start=ref_${userId}`
    
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Присоединяйся к конкурсу "Дари Здоровье" и выигрывай призы!')}`

    ctx.replyWithHTML(
        `🏆 <b>Твой профиль участника</b>\n\n` +
        `🎫 Билетов: <b>${user.tickets}</b>\n` +
        `🔖 Промокод: <code>${user.personal_promo_code}</code>\n` +
        `🔗 Ссылка: <code>${refLink}</code>`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('Открыть подробности', safeContestUrl)],
            [Markup.button.url('🔗 Поделиться ссылкой', shareUrl)]
        ])
    )
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
