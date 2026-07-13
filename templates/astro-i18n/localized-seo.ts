export const defaultLocale = "en-US";
export const locales = [defaultLocale, "es"] as const;
export type Locale = typeof locales[number];

export const localeRoutes = {
  home: {
    "en-US": "/",
    es: "/es/"
  },
  about: {
    "en-US": "/about/",
    es: "/es/acerca/"
  }
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof localeRoutes;

export function localizedSeo(route: RouteKey, locale: Locale, site: URL | string) {
  const routes = localeRoutes[route];
  const base = new URL(site);
  const canonical = new URL(routes[locale], base);
  const alternates: Array<{ hreflang: string; href: URL }> = locales.map((language) => ({
    hreflang: language,
    href: new URL(routes[language], base)
  }));
  alternates.push({
    hreflang: "x-default",
    href: new URL(routes[defaultLocale], base)
  });
  return { canonical, alternates };
}
