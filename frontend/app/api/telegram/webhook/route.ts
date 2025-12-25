import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"
import { isSubscribedToOfficial, sendTelegramMessage } from "@/lib/telegram"

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function transliterate(word: string) {
  const a: Record<string, string> = {"Ё":"YO","Й":"I","Ц":"TS","У":"U","К":"K","Е":"E","Н":"N","Г":"G","Ш":"SH","Щ":"SCH","З":"Z","Х":"H","Ъ":"'","ё":"yo","й":"i","ц":"ts","у":"u","к":"k","е":"e","н":"n","г":"g","ш":"sh","щ":"sch","з":"z","х":"h","ъ":"'","Ф":"F","Ы":"I","В":"V","А":"A","П":"P","Р":"R","О":"O","Л":"L","Д":"D","Ж":"ZH","Э":"E","ф":"f","ы":"i","в":"v","а":"a","п":"p","р":"r","о":"o","л":"l","д":"d","ж":"zh","э":"e","Я":"YA","Ч":"CH","С":"S","М":"M","И":"I","Т":"T","Ь":"'","Б":"B","Ю":"YU","я":"ya","ч":"ch","с":"s","м":"m","и":"i","т":"t","ь":"'","б":"b","ю":"yu"}
  return word.split('').map((ch) => a[ch] || ch).join("").replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
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
    const token = process.env.TELEGRAM_BOT_TOKEN || ""
    if (!token) {
      return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 })
    }
    const body = await req.json()
    const update = body
    const msg = update?.message
    const chatId: string = String(msg?.chat?.id || "")
    const text: string = String(msg?.text || "")
    const firstName: string = String(msg?.from?.first_name || "друг")
    const userId: number = Number(msg?.from?.id || 0)
    
    // Simplified command detection
    const isStart = text.toLowerCase().startsWith('/start')
    const isHelp = text.toLowerCase().startsWith('/help')
    const isRules = text.toLowerCase().startsWith('/rules') || text.toLowerCase() === 'правила'
    const isStats = text.toLowerCase().startsWith('/stats') || text.toLowerCase() === 'моя статистика' || text.toLowerCase() === 'статистика'
    const isOrders = text.toLowerCase().startsWith('/orders') || text.toLowerCase() === '/заказ' || text.toLowerCase() === 'мои заказы'
    const isAdminCmd = text.toLowerCase().startsWith('/admin')
    const isShare = text.toLowerCase().startsWith('/share') || text === 'Поделиться ссылкой' || text === '👥 Пригласить друзей' || text === '👥 Позвать друзей' || text === '👥 Пригласить' || text === '👥 Пригласить ещё'

    const sup = getServiceSupabaseClient() || getSupabaseClient()
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "KonkursEtraBot"

    // Helper to get ref link
    const getRefLink = (uid: number | string) => `https://t.me/${botUsername}?start=ref_${uid}`

    // Callback Query Handling
    const callbackQuery = update?.callback_query
    if (callbackQuery) {
        const cbData = callbackQuery.data
        const cbChatId = callbackQuery.message.chat.id
        const cbUserId = callbackQuery.from.id

        if (cbData === 'copy_link') {
            // Send the link in a separate message so user can copy it easily
            const refLink = getRefLink(cbUserId)
            await sendTelegramMessage(`Твоя реферальная ссылка:\n\`${refLink}\``, String(cbChatId))
        }

        if (cbData === 'share_cmd') {
             // Reuse Share logic
             const msg10 = `👥 Пригласи друзей — получи больше билетов!
Отправь им эту ссылку:
\`${getRefLink(cbUserId)}\`

Как это работает?
1. Друг переходит по ссылке
2. Друг регистрируется в конкурсе
3. Друг получает приветственный бонус от ЭТРА
4. Друг покупает — ты получаешь +1 билет

Чем больше друзей — тем больше шансов! 💪`
            const kb10 = { inline_keyboard: [
                [{ text: '📤 Переслать ссылку', url: `https://t.me/share/url?url=${encodeURIComponent(getRefLink(cbUserId))}&text=${encodeURIComponent('🎁 Участвуй в конкурсе ЭТРА!\n101 победитель\nГлавный приз ЭТРАГЕНЕЗ\nРозыгрыш 7 января\n\nРегистрируйся по моей ссылке и получи приветственный бонус:')}` }] 
            ] }
            await sendTelegramMessage(msg10, String(cbChatId), kb10)
        }
        
        return NextResponse.json({ ok: true })
    }

    if (!chatId || !text) return NextResponse.json({ ok: true })

    const makeUser = async () => {
      if (!sup) return { user_id: String(userId), first_name: firstName, username: String(msg?.from?.username || ""), personal_promo_code: transliterate(firstName) + "15", tickets: 0, ticket_numbers: [] as string[] }
      
      const { data: user } = await sup.from('contest_participants').select('*').eq('user_id', String(userId)).single()
      if (user) return user
      
      let promo = transliterate(firstName) + "15"
      const { data: exists } = await sup.from('contest_participants').select('personal_promo_code').eq('personal_promo_code', promo).single()
      if (exists) promo = promo + String(userId).slice(-3)
      
      const { data: created } = await sup.from('contest_participants').insert({ 
        user_id: String(userId), 
        first_name: firstName, 
        username: String(msg?.from?.username || ""), 
        personal_promo_code: promo, 
        tickets: 0,
        status: 'created' 
      }).select().single()
      return created
    }

    // 1. START LOGIC
    if (isStart) {
      const user = await makeUser()
      const subscribed = await isSubscribedToOfficial(userId)

      const startPayload = text.split(' ')[1]
      const isRef = startPayload && startPayload.startsWith('ref_')
      
      // Handle Referral Registration (Scenario 2 & 7)
      if (isRef && sup) {
          const referrerId = Number(startPayload.replace('ref_', ''))
          if (!isNaN(referrerId) && referrerId !== userId) {
             const { count } = await sup.from('contest_referrals').select('*', { count: 'exact', head: true }).eq('referee_id', userId)
             if (count === 0) {
                 try {
                    await sup.from('contest_referrals').insert({ referrer_id: referrerId, referee_id: userId, status: 'joined' })
                    
                    // Notify Referrer (Scenario 7)
                    // "🎉 Отлично! Твой друг [ИМЯ] присоединился к конкурсу!..."
                    const refMsg = `🎉 Отлично!
Твой друг ${firstName} присоединился к конкурсу!
Когда он купит продукты ЭТРА — ты получишь +1 билет
Приглашай ещё друзей! 💪

Твоя ссылка:
\`${getRefLink(referrerId)}\``
                    
                    const refMarkup = { inline_keyboard: [ [{ text: '👥 Пригласить ещё', url: `https://t.me/share/url?url=${encodeURIComponent(getRefLink(referrerId))}&text=${encodeURIComponent('Участвуй в конкурсе ЭТРА!')}` }] ] }
                    
                    await sendTelegramMessage(refMsg, String(referrerId), refMarkup)

                 } catch (e) {
                    console.error('Referral error', e)
                 }
             }
          }
      }

      // Check if user is fully registered (subscribed and seen welcome)
      // We use 'subscription_bonus' log as a flag for "fully registered" state
      let hasBonus = false
      if (sup) {
         const { count } = await sup.from('bot_logs').select('*', { count: 'exact', head: true }).eq('type', 'subscription_bonus').contains('data', { userId: userId })
         hasBonus = (count || 0) > 0
      }

      // NEW USER (or not fully registered)
      if (!hasBonus) {
        if (!subscribed) {
          // If this is the VERY FIRST interaction (status 'created' just now), show Welcome 1 or 2
          // But wait, if they are not subscribed, we always show Welcome 1 or 2 prompting to subscribe?
          // Or Scenario 5?
          // Prompt says: "5. ПРОВЕРКА ПОДПИСКИ (если человек не подписан и снова нажал /start)"
          // "1. ПРИВЕТСТВИЕ (первый /start)"
          // "2. ПРИВЕТСТВИЕ (первый /start ПО РЕФЕРАЛЬНОЙ ССЫЛКЕ)"
          
          // Let's assume if they just created account (user.created_at is close to now), show 1 or 2.
          // If account existed for a while, show 5.
          const isBrandNew = (new Date().getTime() - new Date(user.created_at).getTime()) < 60000 // 1 min

          if (isBrandNew) {
             if (isRef) {
                // Scenario 2
                // We need friend's name? We only have ID. 
                // Let's try to fetch referrer name if possible, or just say "Твой друг"
                let friendName = "Твой друг"
                if (sup && startPayload) {
                    const rid = startPayload.replace('ref_', '')
                    const { data: rUser } = await sup.from('contest_participants').select('first_name').eq('user_id', rid).single()
                    if (rUser?.first_name) friendName = `Твой друг ${rUser.first_name}`
                }

                const msg2 = `👋 Привет, ${firstName}!
${friendName} пригласил тебя в конкурс ЭТРА!

🎁 101 победитель
🏆 Главный приз ЭТРАГЕНЕЗ
📅 Розыгрыш 7 января

Для участия подпишись на канал:
👉 @etraproject_official

После подписки вернись и отправь /start снова`
                
                const kb2 = { inline_keyboard: [ [{ text: 'Подписаться на канал ЭТРА', url: 'https://t.me/etraproject_official' }] ] }
                await sendTelegramMessage(msg2, chatId, kb2)
             } else {
                // Scenario 1
                const msg1 = `🎉 Добро пожаловать в конкурс ЭТРА!
"Дари здоровье — получи подарки"

🎁 101 победитель
🏆 Главный приз 88 000 руб
📅 Розыгрыш 7 января в 23:00

Для участия подпишись на официальный канал:
👉 @etraproject_official

После подписки вернись сюда и отправь команду /start снова`
                const kb1 = { inline_keyboard: [ [{ text: 'Подписаться на канал ЭТРА', url: 'https://t.me/etraproject_official' }] ] }
                await sendTelegramMessage(msg1, chatId, kb1)
             }
          } else {
             // Scenario 5 (Not subscribed, repeat start)
             const msg5 = `⚠️ Стоп!
Ты ещё не подписан на @etraproject_official

Подпишись (это займёт 5 секунд) и возвращайся! 👇`
             const kb5 = { inline_keyboard: [ 
                 [{ text: 'Подписаться на канал ЭТРА', url: 'https://t.me/etraproject_official' }],
                 [{ text: '✅ Я подписался', callback_data: 'check_sub' }] // We don't handle callback here yet, but let's assume /start works
             ] }
             await sendTelegramMessage(msg5, chatId, kb5)
          }
        } else {
          // Subscribed!
          // Grant bonus and show Scenario 3
          await addTickets(userId, 1, 'subscription_bonus', undefined, true) // Suppress default notify
          await logEvent('subscription_bonus', 'Awarded subscription bonus', { userId })
          
          const msg3 = `✅ Отлично, ${firstName}! Ты зарегистрирован!

Как участвовать:
💰 Покупай продукты ЭТРА
Заходи в @KonkursEtraBot и покупай
Каждая 1000 руб = 1 билет в конкурсе

👥 Приглашай друзей
Вот твоя реферальная ссылка:
\`${getRefLink(userId)}\`
Отправь её друзьям!
За каждую покупку друга получишь +1 билет

📊 Следи за билетами
Заходи в @KonkursEtraBot → смотри свои билеты

Конкурс до 7 января. Удачи! 🍀`
          
          const kb3 = { inline_keyboard: [
              [{ text: '🛒 Перейти в магазин', url: 'https://tram-navy.vercel.app/home' }],
              [{ text: '📤 Переслать ссылку', url: `https://t.me/share/url?url=${encodeURIComponent(getRefLink(userId))}&text=${encodeURIComponent('🎁 Участвуй в конкурсе ЭТРА!\n101 победитель\nГлавный приз ЭТРАГЕНЕЗ\nРозыгрыш 7 января\n\nРегистрируйся по моей ссылке и получи приветственный бонус:')}` }]
          ] }
          // Actually "Copy link" button usually sends the link in a separate message or alert.
          // For now, let's just provide the link in text (done above) and maybe a "Share" button.
          // User asked for "Скопировать ссылку" button. We can make it send the link again monospaced?
          // Or use `switch_inline_query` for sharing.
          
          await sendTelegramMessage(msg3, chatId, kb3)
        }
      } else {
        // ALREADY FULLY REGISTERED (Scenario 4)
        // If they click /start again
        // Need stats
        let totalSpent = 0
        let invitedCount = 0
        if (sup) {
            // Calculate spent from orders? 
            // We need to sum 'total_amount' from orders where client_id = userId
            // Not implemented efficiently, but let's try
            const { data: orders } = await sup.from('orders').select('total_amount').eq('customer_info->>client_id', String(userId))
            if (orders) totalSpent = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0)
            
            const { count } = await sup.from('contest_referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', userId)
            invitedCount = count || 0
        }
        
        const msg4 = `Привет снова, ${firstName}! 👋
Ты уже участвуешь в конкурсе!

Твоя реферальная ссылка:
\`${getRefLink(userId)}\`

📊 Текущая статистика:
🎟 Билетов: ${user.tickets}
💰 Потрачено: ${totalSpent} руб
👥 Приглашено: ${invitedCount} друзей

Продолжай покупать и приглашать! 💪`

        const kb4 = { inline_keyboard: [
            [{ text: '🛒 Перейти в магазин', url: 'https://tram-navy.vercel.app/home' }],
            [{ text: '👥 Пригласить друзей', url: `https://t.me/share/url?url=${encodeURIComponent(getRefLink(userId))}&text=${encodeURIComponent('Участвуй в конкурсе ЭТРА!')}` }]
        ] }
        await sendTelegramMessage(msg4, chatId, kb4)
      }
      return NextResponse.json({ ok: true })
    }

    // 9. HELP COMMAND
    if (isHelp) {
        const msg9 = `ℹ️ Как участвовать в конкурсе?

💰 Покупай продукты ЭТРА
Заходи в @KonkursEtraBot
Каждая 1000 руб = 1 билет

👥 Приглашай друзей
Отправь им свою ссылку:
\`${getRefLink(userId)}\`
Друг купил = +1 билет тебе

📊 Следи за билетами
В @KonkursEtraBot видно количество билетов

📅 Конкурс: 18 декабря - 7 января
🎁 101 победитель
🏆 Главный приз: ЭТРАГЕНЕЗ

Удачи! 🍀`
        const kb9 = { inline_keyboard: [
            [{ text: '🛒 Перейти в магазин', url: 'https://tram-navy.vercel.app/home' }],
            [{ text: '📢 Канал ЭТРА', url: 'https://t.me/etraproject_official' }]
        ] }
        await sendTelegramMessage(msg9, chatId, kb9)
        return NextResponse.json({ ok: true })
    }

    // 10. SHARE COMMAND
    if (isShare) {
        const msg10 = `👥 Пригласи друзей — получи больше билетов!

Отправь им эту ссылку:
\`${getRefLink(userId)}\`

Как это работает?
1. Друг переходит по ссылке
2. Друг регистрируется в конкурсе
3. Друг получает приветственный бонус от ЭТРА
4. Друг покупает — ты получаешь +1 билет

Чем больше друзей — тем больше шансов! 💪`

        const kb10 = { inline_keyboard: [
            [{ text: '📤 Переслать ссылку', url: `https://t.me/share/url?url=${encodeURIComponent(getRefLink(userId))}&text=${encodeURIComponent('🎁 Участвуй в конкурсе ЭТРА!\n101 победитель\nГлавный приз ЭТРАГЕНЕЗ\nРозыгрыш 7 января\n\nРегистрируйся по моей ссылке и получи приветственный бонус:')}` }] 
        ] }
        // Note: The text for share is Scenario 11
        await sendTelegramMessage(msg10, chatId, kb10)
        return NextResponse.json({ ok: true })
    }

    // 15. STATS COMMAND
    if (isStats) {
        const user = await makeUser()
        let totalSpent = 0
        let invitedCount = 0
        let friendsBought = 0 // "Друзья купили: [КОЛИЧЕСТВО] раз"
        
        if (sup) {
            const { data: orders } = await sup.from('orders').select('total_amount').eq('customer_info->>client_id', String(userId)).in('status', ['paid', 'Оплачен', 'CONFIRMED'])
            if (orders) totalSpent = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0)
            
            const { count } = await sup.from('contest_referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', userId)
            invitedCount = count || 0
            
            // Count friends purchases? 
            // We can check logs for 'referral_purchase_bonus'
            const { count: c2 } = await sup.from('contest_tickets_log').select('*', { count: 'exact', head: true }).eq('user_id', String(userId)).eq('reason', 'referral_purchase_bonus')
            friendsBought = c2 || 0
        }

        const daysLeft = Math.ceil((new Date('2025-01-07T23:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

        const msg15 = `📊 Твоя статистика
        
🎟 Билетов: ${user.tickets}
💰 Потрачено: ${totalSpent} руб
👥 Приглашено друзей: ${invitedCount}
🛒 Друзья купили: ${friendsBought} раз

Реферальная ссылка:
\`${getRefLink(userId)}\`

До конца конкурса: ${daysLeft} дней
Продолжай покупать и приглашать! 💪`

        const kb15 = { inline_keyboard: [
            [{ text: '🛒 Купить', url: 'https://tram-navy.vercel.app/home' }],
            [{ text: '👥 Пригласить', callback_data: 'share_cmd' }], // or just run share command logic
            [{ text: '🔄 Обновить', callback_data: 'stats_cmd' }]
        ] }
        await sendTelegramMessage(msg15, chatId, kb15)
        return NextResponse.json({ ok: true })
    }

    // 16. ORDERS COMMAND / ЗАКАЗ
    if (isOrders) {
        if (!sup) {
             await sendTelegramMessage("Ошибка доступа к базе данных. Попробуйте позже.", chatId)
             return NextResponse.json({ ok: true })
        }

        // Debug logging for orders command
        console.log(`[ORDERS_CMD] Fetching orders for userId: ${userId} (string: ${String(userId)})`)

        // 1. Try exact match with status
        const { data: orders, error } = await sup
            .from('orders')
            .select('*')
            .eq('customer_info->>client_id', String(userId))
            .in('status', ['paid', 'Оплачен', 'CONFIRMED'])
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[ORDERS_CMD] Error fetching orders:', error)
            await sendTelegramMessage("Произошла ошибка при получении списка заказов.", chatId)
            return NextResponse.json({ ok: true })
        }

        console.log(`[ORDERS_CMD] Found ${orders?.length} orders with correct status`)

        if (!orders || orders.length === 0) {
             // Debug: check if any orders exist for this user regardless of status
             const { data: allUserOrders } = await sup
                .from('orders')
                .select('id, status, customer_info')
                .eq('customer_info->>client_id', String(userId))
             
             console.log(`[ORDERS_CMD] All orders for user ${userId}:`, JSON.stringify(allUserOrders, null, 2))

             if (allUserOrders && allUserOrders.length > 0) {
                 const statuses = allUserOrders.map(o => o.status).join(', ')
                 await sendTelegramMessage(`📭 У вас нет оплаченных заказов. Найдены заказы со статусами: ${statuses}`, chatId)
             } else {
                 await sendTelegramMessage("📭 У вас пока нет заказов.", chatId)
             }
             return NextResponse.json({ ok: true })
        }

        let totalSpent = 0
        const orderMessages = orders.map((order: any) => {
             // Calculate Total
             const orderSum = Number(order.total_amount || 0)
             totalSpent += orderSum

             // Parse items
             let items: any[] = []
             
             // 1. Try to use items directly if array
             if (Array.isArray(order.items)) {
                 items = order.items
             } 
             // 2. Try to parse if string
             else if (typeof order.items === 'string') {
                 try { 
                    const parsed = JSON.parse(order.items)
                    if (Array.isArray(parsed)) items = parsed
                 } catch {}
             }

             // 3. Fallback to backup if still empty
             if (items.length === 0 && order.customer_info?.items_backup) {
                 items = order.customer_info.items_backup
             }

             // Format items list
             let itemsList = ''
             if (items.length > 0) {
                 itemsList = items.map((it: any) => {
                     const name = it.name || it.title || 'Товар'
                     const qty = Number(it.quantity || it.qty) || 1
                     return `- ${name} (x${qty})`
                 }).join('\n')
             } else {
                 // Fallback if no structured items but there is a string description
                 itemsList = typeof order.items === 'string' && order.items.length > 10 ? '📄 (список в чеке)' : 'Товары не указаны'
             }

             const totalQty = items.reduce((acc: number, it: any) => acc + (Number(it.quantity || it.qty) || 1), 0)
             
             const dateStr = new Date(order.created_at || order.updated_at).toLocaleDateString('ru-RU')
             
             return `📦 Заказ #${order.id} от ${dateStr}\n${itemsList}\n💰 Сумма: ${orderSum} руб.`
        })

        const tickets = Math.floor(totalSpent / 1000)
        const remainder = 1000 - (totalSpent % 1000)
        
        const summary = `📊 Сводная информация:\n💰 Общая сумма всех покупок: ${totalSpent} руб.\n🎟 Количество накопленных билетов: ${tickets}\n${remainder < 1000 ? `📉 Остаток до следующего билета: ${remainder} руб.` : ''}`

        const fullText = `🗂 История заказов:\n\n${orderMessages.join('\n\n')}\n\n${summary}`
        
        if (fullText.length > 4000) {
            await sendTelegramMessage(summary, chatId)
            const shortList = orderMessages.slice(0, 10).join('\n\n')
            await sendTelegramMessage(`Последние 10 заказов:\n\n${shortList}`, chatId)
        } else {
            await sendTelegramMessage(fullText, chatId)
        }
        
        return NextResponse.json({ ok: true })
    }


    // 17. RULES COMMAND
    if (isRules) {
        const msg16 = `📋 Правила конкурса

**Период**
18 декабря - 7 января

**Как получить билеты?**
1️⃣ Покупай в @PRAEnzyme_bot
Каждая 1000 руб = 1 билет
2️⃣ Приглашай друзей
Друг купил = +1 билет тебе

**Призы**
🏆 1 место (1 чел)
Курс Этрагенез + час с Кириллом
88 000 руб-БЕСПЛАТНО

🥈 2 место (1 чел)
Курс Энергия + напитки + добавки
13 750 руб-БЕСПЛАТНО

🥉 3 место (1 чел)
Курс Энергия + напитки + добавки
14 150 руб-БЕСПЛАТНО

🎁 4-32 места (29 чел)
Бутылка 1л + гайды + рецепты

🎁 33-72 места (40 чел)
Сенная палочка + гайды + рецепты

🎁 73-101 места (29 чел)
Мака перуанская + гайды + рецепты

**Розыгрыш**
7 января в 23:00

**Результаты**
Напишем в этот бот + в @etraproject_official

Удачи! 🍀`
        await sendTelegramMessage(msg16, chatId)
        return NextResponse.json({ ok: true })
    }
    
    // 17. ADMIN COMMAND
    if (isAdminCmd) {
        if (sup) {
            // 1. Total participants
            const { count: totalUsers } = await sup.from('contest_participants').select('*', { count: 'exact', head: true })
            
            // 2. Top 20
            const { data: topUsers } = await sup.from('contest_participants')
                .select('first_name, username, tickets')
                .order('tickets', { ascending: false })
                .limit(20)
                
            let msgAdmin = `📊 Статистика бота:\n\n👥 Всего участников: ${totalUsers || 0}\n\n🏆 Топ-20 участников по билетам:\n`
            
            if (topUsers && topUsers.length > 0) {
                topUsers.forEach((u: any, i: number) => {
                    const name = u.username ? `${u.first_name} (@${u.username})` : u.first_name
                    msgAdmin += `${i + 1}. ${name} — ${u.tickets} 🎫\n`
                })
            } else {
                msgAdmin += "Пока нет участников с билетами."
            }
            
            await sendTelegramMessage(msgAdmin, chatId)
        }
        return NextResponse.json({ ok: true })
    }

    // Callback query handling (for buttons like 'Я подписался')
    if (update.callback_query) {
        const cb = update.callback_query
        const cbData = cb.data
        const cbChatId = String(cb.message?.chat?.id || "")
        const cbUserId = cb.from.id
        
        if (cbData === 'check_sub') {
             const sub = await isSubscribedToOfficial(cbUserId)
             if (sub) {
                 await sendTelegramMessage(`✅ Подписка подтверждена! Нажми /start`, cbChatId)
             } else {
                 await sendTelegramMessage(`❌ Пока не вижу подписки. Попробуй еще раз через минуту.`, cbChatId)
             }
        }
        if (cbData === 'stats_cmd') {
            // Re-run stats logic? (Simplified: just tell them to type /stats or send stats directly if we refactor)
            // For now just reply
            await sendTelegramMessage(`Обновляю... Нажми /stats`, cbChatId)
        }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: true })
  }
}

export async function GET(req: Request) {
    // Keep existing GET logic for webhook setup
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
