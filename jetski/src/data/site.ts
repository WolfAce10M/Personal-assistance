/**
 * Información del negocio — fuente única de verdad (NAP para SEO local).
 * Editando aquí se actualiza toda la web.
 */
export const SITE = {
  name: 'Costa Brava Rent Jet Ski',
  legalName: 'Costa Brava Rent Jet Ski',
  tagline: 'Alquiler de motos acuáticas',
  domain: 'https://www.costabravarentjetski.com',

  // Contacto
  phonePrimary: '+34675363023',
  phonePrimaryDisplay: '+34 675 363 023',
  phoneSecondary: '+34671971660',
  phoneSecondaryDisplay: '+34 671 971 660',
  whatsapp: '34675363023', // formato wa.me (sin +)
  email: 'info@costabravarentjetski.com',

  // Ubicación (NAP)
  address: {
    street: 'Avinguda Port Salines, 41',
    postalCode: '17480',
    city: 'Roses',
    region: 'Girona',
    country: 'ES',
    // Coordenadas aproximadas del puerto (Port Salins, Empuriabrava/Roses).
    // Ajustar con la ubicación exacta si hace falta para el mapa.
    lat: 42.2489,
    lng: 3.1265,
  },

  // Redes sociales
  social: {
    instagram: 'https://www.instagram.com/costabravarentjetski',
    tiktok: 'https://www.tiktok.com/@costabravarentjetski',
  },
} as const;

/** Enlace directo a WhatsApp con mensaje pre-rellenado por idioma. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Enlace tel: */
export const telLink = `tel:${SITE.phonePrimary}`;
