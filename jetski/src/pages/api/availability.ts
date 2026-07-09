/**
 * GET /api/availability?type=fleet&item=gtx-pro&day=2026-07-20&minutes=70
 * Devuelve los huecos del día con las unidades libres de cada uno.
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { findItem, seasonForDate } from '../../data/booking';
import { availability, parseDay } from '../../lib/bookings';
import { hasDb } from '../../lib/server';

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get('type') ?? '';
  const itemId = url.searchParams.get('item') ?? '';
  const day = url.searchParams.get('day') ?? '';
  const minutes = Number(url.searchParams.get('minutes'));

  const item = findItem(type, itemId);
  const d = parseDay(day);
  if (!item || !d || !item.options.some((o) => o.minutes === minutes)) {
    return json({ error: 'BAD_REQUEST' }, 400);
  }
  const season = seasonForDate(d);
  if (!season) return json({ error: 'SEASON_CLOSED', slots: [] });

  try {
    const slots = await availability(itemId, day, minutes, item.capacity);
    return json({ season, capacity: item.capacity, demo: !hasDb(), slots });
  } catch (e) {
    console.error(e);
    return json({ error: 'SERVER_ERROR' }, 500);
  }
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
