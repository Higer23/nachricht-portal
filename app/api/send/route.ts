import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 MB
const MAX_FILES = 5

// Simple in-memory rate limit per server instance (best-effort).
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
      { error: "Server is not configured to deliver messages yet." },
      { status: 503 },
    )
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many messages in a short time. Please wait a moment." },
      { status: 429 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  // Honeypot — silently accept and drop.
  if ((form.get("company") as string)?.trim()) {
    return NextResponse.json({ ok: true })
  }

  const name = (form.get("name") as string)?.trim() ?? ""
  const subject = (form.get("subject") as string)?.trim() ?? ""
  const message = (form.get("message") as string)?.trim() ?? ""
  const contact = (form.get("contact") as string)?.trim() ?? ""

  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Please provide a valid name." }, { status: 400 })
  }
  if (!subject || subject.length > 120) {
    return NextResponse.json({ error: "Please provide a subject." }, { status: 400 })
  }
  if (message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { error: "Your message must be between 10 and 2000 characters." },
      { status: 400 },
    )
  }
  if (contact.length > 120) {
    return NextResponse.json({ error: "Contact field is too long." }, { status: 400 })
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "Too many attachments (max 5)." }, { status: 400 })
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `"${file.name}" exceeds the 8 MB limit.` },
        { status: 400 },
      )
    }
  }

  const embed = {
    title: `New message — ${subject}`.slice(0, 250),
    color: 0x3b4a73,
    fields: [
      { name: "From", value: name, inline: true },
      { name: "Reply to", value: contact || "Not provided", inline: true },
      { name: "Message", value: message.slice(0, 1024), inline: false },
    ],
    footer: { text: "Concierge Message Portal" },
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
          { error: "Delivery service is busy. Please try again shortly." },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: "We couldn't deliver your message. Please try again." },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Network issue while delivering your message. Please try again." },
      { status: 502 },
    )
  }
}
