"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  CircleAlert,
  Loader2,
  Lock,
  Send,
  TriangleAlert,
  X,
  Globe,
} from "lucide-react"
import { FileDropzone } from "./file-dropzone"
import { HistoryPanel, type HistoryEntry } from "./history-panel"
import { checkProfanity } from "@/lib/profanity"

const HISTORY_KEY = "concierge_history"
const DRAFT_KEY = "concierge_draft"
const MAX_HISTORY = 20
const MAX_MESSAGE = 2000

// ====================== ÇEVİRİLER ======================
const translations = {
  tr: {
    title: "Mesaj Gönder",
    subtitle: "Benimle iletişime geçmenin sakin ve özel yolu. Yazdığın her şeyi okuyup en kısa sürede cevap vereceğim.",
    name: "Adın Soyadın",
    namePlaceholder: "Örn: Ahmet Yılmaz",
    contact: "E-posta veya Telefon",
    contactHint: "opsiyonel — cevap verebilmem için",
    contactPlaceholder: "ornek@email.com",
    subject: "Konu",
    subjectPlaceholder: "Konu nedir?",
    message: "Mesajın",
    messagePlaceholder: "Mesajını buraya yaz...",
    attachment: "Ek Dosya",
    attachmentHint: "opsiyonel, maks. 8 MB",
    consent: "Adım, mesajım ve eklerim gönderilecek. Hiçbir konum, IP veya cihaz verisi toplanmıyor.",
    send: "Mesaj Gönder",
    sending: "Gönderiliyor...",
    success: "Mesajın gönderildi",
    successText: "Mesajın güvenli bir şekilde ulaştı. En kısa sürede dönüş yapacağım.",
    close: "Kapat",
    profanity: "Lütfen uygun olmayan ifadeleri kaldır.",
    draftSaved: "Taslak kaydedildi",
    history: "Gönderilen Mesajlar",
  },
  en: {
    title: "Send Message",
    subtitle: "A calm and private way to reach me. I read every word and will reply as soon as possible.",
    name: "Your Full Name",
    namePlaceholder: "E.g. John Doe",
    contact: "Email or Phone",
    contactHint: "optional — so I can reply",
    contactPlaceholder: "example@email.com",
    subject: "Subject",
    subjectPlaceholder: "What's it about?",
    message: "Your Message",
    messagePlaceholder: "Write your message here...",
    attachment: "Attachment",
    attachmentHint: "optional, max 8 MB",
    consent: "My name, message and attachments will be sent. No location, IP or device data is collected.",
    send: "Send Message",
    sending: "Sending...",
    success: "Message Sent",
    successText: "Your message has been delivered safely. I'll get back to you soon.",
    close: "Close",
    profanity: "Please remove inappropriate expressions.",
    draftSaved: "Draft saved",
    history: "Sent Messages",
  },
} as const

type Lang = "tr" | "en"

type ToastState = { type: "success" | "error"; message: string } | null

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function MessagePortal() {
  const [lang, setLang] = useState<Lang>("tr")
  const t = translations[lang]

  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [consent, setConsent] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shake, setShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydrated = useRef(false)

  const profanity = useMemo(
    () => checkProfanity(`${name} ${subject} ${message}`),
    [name, subject, message]
  )
  const hasProfanity = !profanity.clean

  // Dil ve localStorage yükleme
  useEffect(() => {
    const savedLang = localStorage.getItem("preferredLang") as Lang | null
    if (savedLang) setLang(savedLang)

    setHistory(loadHistory())

    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        setName(d.name ?? "")
        setContact(d.contact ?? "")
        setSubject(d.subject ?? "")
        setMessage(d.message ?? "")
        if (d.name || d.subject || d.message) setDraftSaved(true)
      }
    } catch {}
    hydrated.current = true
  }, [])

  // Taslak otomatik kaydet
  useEffect(() => {
    if (!hydrated.current) return
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      if (name || contact || subject || message) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, contact, subject, message }))
        setDraftSaved(true)
      }
    }, 800)
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current) }
  }, [name, contact, subject, message])

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, message: msg })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }

  const triggerShake = () => {
    setShake(true)
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShake(false), 500)
  }

  const changeLanguage = (newLang: Lang) => {
    setLang(newLang)
    localStorage.setItem("preferredLang", newLang)
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = lang === "tr" ? "Lütfen adını gir." : "Please enter your name."
    if (!subject.trim()) next.subject = lang === "tr" ? "Lütfen konu gir." : "Please enter a subject."
    if (message.trim().length < 10)
      next.message = lang === "tr" ? "Mesaj en az 10 karakter olmalı." : "Message must be at least 10 characters."
    if (!consent) next.consent = lang === "tr" ? "Lütfen onay ver." : "Please confirm."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (!validate()) {
      triggerShake()
      return
    }

    if (hasProfanity) {
      triggerShake()
      showToast("error", t.profanity)
      return
    }

    setSubmitting(true)
    try {
      const form = new FormData()
      form.append("name", name.trim())
      form.append("contact", contact.trim())
      form.append("subject", subject.trim())
      form.append("message", message.trim())
      files.forEach((file) => form.append("files", file, file.name))

      const res = await fetch("/api/send", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        showToast("error", data.error ?? (lang === "tr" ? "Bir hata oluştu." : "Something went wrong."))
        triggerShake()
        return
      }

      const entry: HistoryEntry = {
        id: `\( {Date.now().toString(36)}- \){Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
        date: new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      }

      const newHistory = [entry, ...history].slice(0, MAX_HISTORY)
      setHistory(newHistory)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
      setHistoryOpen(true)

      // Formu sıfırla
      setName("")
      setContact("")
      setSubject("")
      setMessage("")
      setConsent(false)
      setFiles([])
      setErrors({})
      setDraftSaved(false)
      localStorage.removeItem(DRAFT_KEY)
      setSuccess(true)
    } catch {
      showToast("error", lang === "tr" ? "Bağlantı hatası." : "Network error.")
      triggerShake()
    } finally {
      setSubmitting(false)
    }
  }

  const remaining = MAX_MESSAGE - message.length
  const canSend = !submitting && !hasProfanity

  return (
    <main className="portal-backdrop relative min-h-svh w-full px-4 py-10 sm:py-16">
      <div className="portal-grain pointer-events-none fixed inset-0" />

      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-6">
        {/* Dil Değiştirici */}
        <div className="flex justify-end">
          <button
            onClick={() => changeLanguage(lang === "tr" ? "en" : "tr")}
            className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm hover:bg-primary/10 transition-all active:scale-95"
          >
            <Globe className="size-4" />
            {lang === "tr" ? "🇬🇧 English" : "🇹🇷 Türkçe"}
          </button>
        </div>

        {/* Ana Kart */}
        <section className={`animate-rise rounded-3xl border border-border bg-card/80 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-10 ${shake ? "animate-shake" : ""}`}>
          <header className="flex flex-col items-center text-center">
            <span className="animate-breathe flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/15 font-serif text-xl text-primary-foreground">
              N
            </span>
            <h1 className="mt-5 text-balance font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
              {t.subtitle}
            </p>
          </header>

          <div className="my-8 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

            <Field index={0} label={t.name} error={errors.name}>
              <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} className={inputClass(!!errors.name)} />
            </Field>

            <Field index={1} label={t.contact} hint={t.contactHint} error={errors.contact}>
              <input type="text" value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} placeholder={t.contactPlaceholder} className={inputClass(false)} />
            </Field>

            <Field index={2} label={t.subject} error={errors.subject}>
              <input type="text" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder={t.subjectPlaceholder} className={inputClass(!!errors.subject)} />
            </Field>

            <Field index={3} label={t.message} error={errors.message}>
              <textarea value={message} maxLength={MAX_MESSAGE} onChange={(e) => setMessage(e.target.value)} placeholder={t.messagePlaceholder} rows={6} className={`${inputClass(!!errors.message)} resize-y leading-relaxed`} />
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {draftSaved && (
                    <>
                      <span className="size-1.5 rounded-full bg-primary/70" />
                      {t.draftSaved}
                    </>
                  )}
                </span>
                <span className={`text-xs ${remaining < 100 ? "text-destructive" : "text-muted-foreground"}`}>
                  {message.length} / {MAX_MESSAGE}
                </span>
              </div>

              {hasProfanity && (
                <div className="animate-rise mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{t.profanity}</span>
                </div>
              )}
            </Field>

            <Field index={4} label={t.attachment} hint={t.attachmentHint}>
              <FileDropzone files={files} onChange={setFiles} onError={(msg) => showToast("error", msg)} />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/40">
              <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer size-5 cursor-pointer appearance-none rounded-md border border-border bg-card transition-colors checked:border-primary checked:bg-primary" />
                <Check className="pointer-events-none absolute size-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" />
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">{t.consent}</span>
            </label>

            {errors.consent && <p className="-mt-3 text-xs text-destructive">{errors.consent}</p>}

            <button type="submit" disabled={!canSend} className={`group relative mt-1 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-sm font-medium tracking-wide text-primary-foreground transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${canSend ? "animate-shimmer" : ""}`}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t.sending}
                </>
              ) : hasProfanity ? (
                <>
                  <TriangleAlert className="size-4" />
                  {lang === "tr" ? "İfadeyi kontrol et" : "Check expression"}
                </>
              ) : (
                <>
                  <Send className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  {t.send}
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="size-3" />
              {lang === "tr" ? "Sicher zugestellt. Nur das, was du schreibst, wird geteilt." : "Securely delivered. Only what you write is shared."}
            </p>
          </form>
        </section>

        <HistoryPanel
          entries={history}
          open={historyOpen}
          onToggle={() => setHistoryOpen((o) => !o)}
          onDelete={(id) => {
            const newHistory = history.filter((e) => e.id !== id)
            setHistory(newHistory)
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
          }}
          onClear={() => {
            setHistory([])
            localStorage.setItem(HISTORY_KEY, "[]")
          }}
        />
      </div>

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md transition-opacity">
          <div className="w-full max-w-sm rounded-3xl border border-primary/30 bg-card p-9 text-center shadow-2xl">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/15">
              <Check className="animate-pop size-8 text-primary-foreground" />
            </span>
            <h2 className="mt-5 font-serif text-2xl font-semibold text-foreground">{t.success}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.successText}</p>
            <button onClick={() => setSuccess(false)} className="mt-7 w-full rounded-xl border border-primary/40 bg-transparent px-6 py-2.5 text-sm text-primary-foreground/90 hover:bg-primary/10">
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`animate-toast-in fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-card px-5 py-3.5 text-sm shadow-xl ${toast.type === "error" ? "border-destructive/40" : "border-primary/40"}`}>
          {toast.type === "error" ? <CircleAlert className="size-4 shrink-0 text-destructive" /> : <Check className="size-4 shrink-0 text-primary-foreground" />}
          <span className="text-foreground">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}
    </main>
  )
}

function Field({ index = 0, label, hint, error, children }: { index?: number; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="animate-stagger flex flex-col gap-2" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</label>
        {hint && <span className="text-xs text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${hasError ? "border-destructive/60" : "border-border hover:border-primary/40"}`
        }
