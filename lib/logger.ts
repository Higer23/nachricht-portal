// ─────────────────────────────────────────────────────────────
//  Zentrales, leichtgewichtiges Logging
//  - Strukturierte JSON-Logs (gut für Vercel/Edge-Logs)
//  - Einheitliche Ebenen + optionaler Kontext
//  - Eine zentrale Stelle, an der später Sentry o. Ä. angebunden
//    werden kann (siehe `forwardToMonitoring`).
// ─────────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error"

type LogContext = Record<string, unknown>

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

// In Produktion erst ab "info" loggen, in Entwicklung alles.
const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug"

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return { value: String(err) }
}

function write(level: LogLevel, message: string, context?: LogContext) {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return

  const entry = {
    ts: new Date().toISOString(),
    level,
    scope: "concierge",
    message,
    ...(context ? { context } : {}),
  }

  const line = JSON.stringify(entry)
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)

  // Zentrale Anbindungsstelle für ein Monitoring-System (z. B. Sentry).
  if (level === "error") forwardToMonitoring(message, context)
}

/**
 * Platzhalter für eine spätere Monitoring-Integration.
 * Hier könnte z. B. `Sentry.captureException(...)` aufgerufen werden,
 * sobald ein DSN/Key vorhanden ist.
 */
function forwardToMonitoring(_message: string, _context?: LogContext) {
  // Bewusst leer gelassen — eine einzige Stelle zum Anbinden.
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, error?: unknown, context?: LogContext) =>
    write("error", message, {
      ...(context ?? {}),
      ...(error !== undefined ? { error: serializeError(error) } : {}),
    }),
}
