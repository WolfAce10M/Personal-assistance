/**
 * Flota de motos acuáticas (modalidad CON LICENCIA).
 * Precios en € oficiales. Motos nuevas 2026. Duraciones: 60'+10' y 120'+10' de regalo.
 * Temporada baja: 01/05–31/05 y 01/09–31/10 · Alta: 01/06–31/08.
 * Fianza (depósito reembolsable): 500€.
 */
export interface JetSkiPrice {
  minutes: number;
  low: number; // temporada baja €
  high: number; // temporada alta €
  fuelIncluded: boolean;
}

export interface JetSki {
  id: string;
  brand: string;
  model: string;
  power: number; // CV
  seats: number;
  units: number;
  /** clave i18n para el titular corto de personalidad del modelo */
  tagKey: string;
  /** nivel 1-3 (relax → adrenalina) para pintar el medidor */
  thrill: 1 | 2 | 3;
  prices: JetSkiPrice[];
  image: string; // ruta en /public/images
}

export const DEPOSIT_LICENSE = 500;

export const FLEET: JetSki[] = [
  {
    id: 'spark-trixx',
    brand: 'Sea-Doo',
    model: 'Spark Trixx 3-up',
    power: 90,
    seats: 3,
    units: 1,
    tagKey: 'fleet.spark.tag',
    thrill: 1,
    image: '/images/fleet/spark-trixx.webp',
    prices: [
      { minutes: 70, low: 115, high: 120, fuelIncluded: true },
      { minutes: 130, low: 195, high: 205, fuelIncluded: true },
    ],
  },
  {
    id: 'gtx-pro',
    brand: 'Sea-Doo',
    model: 'GTX Pro',
    power: 130,
    seats: 3,
    units: 6,
    tagKey: 'fleet.gtxpro.tag',
    thrill: 2,
    image: '/images/fleet/gtx-pro.webp',
    prices: [
      { minutes: 70, low: 120, high: 140, fuelIncluded: true },
      { minutes: 130, low: 220, high: 240, fuelIncluded: true },
    ],
  },
  {
    id: 'gtx',
    brand: 'Sea-Doo',
    model: 'GTX',
    power: 170,
    seats: 3,
    units: 3,
    tagKey: 'fleet.gtx.tag',
    thrill: 2,
    image: '/images/fleet/gtx.webp',
    prices: [
      { minutes: 70, low: 140, high: 160, fuelIncluded: true },
      { minutes: 130, low: 260, high: 280, fuelIncluded: true },
    ],
  },
  {
    id: 'rxt-x',
    brand: 'Sea-Doo',
    model: 'RXT-X',
    power: 300,
    seats: 3,
    units: 1,
    tagKey: 'fleet.rxtx.tag',
    thrill: 3,
    image: '/images/fleet/rxt-x.webp',
    prices: [
      { minutes: 70, low: 200, high: 220, fuelIncluded: false },
      { minutes: 130, low: 400, high: 420, fuelIncluded: false },
    ],
  },
];

/** Precio "desde" más bajo de toda la flota (para el hero / CTA). */
export const PRICE_FROM = Math.min(...FLEET.flatMap((j) => j.prices.map((p) => p.low)));
