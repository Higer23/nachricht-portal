import type { Dictionary } from "./tr"

export const locales = ["de", "tr"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "de"

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case "tr":
      return (await import("./tr")).default
    case "de":
    default:
      return (await import("./de")).default
  }
}

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
