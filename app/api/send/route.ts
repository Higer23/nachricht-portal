import { type NextRequest, NextResponse } from "next/server"
import { checkProfanity } from "@/lib/profanity"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 MB
const MAX_FILES = 5

// Einfaches In-Memory-Ratelimit pro Server-Instanz (Best-Effort).
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

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Der Server ist noch nicht für den Versand konfiguriert." },
      { status: 503 },
    )
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Zu viele Nachrichten in kurzer Zeit. Bitte einen Moment warten." },
      { status: 429 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 })
  }

  // Honeypot — still annehmen und verwerfen.
  if ((form.get("company") as string)?.trim()) {
    return NextResponse.json({ ok: true })
  }

  const name = (form.get("name") as string)?.trim() ?? ""
  const subject = (form.get("subject") as string)?.trim() ?? ""
  const message = (form.get("message") as string)?.trim() ?? ""
  const contact = (form.get("contact") as string)?.trim() ?? ""

  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: "Bitte gib einen gültigen Namen ein." },
      { status: 400 },
    )
  }
  if (!subject || subject.length > 120) {
    return NextResponse.json(
      { error: "Bitte gib einen Betreff ein." },
      { status: 400 },
    )
  }
  if (message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { error: "Die Nachricht muss zwischen 10 und 2000 Zeichen lang sein." },
      { status: 400 },
    )
  }
  if (contact.length > 120) {
    return NextResponse.json(
      { error: "Das Kontaktfeld ist zu lang." },
      { status: 400 },
    )
  }

  // Serverseitiger Schimpfwort-Filter (Name, Betreff & Nachricht).
  const profanity = checkProfanity(`${name} ${subject} ${message}`)
  if (!profanity.clean) {
    return NextResponse.json(
      {
        error:
          "Deine Eingabe enthält unangemessene Ausdrücke. Bitte formuliere sie respektvoll.",
        code: "PROFANITY",
      },
      { status: 422 },
    )
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: "Zu viele Anhänge (max. 5)." },
      { status: 400 },
    )
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

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Netzwerkproblem beim Zustellen der Nachricht. Bitte erneut versuchen." },
      { status: 502 },
    )
  }
}
