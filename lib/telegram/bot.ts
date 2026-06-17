import { Bot, Context } from 'grammy'

let bot: Bot | null = null

export function getBot(): Bot {
  if (!bot) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set')
    }
    bot = new Bot(process.env.TELEGRAM_BOT_TOKEN)
  }
  return bot
}

export async function sendTelegramMessage(
  chatId: string | number,
  message: string,
  options?: { parse_mode?: 'HTML' | 'Markdown' }
) {
  const b = getBot()
  await b.api.sendMessage(chatId, message, options)
}

export async function sendDailyBriefing(
  chatId: string | number,
  briefing: {
    date: string
    summary: string
    topTasks: string[]
    nextEvent?: string
    training?: string
  }
) {
  const taskList = briefing.topTasks
    .slice(0, 5)
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n')

  const message = `📅 <b>${briefing.date}</b>

${briefing.summary}

<b>🎯 Tareas prioritarias:</b>
${taskList || 'Sin tareas pendientes'}

${briefing.nextEvent ? `<b>📌 Próximo evento:</b>\n${briefing.nextEvent}` : ''}

${briefing.training ? `<b>💪 Entrenamiento:</b>\n${briefing.training}` : ''}`

  await sendTelegramMessage(chatId, message, { parse_mode: 'HTML' })
}

export async function sendReminder(
  chatId: string | number,
  reminder: { title: string; description?: string; emoji?: string }
) {
  const emoji = reminder.emoji ?? '⏰'
  const message = `${emoji} <b>Recordatorio</b>

${reminder.title}${reminder.description ? `\n\n${reminder.description}` : ''}`

  await sendTelegramMessage(chatId, message, { parse_mode: 'HTML' })
}
