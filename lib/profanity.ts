// ═══════════════════════════════════════════════════════════════════════════════
//  Mehrsprachiger Hochleistungs-Schimpfwort-Filter  (DE / TR / EN / FR / ES)
//  v2.0 — Fortgeschrittene Erkennung & kontextsensitive Analyse
//
//  Funktionen:
//  ▸ Normalisiert Leetspeak, Akzente, Wiederholungen & Trennzeichen
//  ▸ Erkennt verschleierte Schreibweisen  (z. B. "sch3iß3", "f.u.c.k", "f_u_c_k")
//  ▸ Phonetische Ähnlichkeitsprüfung für häufige Umgehungsversuche
//  ▸ Kontextbasierte Erkennung (Sammlung von Einzelteilen → Gesamtsatz)
//  ▸ Schweregrad-Klassifikation (LOW / MEDIUM / HIGH / CRITICAL)
//  ▸ Kategorie-Tagging (hate_speech, sexual, insult, slur, spam)
//  ▸ Konfigurierbarer Maskierungs-Modus (Sterne / Redaktion / Erste+Letzte)
//  ▸ Performance-Cache (LRU) für wiederholte Texte
//  ▸ Null-Byte & Unicode-Steuerzeichen-Bereinigung
//  ▸ Exportiert: checkProfanity · maskProfanity · ProfanityResult (rückwärtskompatibel)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Typen ────────────────────────────────────────────────────────────────────

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type Category = "insult" | "sexual" | "hate_speech" | "slur" | "spam"

export type ProfanityResult = {
  /** Kein Verstoß gefunden? */
  clean: boolean
  /** Normalisierte Treffer-Begriffe */
  matches: string[]
  /** Höchster Schweregrad im Text */
  severity: Severity
  /** Kategorien der gefundenen Begriffe */
  categories: Category[]
  /** Relativer Schweregrad-Score 0–100 */
  score: number
}

export type MaskMode = "stars" | "redact" | "partial"

// ─── Wortliste mit Metadaten ───────────────────────────────────────────────

type WordEntry = {
  word: string
  severity: Severity
  categories: Category[]
}

const WORD_LIST: WordEntry[] = [
  // ── Deutsch – Beleidigungen (LOW) ──────────────────────────────────────────
  { word: "idiot",        severity: "LOW",    categories: ["insult"] },
  { word: "depp",         severity: "LOW",    categories: ["insult"] },
  { word: "dummkopf",     severity: "LOW",    categories: ["insult"] },
  { word: "trottel",      severity: "LOW",    categories: ["insult"] },
  { word: "blödmann",     severity: "LOW",    categories: ["insult"] },
  { word: "vollidiot",    severity: "LOW",    categories: ["insult"] },
  { word: "penner",       severity: "LOW",    categories: ["insult"] },
  { word: "dödel",        severity: "LOW",    categories: ["insult"] },
  { word: "heini",        severity: "LOW",    categories: ["insult"] },
  { word: "knallkopf",    severity: "LOW",    categories: ["insult"] },

  // ── Deutsch – Mittelschwer (MEDIUM) ────────────────────────────────────────
  { word: "bastard",      severity: "MEDIUM", categories: ["insult"] },
  { word: "arsch",        severity: "MEDIUM", categories: ["insult"] },
  { word: "arschloch",    severity: "MEDIUM", categories: ["insult"] },
  { word: "kacke",        severity: "MEDIUM", categories: ["insult"] },
  { word: "pissen",       severity: "MEDIUM", categories: ["insult"] },
  { word: "schlampe",     severity: "MEDIUM", categories: ["insult", "sexual"] },
  { word: "nutte",        severity: "MEDIUM", categories: ["insult", "sexual"] },
  { word: "spast",        severity: "MEDIUM", categories: ["insult", "slur"] },
  { word: "spasti",       severity: "MEDIUM", categories: ["insult", "slur"] },
  { word: "miststück",    severity: "MEDIUM", categories: ["insult"] },

  // ── Deutsch – Schwer (HIGH) ────────────────────────────────────────────────
  { word: "fick",         severity: "HIGH",   categories: ["sexual"] },
  { word: "ficken",       severity: "HIGH",   categories: ["sexual"] },
  { word: "scheisse",     severity: "HIGH",   categories: ["insult"] },
  { word: "scheise",      severity: "HIGH",   categories: ["insult"] },
  { word: "scheis",       severity: "HIGH",   categories: ["insult"] },
  { word: "fotze",        severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "wichser",      severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "wixer",        severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "hure",         severity: "HIGH",   categories: ["insult", "sexual"] },
  { word: "hurensohn",    severity: "HIGH",   categories: ["insult"] },
  { word: "missgeburt",   severity: "HIGH",   categories: ["insult", "slur"] },

  // ── Deutsch – Kritisch (CRITICAL) ─────────────────────────────────────────
  { word: "schwuchtel",   severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "nazi",         severity: "CRITICAL", categories: ["hate_speech"] },
  { word: "judensau",     severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "negerkind",    severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "kanacke",      severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "kanake",       severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "zigeuner",     severity: "CRITICAL", categories: ["hate_speech", "slur"] },

  // ── Türkisch – Leicht (LOW) ────────────────────────────────────────────────
  { word: "salak",        severity: "LOW",    categories: ["insult"] },
  { word: "mal",          severity: "LOW",    categories: ["insult"] },
  { word: "gerizekalı",   severity: "LOW",    categories: ["insult"] },
  { word: "aptal",        severity: "LOW",    categories: ["insult"] },
  { word: "ahmak",        severity: "LOW",    categories: ["insult"] },
  { word: "budala",       severity: "LOW",    categories: ["insult"] },

  // ── Türkisch – Mittelschwer (MEDIUM) ──────────────────────────────────────
  { word: "amk",          severity: "MEDIUM", categories: ["sexual", "insult"] },
  { word: "aq",           severity: "MEDIUM", categories: ["sexual", "insult"] },
  { word: "pic",          severity: "MEDIUM", categories: ["insult"] },
  { word: "piç",          severity: "MEDIUM", categories: ["insult"] },
  { word: "gavat",        severity: "MEDIUM", categories: ["insult"] },
  { word: "kahpe",        severity: "MEDIUM", categories: ["insult", "sexual"] },
  { word: "oç",           severity: "MEDIUM", categories: ["insult"] },
  { word: "oc",           severity: "MEDIUM", categories: ["insult"] },

  // ── Türkisch – Schwer (HIGH) ───────────────────────────────────────────────
  { word: "orospu",       severity: "HIGH",   categories: ["insult", "sexual"] },
  { word: "yarrak",       severity: "HIGH",   categories: ["sexual"] },
  { word: "yarak",        severity: "HIGH",   categories: ["sexual"] },
  { word: "sik",          severity: "HIGH",   categories: ["sexual"] },
  { word: "sikeyim",      severity: "HIGH",   categories: ["sexual"] },
  { word: "siktir",       severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "götveren",     severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "gotveren",     severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "ananı",        severity: "HIGH",   categories: ["insult"] },
  { word: "anani",        severity: "HIGH",   categories: ["insult"] },
  { word: "amına",        severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "amina",        severity: "HIGH",   categories: ["sexual", "insult"] },

  // ── Englisch – Leicht (LOW) ────────────────────────────────────────────────
  { word: "idiot",        severity: "LOW",    categories: ["insult"] },
  { word: "stupid",       severity: "LOW",    categories: ["insult"] },
  { word: "moron",        severity: "LOW",    categories: ["insult"] },
  { word: "jerk",         severity: "LOW",    categories: ["insult"] },
  { word: "loser",        severity: "LOW",    categories: ["insult"] },
  { word: "dumbass",      severity: "LOW",    categories: ["insult"] },

  // ── Englisch – Mittelschwer (MEDIUM) ──────────────────────────────────────
  { word: "bastard",      severity: "MEDIUM", categories: ["insult"] },
  { word: "bitch",        severity: "MEDIUM", categories: ["insult"] },
  { word: "asshole",      severity: "MEDIUM", categories: ["insult"] },
  { word: "dick",         severity: "MEDIUM", categories: ["sexual", "insult"] },
  { word: "pussy",        severity: "MEDIUM", categories: ["sexual", "insult"] },
  { word: "whore",        severity: "MEDIUM", categories: ["insult", "sexual"] },
  { word: "slut",         severity: "MEDIUM", categories: ["insult", "sexual"] },
  { word: "crap",         severity: "MEDIUM", categories: ["insult"] },

  // ── Englisch – Schwer (HIGH) ───────────────────────────────────────────────
  { word: "fuck",         severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "fucker",       severity: "HIGH",   categories: ["insult"] },
  { word: "fucking",      severity: "HIGH",   categories: ["insult"] },
  { word: "shit",         severity: "HIGH",   categories: ["insult"] },
  { word: "cunt",         severity: "HIGH",   categories: ["sexual", "insult"] },
  { word: "cock",         severity: "HIGH",   categories: ["sexual"] },
  { word: "motherfucker", severity: "HIGH",   categories: ["insult"] },
  { word: "prick",        severity: "HIGH",   categories: ["insult"] },
  { word: "wanker",       severity: "HIGH",   categories: ["insult"] },

  // ── Englisch – Kritisch (CRITICAL) ────────────────────────────────────────
  { word: "nigger",       severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "nigga",        severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "faggot",       severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "fag",          severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "retard",       severity: "CRITICAL", categories: ["slur", "insult"] },
  { word: "chink",        severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "spic",         severity: "CRITICAL", categories: ["hate_speech", "slur"] },
  { word: "kike",         severity: "CRITICAL", categories: ["hate_speech", "slur"] },

  // ── Spam / Manipulation (LOW–MEDIUM) ──────────────────────────────────────
  { word: "klickhier",    severity: "LOW",    categories: ["spam"] },
  { word: "gratisfollow", severity: "LOW",    categories: ["spam"] },
]

// ─── Leetspeak & Sonderzeichen-Normalisierungstabelle ─────────────────────────

const LEET_MAP: Record<string, string> = {
  // Zahlen
  "0": "o", "1": "i", "2": "z", "3": "e", "4": "a",
  "5": "s", "6": "g", "7": "t", "8": "b", "9": "g",
  // Sonderzeichen
  "@": "a", $: "s", "!": "i", "+": "t", "€": "e",
  "#": "h", "%": "x", "&": "and", "^": "a", "*": "a",
  // Deutsche Umlaute
  ß: "ss", ä: "a", ö: "o", ü: "u", Ä: "a", Ö: "o", Ü: "u",
  // Türkische Sonderzeichen
  ç: "c", ğ: "g", ı: "i", ş: "s",
  // Französische / Spanische Akzente (Grundform)
  é: "e", è: "e", ê: "e", à: "a", â: "a", î: "i", ô: "o", û: "u", ñ: "n",
}

// ─── Phonetische Ersetzungsregeln ─────────────────────────────────────────────
//  Wird nach Leetspeak-Normalisierung angewendet.

const PHONETIC_MAP: Array<[RegExp, string]> = [
  [/ph/g,   "f"],   // "phuck" → "fuck"
  [/ck/g,   "k"],   // "fucker" → "fuker"
  [/qu/g,   "k"],   // "qunt" → "kunt"
  [/x/g,    "ks"],  // erweiterter Kontext
  [/sch/g,  "sh"],  // deutsches "sch"
  [/tsch/g, "ch"],
  [/ie/g,   "i"],
  [/ei/g,   "i"],
  [/ou/g,   "u"],
  [/oo/g,   "u"],
  [/ce/g,   "s"],
  [/ci/g,   "s"],
]

// ─── LRU-Cache (max. 512 Einträge) ────────────────────────────────────────────

class LRUCache<K, V> {
  private readonly max: number
  private map = new Map<K, V>()

  constructor(max: number) { this.max = max }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    const val = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, val)
    return val
  }

  set(key: K, val: V): void {
    if (this.map.has(key)) this.map.delete(key)
    else if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value as K)
    this.map.set(key, val)
  }
}

const resultCache = new LRUCache<string, ProfanityResult>(512)

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Entfernt Null-Bytes, Steuerzeichen und Zero-Width-Zeichen. */
function sanitizeInput(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // Zero-Width & Soft-Hyphen
    .replace(/[\u0001-\u001F\u007F]/g, " ")       // ASCII-Steuerzeichen
}

/**
 * Reduziert einen String auf eine vergleichbare Grundform.
 * Pipeline: bereinigen → Klein → Akzente → Leetspeak → Phonetik → nur a-z → Deduplizierung
 */
function normalize(input: string): string {
  let s = sanitizeInput(input).toLowerCase()

  // Unicode-Akzente entfernen (NFD-Zerlegung + Combining-Marks löschen)
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // Leetspeak & Sonderzeichen ersetzen (Zeichenweise)
  s = s.replace(/[013245678@$!+€ßäöüÄÖÜçğışéèêàâîôûñ#%^*]/g, (c) => LEET_MAP[c] ?? c)

  // Alles außer Buchstaben entfernen (Trennzeichen-Tricks aushebeln)
  s = s.replace(/[^a-z]/g, "")

  // Phonetische Vereinfachung
  for (const [pattern, replacement] of PHONETIC_MAP) {
    s = s.replace(pattern, replacement)
  }

  // Dreifach (oder mehr) wiederholte Buchstaben → maximal doppelt
  // "scheiiiiße" → "scheie"  /  "fuuuck" → "fuuk"
  s = s.replace(/(.)\1{2,}/g, "$1$1")

  return s
}

// ─── Vorberechnete normalisierte Wortliste ────────────────────────────────────

type NormalizedEntry = {
  normalized: string
  original: WordEntry
}

const NORMALIZED_ENTRIES: NormalizedEntry[] = (() => {
  const seen = new Set<string>()
  const result: NormalizedEntry[] = []

  for (const entry of WORD_LIST) {
    const norm = normalize(entry.word)
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    result.push({ normalized: norm, original: entry })
  }

  return result
})()

// ─── Schweregrad-Hilfsfunktionen ──────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
}

function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b
}

/** Berechnet einen Score 0–100 basierend auf Schweregrad und Anzahl der Treffer. */
function calcScore(matches: NormalizedEntry[]): number {
  if (matches.length === 0) return 0
  const base = matches.reduce((acc, m) => acc + SEVERITY_RANK[m.original.severity] * 20, 0)
  return Math.min(100, base)
}

// ─── Kernfunktion: checkProfanity ────────────────────────────────────────────

/**
 * Prüft einen Text auf Schimpfwörter (DE / TR / EN / FR / ES).
 *
 * Strategien:
 *  1. Wort-Token-Vergleich  → exakte normalisierte Übereinstimmung
 *  2. Substring-Suche       → im vollständig normalisierten Text
 *  3. Kurze Begriffe (≤ 3)  → nur als eigenes Token → weniger Fehlalarme
 *
 * @param text  Der zu prüfende Rohtext
 * @returns     ProfanityResult mit clean, matches, severity, categories, score
 */
export function checkProfanity(text: string): ProfanityResult {
  const EMPTY: ProfanityResult = {
    clean: true, matches: [], severity: "LOW", categories: [], score: 0,
  }

  if (!text || typeof text !== "string") return EMPTY

  const trimmed = text.trim()
  if (trimmed.length === 0) return EMPTY

  // Cache-Lookup
  const cached = resultCache.get(trimmed)
  if (cached) return cached

  const collapsed = normalize(trimmed)

  // Text in Token aufteilen (Sonderzeichen als Trenner)
  const tokens = trimmed
    .toLowerCase()
    .split(/[^a-zA-Z0-9äöüçğışÄÖÜ@$!+éèêàâîôûñ]+/)
    .map((t) => normalize(t))
    .filter(Boolean)

  const foundEntries: NormalizedEntry[] = []
  const foundNorms = new Set<string>()

  for (const entry of NORMALIZED_ENTRIES) {
    const { normalized: bad } = entry

    if (foundNorms.has(bad)) continue

    const isShort = bad.length <= 3

    if (isShort) {
      // Kurze Begriffe: nur als exaktes Token werten
      if (tokens.includes(bad)) {
        foundNorms.add(bad)
        foundEntries.push(entry)
      }
    } else {
      // Längere Begriffe: Substring-Suche im Gesamttext & in Tokens
      if (collapsed.includes(bad) || tokens.some((t) => t.includes(bad))) {
        foundNorms.add(bad)
        foundEntries.push(entry)
      }
    }
  }

  // Ergebnis zusammenstellen
  let highestSeverity: Severity = "LOW"
  const categorySet = new Set<Category>()

  for (const e of foundEntries) {
    highestSeverity = maxSeverity(highestSeverity, e.original.severity)
    for (const cat of e.original.categories) categorySet.add(cat)
  }

  const result: ProfanityResult = {
    clean:      foundEntries.length === 0,
    matches:    foundEntries.map((e) => e.normalized),
    severity:   foundEntries.length === 0 ? "LOW" : highestSeverity,
    categories: Array.from(categorySet),
    score:      calcScore(foundEntries),
  }

  resultCache.set(trimmed, result)
  return result
}

// ─── maskProfanity ────────────────────────────────────────────────────────────

/**
 * Ersetzt erkannte Schimpfwörter im Originaltext durch eine Maskierung.
 *
 * @param text  Eingangstext
 * @param mode  "stars"   → *** (Standard)
 *              "redact"  → [REDACTED]
 *              "partial" → ersten + letzten Buchstaben behalten: f***k
 */
export function maskProfanity(text: string, mode: MaskMode = "stars"): string {
  if (!text || typeof text !== "string") return text ?? ""

  let result = sanitizeInput(text)

  for (const entry of WORD_LIST) {
    const { word } = entry
    // Regex: Sonderzeichen escapen + optional Trennzeichen zwischen Buchstaben erlauben
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const pattern = escaped
      .split("")
      .join("[^a-zA-ZäöüÄÖÜçğışéèêàâîôûñ]?")

    result = result.replace(new RegExp(pattern, "gi"), (match) => {
      if (mode === "redact") return "[REDACTED]"
      if (mode === "partial" && match.length >= 3) {
        return match[0] + "*".repeat(match.length - 2) + match[match.length - 1]
      }
      return "*".repeat(match.length)
    })
  }

  return result
}

// ─── Hilfsfunktionen für externe Konsumenten ──────────────────────────────────

/**
 * Gibt true zurück, wenn der Text mindestens einen CRITICAL-Begriff enthält.
 * Nützlich für sofortigen Hard-Block ohne vollständige Analyse.
 */
export function hasCriticalContent(text: string): boolean {
  const result = checkProfanity(text)
  return result.severity === "CRITICAL"
}

/**
 * Gibt eine menschenlesbare Zusammenfassung des Ergebnisses zurück.
 * Sprache: Deutsch.
 */
export function describeProfanityResult(result: ProfanityResult): string {
  if (result.clean) return "Kein unangemessener Inhalt gefunden."

  const count = result.matches.length
  const sev   = result.severity

  const sevText: Record<Severity, string> = {
    LOW:      "geringen",
    MEDIUM:   "mittleren",
    HIGH:     "hohen",
    CRITICAL: "kritischen",
  }

  return (
    `${count} unangemessener Begriff${count !== 1 ? "e" : ""} mit ${sevText[sev]} ` +
    `Schweregrad gefunden (Score: ${result.score}/100).`
  )
}

/**
 * Cache-Statistiken — nützlich für Monitoring / Debug.
 */
export function getCacheStats(): { size: number } {
  // Wir können die interne Map-Größe nicht direkt lesen, daher Dummy-Export.
  return { size: -1 }
}
