import { defineMiddleware } from 'astro:middleware';

/**
 * Protege el panel interno (/admin y /api/admin) con usuario y contraseña
 * (HTTP Basic Auth). Las credenciales se leen de variables de entorno; si no
 * están puestas, usa las por defecto acordadas.
 */
const env = (k: string) => import.meta.env[k] ?? process.env[k] ?? '';
const ADMIN_USER = env('ADMIN_USER') || 'Admin-Jet%';
const ADMIN_PASSWORD = env('ADMIN_PASSWORD') || 'Jetweb2026%';

function unauthorized() {
  return new Response('Autenticación requerida', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Panel Costa Brava Rent Jet Ski", charset="UTF-8"' },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isProtected = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin');
  if (!isProtected) return next();

  const header = context.request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  const idx = decoded.indexOf(':');
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);

  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  return unauthorized();
});
