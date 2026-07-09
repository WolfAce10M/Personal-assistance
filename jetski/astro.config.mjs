// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// Sitio en producción — cámbialo por tu dominio real cuando lo subas.
const SITE = 'https://www.costabravarentjetski.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // i18n nativo de Astro. Español por defecto SIN prefijo en la raíz (/),
  // el resto de idiomas con prefijo (/ca, /fr, /en).
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'ca', 'fr', 'en'],
    routing: {
      prefixDefaultLocale: false, // '/' sirve español; '/ca', '/fr', '/en' el resto
      redirectToDefaultLocale: false,
    },
  },
  // Adaptador Vercel: la web se despliega en vercel.com conectando el repo
  // de GitHub. Las páginas siguen siendo estáticas y rapidísimas; las rutas
  // /api/* del sistema de reservas corren como funciones serverless.
  adapter: vercel(),
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', ca: 'ca-ES', fr: 'fr-FR', en: 'en' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
