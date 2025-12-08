const { Telegraf, Markup } = require('telegraf')
require('dotenv').config()

const token = process.env.TELEGRAM_BOT_TOKEN
const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000/'

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required')
  process.exit(1)
}

const bot = new Telegraf(token)

const keyboard = Markup.inlineKeyboard([
  [Markup.button.webApp('Открыть магазин', webAppUrl)],
  [Markup.button.url('Открыть в браузере', webAppUrl)],
])

bot.start((ctx) => ctx.reply('Добро пожаловать! Откройте веб-приложение:', keyboard))
bot.command('shop', (ctx) => ctx.reply('Магазин доступен по кнопке:', keyboard))

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
