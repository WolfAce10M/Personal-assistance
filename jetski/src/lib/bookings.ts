/**
 * Lógica de reservas (servidor): disponibilidad, creación segura y emails.
 * El precio SIEMPRE se calcula aquí a partir de la fecha (temporada) y los
 * datos oficiales — nunca se confía en el importe que envía el navegador.
 */
import {
  findItem,
  seasonForDate,
  slotStarts,
  fmtTime,
  BUFFER_MIN,
  HOLD_MINUTES,
  MAX_DAYS_AHEAD,
  MAX_QTY,
  DEPOSIT_PER_UNIT,
  type Season,
} from '../data/booking';
import { db, hasDb, sendEmail, NOTIFY_EMAIL, SITE_URL } from './server';

export interface Quote {
  type: 'fleet' | 'route';
  itemId: string;
  itemName: string;
  day: string; // YYYY-MM-DD
  startMin: number;
  minutes: number;
  qty: number;
  season: Season;
  unitPrice: number;
  total: number;
  fuelIncluded: boolean;
}

export function parseDay(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + MAX_DAYS_AHEAD);
  if (d < today || d > max) return null;
  return d;
}

/** Valida la petición y calcula el presupuesto oficial. */
export function quote(input: {
  type: string;
  itemId: string;
  day: string;
  startMin: number;
  minutes: number;
  qty: number;
}): { quote?: Quote; error?: string } {
  const item = findItem(input.type, input.itemId);
  if (!item) return { error: 'ITEM_NOT_FOUND' };
  const d = parseDay(input.day);
  if (!d) return { error: 'BAD_DATE' };
  const season = seasonForDate(d);
  if (!season) return { error: 'SEASON_CLOSED' };
  const opt = item.options.find((o) => o.minutes === input.minutes);
  if (!opt) return { error: 'BAD_DURATION' };
  if (!slotStarts(opt.minutes).includes(input.startMin)) return { error: 'BAD_TIME' };
  const qty = Math.floor(input.qty);
  if (!(qty >= 1 && qty <= Math.min(MAX_QTY, item.capacity))) return { error: 'BAD_QTY' };
  const unitPrice = season === 'low' ? opt.low : opt.high;
  return {
    quote: {
      type: item.type,
      itemId: item.id,
      itemName: item.name,
      day: input.day,
      startMin: input.startMin,
      minutes: opt.minutes,
      qty,
      season,
      unitPrice,
      total: unitPrice * qty,
      fuelIncluded: opt.fuelIncluded,
    },
  };
}

/** Reservas activas de un artículo en un día (para pintar disponibilidad).
 *  Resiliente: si la lectura de la BD falla, devolvemos [] (huecos libres) para
 *  no bloquear la selección de hora. La reserva final sigue protegida por el
 *  bloqueo atómico de create_booking, así que nunca hay sobreventa. */
export async function activeBookings(itemId: string, day: string) {
  if (!hasDb()) return []; // modo demo: todo libre
  try {
    const { data, error } = await db()
      .from('bookings')
      .select('start_min,end_min,qty,status,expires_at')
      .eq('item_id', itemId)
      .eq('day', day)
      .in('status', ['confirmed', 'pending']);
    if (error) {
      console.error('availability DB read failed:', error.message);
      return [];
    }
    const now = Date.now();
    return (data ?? []).filter(
      (b) => b.status === 'confirmed' || (b.expires_at && Date.parse(b.expires_at) > now)
    );
  } catch (e) {
    console.error('availability DB exception:', e);
    return [];
  }
}

/** Huecos con su disponibilidad restante. */
export async function availability(itemId: string, day: string, minutes: number, capacity: number) {
  const rows = await activeBookings(itemId, day);
  return slotStarts(minutes).map((start) => {
    const end = start + minutes + BUFFER_MIN;
    const used = rows
      .filter((b) => b.start_min < end && b.end_min > start)
      .reduce((n, b) => n + b.qty, 0);
    return { start, time: fmtTime(start), free: Math.max(0, capacity - used) };
  });
}

/**
 * Crea la reserva de forma atómica vía RPC en Postgres (pg_advisory_xact_lock):
 * dos peticiones simultáneas del mismo hueco jamás se solapan.
 */
export async function createPending(q: Quote, customer: { name: string; email: string; phone: string; locale: string; notes?: string }) {
  const item = findItem(q.type, q.itemId)!;
  const endMin = q.startMin + q.minutes + BUFFER_MIN;
  if (!hasDb()) return { id: 'demo-' + Date.now().toString(36) }; // modo demo
  const { data, error } = await db().rpc('create_booking', {
    p_type: q.type,
    p_item_id: q.itemId,
    p_day: q.day,
    p_start_min: q.startMin,
    p_end_min: endMin,
    p_qty: q.qty,
    p_capacity: item.capacity,
    p_name: customer.name,
    p_email: customer.email,
    p_phone: customer.phone,
    p_locale: customer.locale,
    p_season: q.season,
    p_unit_price: q.unitPrice,
    p_total: q.total,
    p_notes: customer.notes ?? '',
    p_hold_minutes: HOLD_MINUTES,
  });
  if (error) {
    if (error.message.includes('SLOT_TAKEN')) return { error: 'SLOT_TAKEN' as const };
    throw new Error('DB: ' + error.message);
  }
  return { id: data as string };
}

export async function setStatus(id: string, status: 'confirmed' | 'expired' | 'cancelled', sessionId?: string) {
  if (!hasDb()) return;
  const patch: Record<string, unknown> = { status };
  if (sessionId) patch.stripe_session_id = sessionId;
  await db().from('bookings').update(patch).eq('id', id);
}

export async function getBooking(id: string) {
  if (!hasDb()) return null;
  const { data } = await db().from('bookings').select('*').eq('id', id).single();
  return data;
}

/** Lista de reservas para el panel de administración (más recientes primero). */
export async function listBookings(opts: { from?: string; status?: string } = {}) {
  if (!hasDb()) return [];
  let q = db()
    .from('bookings')
    .select('*')
    .order('day', { ascending: true })
    .order('start_min', { ascending: true })
    .limit(500);
  if (opts.from) q = q.gte('day', opts.from);
  if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) {
    console.error('listBookings failed:', error.message);
    return [];
  }
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Emails de confirmación (idioma del cliente)                         */
/* ------------------------------------------------------------------ */
const M: Record<string, Record<string, string>> = {
  es: {
    subject: 'Reserva confirmada — Costa Brava Rent Jet Ski',
    title: '¡Reserva confirmada!',
    intro: 'Gracias por tu reserva. Te esperamos en nuestra base:',
    where: 'Avinguda Port Salines, 41 · 17480 Roses (Girona)',
    bring: 'Recuerda traer DNI/pasaporte. La fianza se deposita en la base y se devuelve al entregar la moto en buen estado.',
    date: 'Fecha', time: 'Hora', item: 'Reserva', qty: 'Motos', total: 'Total pagado',
    season_low: 'Temporada baja', season_high: 'Temporada alta',
  },
  ca: {
    subject: 'Reserva confirmada — Costa Brava Rent Jet Ski',
    title: 'Reserva confirmada!',
    intro: 'Gràcies per la teva reserva. T’esperem a la nostra base:',
    where: 'Avinguda Port Salines, 41 · 17480 Roses (Girona)',
    bring: 'Recorda portar DNI/passaport. La fiança es diposita a la base i es retorna en lliurar la moto en bon estat.',
    date: 'Data', time: 'Hora', item: 'Reserva', qty: 'Motos', total: 'Total pagat',
    season_low: 'Temporada baixa', season_high: 'Temporada alta',
  },
  fr: {
    subject: 'Réservation confirmée — Costa Brava Rent Jet Ski',
    title: 'Réservation confirmée !',
    intro: 'Merci pour votre réservation. Rendez-vous à notre base :',
    where: 'Avinguda Port Salines, 41 · 17480 Roses (Gérone)',
    bring: 'Pensez à apporter une pièce d’identité. La caution se dépose à la base et est rendue au retour du jet-ski en bon état.',
    date: 'Date', time: 'Heure', item: 'Réservation', qty: 'Jet-skis', total: 'Total payé',
    season_low: 'Basse saison', season_high: 'Haute saison',
  },
  de: {
    subject: 'Buchung bestätigt — Costa Brava Rent Jet Ski',
    title: 'Buchung bestätigt!',
    intro: 'Danke für deine Buchung. Wir erwarten dich an unserer Basis:',
    where: 'Avinguda Port Salines, 41 · 17480 Roses (Girona), Spanien',
    bring: 'Bitte Ausweis/Reisepass mitbringen. Die Kaution wird an der Basis hinterlegt und bei Rückgabe in gutem Zustand erstattet.',
    date: 'Datum', time: 'Uhrzeit', item: 'Buchung', qty: 'Jetskis', total: 'Bezahlt',
    season_low: 'Nebensaison', season_high: 'Hochsaison',
  },
  nl: {
    subject: 'Boeking bevestigd — Costa Brava Rent Jet Ski',
    title: 'Boeking bevestigd!',
    intro: 'Bedankt voor je boeking. We verwachten je bij onze basis:',
    where: 'Avinguda Port Salines, 41 · 17480 Roses (Girona), Spanje',
    bring: 'Neem je ID/paspoort mee. De borg betaal je bij de basis en krijg je terug bij inlevering in goede staat.',
    date: 'Datum', time: 'Tijd', item: 'Boeking', qty: 'Jetski’s', total: 'Betaald',
    season_low: 'Laagseizoen', season_high: 'Hoogseizoen',
  },
  en: {
    subject: 'Booking confirmed — Costa Brava Rent Jet Ski',
    title: 'Booking confirmed!',
    intro: 'Thanks for your booking. See you at our base:',
    where: 'Avinguda Port Salines, 41 · 17480 Roses (Girona), Spain',
    bring: 'Remember to bring your ID/passport. The deposit is paid at the base and refunded when the jet ski is returned in good condition.',
    date: 'Date', time: 'Time', item: 'Booking', qty: 'Jet skis', total: 'Total paid',
    season_low: 'Low season', season_high: 'High season',
  },
};

const M2: Record<string, { activity: string; paid: string; rest: string }> = {
  es: { activity: 'Total actividad', paid: 'Pagado ahora (depósito)', rest: 'Resto en la base' },
  ca: { activity: 'Total activitat', paid: 'Pagat ara (dipòsit)', rest: 'Resta a la base' },
  fr: { activity: 'Total activité', paid: 'Payé (acompte)', rest: 'Reste à la base' },
  de: { activity: 'Gesamt Aktivität', paid: 'Bezahlt (Anzahlung)', rest: 'Rest an der Basis' },
  nl: { activity: 'Totaal activiteit', paid: 'Betaald (aanbetaling)', rest: 'Rest bij de basis' },
  en: { activity: 'Activity total', paid: 'Paid now (deposit)', rest: 'Rest at the base' },
};

function bookingHtml(b: Record<string, string | number>, locale: string) {
  const t = M[locale] ?? M.es;
  const t2 = M2[locale] ?? M2.es;
  const qty = Number(b.qty) || 1;
  const total = Number(b.total) || 0;
  const deposit = DEPOSIT_PER_UNIT * qty;
  const remaining = Math.max(0, total - deposit);
  const row = (k: string, v: string | number) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#666">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <div style="background:#0a0d10;border-radius:14px;padding:22px 26px;color:#fff">
      <span style="color:#fff;font-weight:800;font-style:italic">COSTA BRAVA</span>
      <span style="color:#ec5f1a;font-weight:800;font-style:italic"> RENT JET SKI</span>
    </div>
    <h1 style="font-size:22px;margin:22px 0 6px">${t.title}</h1>
    <p style="margin:0 0 14px;color:#444">${t.intro}<br><strong>${t.where}</strong></p>
    <table style="border-collapse:collapse;font-size:15px">
      ${row(t.item, String(b.item))}
      ${row(t.date, String(b.day))}
      ${row(t.time, String(b.time))}
      ${row(t.qty, String(b.qty))}
      ${row('—', b.season === 'low' ? t.season_low : t.season_high)}
      ${row(t2.activity, `${total} €`)}
      ${row(t2.paid, `<span style="color:#0a8a0a">${deposit} €</span>`)}
      ${row(t2.rest, `${remaining} €`)}
    </table>
    <p style="margin:18px 0 6px;color:#444">${t.bring}</p>
    <p style="color:#888;font-size:13px">WhatsApp: +34 675 363 023 · ${SITE_URL}</p>
  </div>`;
}

/** Envía los correos de una reserva confirmada (cliente + negocio). */
export async function sendConfirmationEmails(b: {
  item: string; day: string; time: string; qty: number; total: number; season: string;
  name: string; email: string; phone: string; locale: string; id: string;
}) {
  const t = M[b.locale] ?? M.es;
  await sendEmail(b.email, t.subject, bookingHtml(b, b.locale));
  if (NOTIFY_EMAIL) {
    await sendEmail(
      NOTIFY_EMAIL,
      `🛥 Nueva reserva: ${b.item} — ${b.day} ${b.time} (${b.qty}u, ${b.total}€)`,
      `<div style="font-family:Arial;font-size:15px">
        <h2>Nueva reserva pagada</h2>
        <p><strong>${b.item}</strong><br>${b.day} · ${b.time} · ${b.qty} moto(s) · ${b.total}€ (${b.season})</p>
        <p>Cliente: ${b.name}<br>Email: ${b.email}<br>Teléfono: ${b.phone}<br>Idioma: ${b.locale}</p>
        <p>ID reserva: ${b.id}</p>
      </div>`
    );
  }
}
