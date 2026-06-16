import { type NextRequest, NextResponse } from "next/server"
import { messageSchema, MAX_FILE_SIZE, MAX_FILES } from "@/lib/schema"
import { logger } from "@/lib/logger"

// Auf der Vercel Edge-Runtime ausführen — minimale Latenz, global verteilt.
export const runtime = "edge"

// Server-Schema: wie das gemeinsame Schema, aber ohne client-seitiges "consent".
const serverSchema = messageSchema.omit({ consent: true })

// Einfaches In-Memory-Ratelimit pro Edge-Instanz (Best-Effort).
const hits = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function rateLimited(key: string) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) return true
  recent.push(now)
  hits.set(key, recent)
  return false
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Sendet eine Benachrichtigung per Resend — nur wenn konfiguriert. */
async function sendEmail(opts: {
  name: string
  contact: string
  subject: string
  message: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.RESEND_TO
  if (!apiKey || !to) return { skipped: true as const }

  const from = process.env.RESEND_FROM || "Concierge <onboarding@resend.dev>"
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1d27">
      <h2 style="font-family:Georgia,serif;color:#3b4a73">Neue Nachricht — ${escapeHtml(opts.subject)}</h2>
      <p><strong>Von:</strong> ${escapeHtml(opts.name)}</p>
      <p><strong>Antwort an:</strong> ${escapeHtml(opts.contact || "Nicht angegeben")}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
      <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(opts.message)}</p>
      <p style="margin-top:24px;font-size:12px;color:#6b7280">Concierge Nachrichtenportal</p>
    </div>`

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: opts.contact || undefined,
      subject: `Neue Nachricht — ${opts.subject}`,
      html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`)
  }
  return { skipped: false as const }
}

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    logger.error("DISCORD_WEBHOOK_URL fehlt — Versand nicht konfiguriert.")
    return NextResponse.json(
      { error: "Der Server ist noch nicht für den Versand konfiguriert." },
      { status: 503 },
    )
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(ip)) {
    logger.warn("Ratelimit erreicht.", { ip })
    return NextResponse.json(
      { error: "Zu viele Nachrichten in kurzer Zeit. Bitte einen Moment warten." },
      { status: 429 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch (err) {
    logger.error("FormData konnte nicht gelesen werden.", err, { ip })
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 })
  }

  // Honeypot — still annehmen und verwerfen.
  if ((form.get("company") as string)?.trim()) {
    logger.info("Honeypot ausgelöst — Anfrage verworfen.", { ip })
    return NextResponse.json({ ok: true })
  }

  // Zentrale Validierung über das gemeinsame Zod-Schema.
  const parsed = serverSchema.safeParse({
    name: form.get("name"),
    contact: form.get("contact") ?? "",
    subject: form.get("subject"),
    message: form.get("message"),
  })

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const isProfanity = issue?.message.includes("unangemessen") ||
      issue?.message.includes("respektvoll")
    return NextResponse.json(
      {
        error: issue?.message ?? "Bitte überprüfe deine Eingaben.",
        ...(isProfanity ? { code: "PROFANITY" } : {}),
      },
      { status: isProfanity ? 422 : 400 },
    )
  }

  const { name, subject, message } = parsed.data
  const contact = parsed.data.contact ?? ""

  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0)

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "Zu viele Anhänge (max. 5)." }, { status: 400 })
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `„${file.name}" überschreitet das Limit von 8 MB.` },
        { status: 400 },
      )
    }
  }

  const embed = {
    title: `Neue Nachricht — ${subject}`.slice(0, 250),
    color: 0x3b4a73,
    fields: [
      { name: "Von", value: name, inline: true },
      { name: "Antwort an", value: contact || "Nicht angegeben", inline: true },
      { name: "Nachricht", value: message.slice(0, 1024), inline: false },
    ],
    footer: { text: "Concierge Nachrichtenportal" },
    timestamp: new Date().toISOString(),
  }

  try {
    const outbound = new FormData()
    outbound.append("payload_json", JSON.stringify({ embeds: [embed] }))
    files.forEach((file, i) => outbound.append(`files[${i}]`, file, file.name))

    const res = await fetch(webhookUrl, { method: "POST", body: outbound })

    if (!res.ok && res.status !== 204) {
      logger.error("Discord-Webhook abgelehnt.", undefined, { status: res.status, ip })
      if (res.status === 429) {
        return NextResponse.json(
          { error: "Der Versanddienst ist ausgelastet. Bitte gleich erneut versuchen." },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: "Deine Nachricht konnte nicht zugestellt werden. Bitte erneut versuchen." },
        { status: 502 },
      )
    }

    // E-Mail-Benachrichtigung (optional, blockiert den Erfolg nicht).
    try {
      const email = await sendEmail({ name, contact, subject, message })
      if (email.skipped) {
        logger.debug("E-Mail übersprungen — Resend nicht konfiguriert.")
      } else {
        logger.info("E-Mail-Benachrichtigung gesendet.", { subject })
      }
    } catch (err) {
      // E-Mail-Fehler werden protokolliert, aber dem Nutzer nicht angelastet.
      logger.error("Resend-E-Mail fehlgeschlagen.", err, { subject })
    }

    logger.info("Nachricht erfolgreich zugestellt.", {
      subject,
      attachments: files.length,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error("Netzwerkfehler beim Zustellen.", err, { ip })
    return NextResponse.json(
      { error: "Netzwerkproblem beim Zustellen der Nachricht. Bitte erneut versuchen." },
      { status: 502 },
    )
  }
}
