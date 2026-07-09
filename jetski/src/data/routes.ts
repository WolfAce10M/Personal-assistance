/**
 * Rutas guiadas SIN LICENCIA — "Descubre lugares únicos".
 * Gasolina incluida en todas. Fianza (depósito reembolsable): 200€.
 * Ordenadas de menor a mayor duración/distancia.
 */
export interface Route {
  id: string;
  /** nombre del destino (topónimo, no se traduce) */
  name: string;
  minutes: number;
  low: number; // temporada baja €
  high: number; // temporada alta €
  /** clave i18n para la descripción del recorrido */
  descKey: string;
  /** posición aproximada del pin en el mapa esquemático (0-100 en X/Y) */
  pin: { x: number; y: number };
}

export const DEPOSIT_NO_LICENSE = 200;

export const ROUTES: Route[] = [
  {
    id: 'almadrava',
    name: 'Almadrava',
    minutes: 40,
    low: 70,
    high: 80,
    descKey: 'routes.almadrava.desc',
    pin: { x: 30, y: 82 },
  },
  {
    id: 'cala-montjoi',
    name: 'Cala Montjoi',
    minutes: 70,
    low: 120,
    high: 145,
    descKey: 'routes.montjoi.desc',
    pin: { x: 46, y: 64 },
  },
  {
    id: 'cadaques',
    name: 'Cadaqués',
    minutes: 100,
    low: 190,
    high: 210,
    descKey: 'routes.cadaques.desc',
    pin: { x: 66, y: 42 },
  },
  {
    id: 'cap-de-creus',
    name: 'Cap de Creus',
    minutes: 130,
    low: 240,
    high: 260,
    descKey: 'routes.capdecreus.desc',
    pin: { x: 82, y: 22 },
  },
];
