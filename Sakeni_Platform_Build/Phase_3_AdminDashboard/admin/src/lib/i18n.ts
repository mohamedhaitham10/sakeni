import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Locale = "en" | "ar";

const dictionaries = { en, ar } as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}

export type Dictionary = ReturnType<typeof getDictionary>;
