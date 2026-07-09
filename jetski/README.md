# Costa Brava Rent Jet Ski — Web

Web hiperprofesional para el alquiler de motos de agua en Roses / Empuriabrava.
Construida con **Astro + Tailwind CSS**, animaciones de scroll con **GSAP + ScrollTrigger**
y scroll suave con inercia con **Lenis**. Multiidioma: **español (por defecto), català, français, english**.

> Estado actual: **solo la HOME**. Sin reservas ni pagos todavía (los CTA van a WhatsApp/teléfono).

---

## 🚀 Cómo arrancarla en tu ordenador

Necesitas [Node.js](https://nodejs.org) 18 o superior instalado. Luego, en una terminal
dentro de esta carpeta (`jetski/`):

```bash
npm install      # solo la primera vez: instala todo
npm run dev      # arranca en http://localhost:4321
```

Abre `http://localhost:4321` en el navegador. Cada cambio que guardes se ve al instante.

Otros comandos:

```bash
npm run build    # genera la web final optimizada en la carpeta dist/
npm run preview  # previsualiza esa versión final
```

---

## 🌍 Idiomas y URLs

- Español (por defecto): `/`
- Català: `/ca`
- Français: `/fr`
- English: `/en`

Todos los textos están en **`src/i18n/ui.ts`**. Si quieres corregir una palabra,
búscala ahí: verás las 4 versiones juntas.

---

## 🖼️ Qué material tienes que darme (y dónde va)

### 1. Vídeo del hero (la cabecera)
Ahora hay un fondo animado de "mar nocturno" como placeholder. Para poner tu vídeo:

1. Guarda el vídeo optimizado en `public/videos/` (ideal: `hero.webm` **y** `hero.mp4`,
   máx. ~1080p, 8-12 s en bucle, sin sonido, bien comprimido para que pese poco).
2. Añade una imagen de portada en `public/images/hero-poster.jpg`.
3. En `src/components/sections/Hero.astro` sustituye el bloque `.hero-placeholder`
   por el `<video>` que ya está indicado en un comentario dentro del propio archivo.

### 2. Fotos de la flota
Una foto por modelo, recortada 4:3, fondo limpio. Guárdalas como:

- `public/images/fleet/spark-trixx.webp`
- `public/images/fleet/gtx-pro.webp`
- `public/images/fleet/gtx.webp`
- `public/images/fleet/rxt-x.webp`

Luego, en `src/components/sections/Fleet.astro`, descomenta el `<img>` que ya está
preparado (hay un comentario que lo indica).

### 3. (Opcional) Efecto "moto 360°" tipo Apple
Si quieres que una moto **rote al hacer scroll**, necesito una **secuencia de imágenes**
(60-120 fotogramas de la moto girando sobre sí misma, mismo encuadre, mismo fondo, misma luz).
Guárdalas como `public/images/spin/jet_001.webp`, `jet_002.webp`, … El motor ya está
programado (`initSpin360` en `src/scripts/animations.ts`); solo hay que colocar el canvas
en la página y apuntar a esas imágenes. Avísame y lo monto.

### 4. Imagen para compartir en redes (Open Graph)
`public/og/og-cover.jpg` (1200×630 px). Es la imagen que sale al pegar el enlace en
WhatsApp, Facebook, etc.

---

## 📞 Reservas: de WhatsApp al sistema propio

Hoy los botones "Reservar" abren **WhatsApp** con un mensaje ya escrito, y "Llamar"
abre el teléfono. Los datos de contacto están centralizados en **`src/data/site.ts`**
(teléfono, WhatsApp, dirección, redes). Cambiando ahí se actualiza toda la web.

Cuando montemos el **sistema de reservas**, solo habrá que cambiar el destino de esos
botones — la estructura ya está preparada para ello.

---

## 💰 Precios y flota

Todos los precios y modelos salen del folleto 2025-26 y están en:

- `src/data/fleet.ts` — motos con licencia (modelos, CV, plazas, precios, fianza 500 €)
- `src/data/routes.ts` — rutas sin licencia (Almadrava, Cala Montjoi, Cadaqués, Cap de Creus, fianza 200 €)

Si cambian los precios, se editan ahí y se actualizan la sección de flota, la de rutas
y la tabla de precios a la vez.

---

## ⚡ Rendimiento y SEO (lo que NO se sacrifica)

- Web **estática** (HTML puro): carga muy rápida, sobre todo en móvil.
- Animaciones **dosificadas** y desactivadas en móvil donde penalizan (parallax).
- Respeta "reducir movimiento" del sistema (accesibilidad).
- **SEO local**: datos estructurados `LocalBusiness`, `FAQPage`, etiquetas hreflang
  para los 4 idiomas, sitemap automático, Open Graph.
