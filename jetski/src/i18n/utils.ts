import { ui, DEFAULT_LANG, LANGUAGES, type Lang, type UIKey } from './ui';

/** Devuelve una función de traducción `t()` para el idioma dado. */
export function useTranslations(lang: Lang) {
  return function t(key: UIKey, vars?: Record<string, string | number>): string {
    let str: string = ui[lang][key] ?? ui[DEFAULT_LANG][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };
}

/** Extrae el idioma del pathname de Astro (Astro.currentLocale ya lo hace, esto es respaldo). */
export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split('/');
  if (seg in LANGUAGES && seg !== DEFAULT_LANG) return seg as Lang;
  return DEFAULT_LANG;
}

/**
 * Construye una ruta con el prefijo de idioma correcto.
 * es (por defecto) no lleva prefijo → '/'; el resto sí → '/ca', '/fr', '/en'.
 */
export function localizedPath(lang: Lang, path = ''): string {
  const clean = path.replace(/^\/+/, '');
  const base = lang === DEFAULT_LANG ? '' : `/${lang}`;
  return `${base}/${clean}`.replace(/\/+$/, '') || '/';
}

/** Lista de idiomas con su URL equivalente para el conmutador y los hreflang. */
export function getAlternateLinks(currentPath: string) {
  // currentPath sin prefijo de idioma (parte "lógica" de la ruta)
  return (Object.keys(LANGUAGES) as Lang[]).map((lang) => ({
    lang,
    label: LANGUAGES[lang],
    href: localizedPath(lang, currentPath),
    // hreflang usa 'ca' etc.; para es usamos 'es'
    hreflang: lang,
  }));
}

export { LANGUAGES, DEFAULT_LANG, type Lang };
