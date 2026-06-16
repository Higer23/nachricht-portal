// ─────────────────────────────────────────────────────────────
//  Mehrsprachiger Schimpfwort-Filter (DE / TR / EN)
//  - Normalisiert Leetspeak, Akzente, Wiederholungen & Trennzeichen
//  - Erkennt verschleierte Schreibweisen (z. B. "sch3iß3", "f.u.c.k")
//  - Liefert gefundene Begriffe + maskierten Text zurück
// ─────────────────────────────────────────────────────────────

const BAD_WORDS: string[] = [
  // ── Deutsch ──
  "arschloch",
  "arsch",
  "scheisse",
  "scheise",
  "scheis",
  "kacke",
  "fotze",
  "fick",
  "ficken",
  "wichser",
  "wixer",
  "hurensohn",
  "hure",
  "nutte",
  "schlampe",
  "bastard",
  "idiot",
  "vollidiot",
  "depp",
  "dummkopf",
  "trottel",
  "blödmann",
  "spast",
  "spasti",
  "missgeburt",
  "schwuchtel",
  "miststück",
  "pissen",
  "penner",
  // ── Türkisch ──
  "amk",
  "aq",
  "orospu",
  "piç",
  "pic",
  "yarrak",
  "yarak",
  "sik",
  "sikeyim",
  "siktir",
  "gavat",
  "kahpe",
  "götveren",
  "gotveren",
  "ananı",
  "anani",
  "amına",
  "amina",
  "oç",
  "oc",
  "salak",
  "gerizekalı",
  "mal",
  // ── Englisch ──
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "pussy",
  "motherfucker",
  "nigger",
  "faggot",
  "whore",
  "slut",
  "retard",
]

// Leetspeak / Sonderzeichen-Normalisierung.
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  $: "s",
  "!": "i",
  "+": "t",
  "€": "e",
  ß: "s",
  ä: "a",
  ö: "o",
  ü: "u",
  ç: "c",
  ğ: "g",
  ı: "i",
  ş: "s",
}

/** Reduziert einen String auf eine vergleichbare Grundform. */
function normalize(input: string): string {
  let out = input.toLowerCase()
  // Akzente entfernen.
  out = out.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  // Leetspeak ersetzen.
  out = out.replace(/[0134578@$!+€ßäöüçğış_]/g, (c) => LEET_MAP[c] ?? c)
  // Alles außer Buchstaben entfernen (Trennzeichen-Tricks aushebeln).
  out = out.replace(/[^a-z]/g, "")
  // Wiederholte Buchstaben zusammenfassen ("scheiiiiße" -> "scheise").
  out = out.replace(/(.)\1{2,}/g, "$1$1")
  return out
}

const NORMALIZED_BAD = Array.from(new Set(BAD_WORDS.map((w) => normalize(w)))).filter(
  Boolean,
)

export type ProfanityResult = {
  clean: boolean
  matches: string[]
}

/**
 * Prüft einen Text auf Schimpfwörter.
 * Vergleicht sowohl wortweise als auch im zusammenhängenden, normalisierten Text,
 * um verschleierte und getrennte Schreibweisen zu erkennen.
 */
export function checkProfanity(text: string): ProfanityResult {
  if (!text) return { clean: true, matches: [] }

  const collapsed = normalize(text)
  const tokens = text
    .toLowerCase()
    .split(/[^a-zA-Z0-9äöüçğışÄÖÜ@$!+]+/)
    .map((t) => normalize(t))
    .filter(Boolean)

  const found = new Set<string>()

  for (const bad of NORMALIZED_BAD) {
    // Sehr kurze Begriffe (<= 3) nur als ganzes Token werten -> weniger Fehlalarme.
    if (bad.length <= 3) {
      if (tokens.includes(bad)) found.add(bad)
    } else if (collapsed.includes(bad) || tokens.some((t) => t.includes(bad))) {
      found.add(bad)
    }
  }

  return { clean: found.size === 0, matches: Array.from(found) }
}

/** Ersetzt erkannte Schimpfwörter im Originaltext durch Sternchen. */
export function maskProfanity(text: string): string {
  if (!text) return text
  let result = text
  for (const bad of BAD_WORDS) {
    const escaped = bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // Erlaubt Trenn-/Sonderzeichen zwischen den Buchstaben.
    const pattern = escaped.split("").join("[^a-zA-ZäöüÄÖÜ]?")
    result = result.replace(new RegExp(pattern, "gi"), (m) => "*".repeat(m.length))
  }
  return result
}
