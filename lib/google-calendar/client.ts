import { google } from 'googleapis'
import { CalendarEvent } from '@/types'

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    prompt: 'consent',
  })
}

export async function getCalendarClient(tokens: {
  access_token: string
  refresh_token?: string
}) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function listEvents(
  tokens: { access_token: string; refresh_token?: string },
  options: {
    timeMin?: string
    timeMax?: string
    maxResults?: number
    calendarId?: string
  } = {}
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(tokens)
  const {
    timeMin = new Date().toISOString(),
    timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults = 50,
    calendarId = 'primary',
  } = options

  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (response.data.items ?? []).map((event) => ({
    id: event.id ?? '',
    google_event_id: event.id ?? undefined,
    title: event.summary ?? 'Sin título',
    description: event.description ?? undefined,
    start_time: event.start?.dateTime ?? event.start?.date ?? '',
    end_time: event.end?.dateTime ?? event.end?.date ?? '',
    is_protected: false,
    is_all_day: !event.start?.dateTime,
    location: event.location ?? undefined,
    calendar_id: calendarId,
    created_at: event.created ?? new Date().toISOString(),
    updated_at: event.updated ?? new Date().toISOString(),
  }))
}

export async function createEvent(
  tokens: { access_token: string; refresh_token?: string },
  event: {
    title: string
    description?: string
    start: string
    end: string
    location?: string
    calendarId?: string
  }
) {
  const calendar = await getCalendarClient(tokens)
  const response = await calendar.events.insert({
    calendarId: event.calendarId ?? 'primary',
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start },
      end: { dateTime: event.end },
    },
  })
  return response.data
}

export async function updateEvent(
  tokens: { access_token: string; refresh_token?: string },
  eventId: string,
  updates: {
    title?: string
    description?: string
    start?: string
    end?: string
    location?: string
    calendarId?: string
  }
) {
  const calendar = await getCalendarClient(tokens)
  const response = await calendar.events.patch({
    calendarId: updates.calendarId ?? 'primary',
    eventId,
    requestBody: {
      summary: updates.title,
      description: updates.description,
      location: updates.location,
      start: updates.start ? { dateTime: updates.start } : undefined,
      end: updates.end ? { dateTime: updates.end } : undefined,
    },
  })
  return response.data
}

export async function deleteEvent(
  tokens: { access_token: string; refresh_token?: string },
  eventId: string,
  calendarId = 'primary'
) {
  const calendar = await getCalendarClient(tokens)
  await calendar.events.delete({ calendarId, eventId })
}
