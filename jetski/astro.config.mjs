// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

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
