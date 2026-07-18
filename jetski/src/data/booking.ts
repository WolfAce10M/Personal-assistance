/**
 * Configuración del sistema de reservas — TODO editable aquí.
 */
import { FLEET } from './fleet';
import { ROUTES } from './routes';

/** Horario de actividad (minutos desde medianoche). 09:30 → 20:00 */
export const OPEN_MIN = 9 * 60 + 30;
export const CLOSE_MIN = 20 * 60;
/** Paso entre horas de salida ofrecidas */
export const SLOT_STEP_MIN = 30;
/** Margen entre alquileres (repostaje / entrega) que bloquea la moto */
export const BUFFER_MIN = 20;
/** Nº de motos disponibles para rutas guiadas por salida (toda la flota) */
export const ROUTE_CAPACITY = 11;
/** Máximo de motos por reserva (el tope real lo marca el nº de unidades de cada modelo) */
export const MAX_QTY = 11;
/** Minutos que se retiene el hueco mientras el cliente paga */
export const HOLD_MINUTES = 30;
/** Con cuántos días de antelación se puede reservar */
export const MAX_DAYS_AHEAD = 120;

/**
 * Temporadas (mes/día, aplican cada año):
 * baja  = 01/05–31/05 y 01/09–31/10 · alta = 01/06–31/08
 * Fuera de esos rangos la temporada está cerrada (no se puede reservar online).
 */
export type Season = 'low' | 'high';

export function seasonForDate(d: Date): Season | null {
  const m = d.getMonth() + 1;
  if (m === 5 || m === 9 || m === 10) return 'low';
  if (m >= 6 && m <= 8) return 'high';
  return null; // temporada cerrada
}

export interface BookableItem {
  type: 'fleet' | 'route';
  id: string;
  name: string;
  capacity: number;
  /** duraciones posibles con su precio por temporada (por moto) */
  options: { minutes: number; low: number; high: number; fuelIncluded: boolean }[];
}

export function getBookableItems(): BookableItem[] {
  const fleet: BookableItem[] = FLEET.map((j) => ({
    type: 'fleet',
    id: j.id,
    name: `${j.brand} ${j.model} · ${j.power} CV`,
    capacity: j.units,
    options: j.prices.map((p) => ({
      minutes: p.minutes,
      low: p.low,
      high: p.high,
      fuelIncluded: p.fuelIncluded,
    })),
  }));
  const routes: BookableItem[] = ROUTES.map((r) => ({
    type: 'route',
    id: r.id,
    name: r.name,
    capacity: ROUTE_CAPACITY,
    options: [{ minutes: r.minutes, low: r.low, high: r.high, fuelIncluded: true }],
  }));
  return [...fleet, ...routes];
}

export function findItem(type: string, id: string): BookableItem | undefined {
  return getBookableItems().find((i) => i.type === type && i.id === id);
}

/** Huecos de salida posibles para una duración dada (minutos desde medianoche). */
export function slotStarts(durationMin: number): number[] {
  const out: number[] = [];
  for (let t = OPEN_MIN; t + durationMin <= CLOSE_MIN; t += SLOT_STEP_MIN) out.push(t);
  return out;
}

export const fmtTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
