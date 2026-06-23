"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  Check,
  CircleAlert,
  Loader2,
  Lock,
  Send,
  TriangleAlert,
  X,
  Globe,
  ChevronDown,
} from "lucide-react"
import { FileDropzone } from "./file-dropzone"
import { HistoryPanel, type HistoryEntry } from "./history-panel"
import { checkProfanity } from "@/lib/profanity"

const HISTORY_KEY = "concierge_history"
const DRAFT_KEY = "concierge_draft"
const MAX_HISTORY = 20
const MAX_MESSAGE = 2000

// ====================== ÇEVİRİLER ======================
type TranslationKey = keyof typeof translations.tr

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
    errorGeneric: "Bir hata oluştu. Lütfen tekrar deneyin.",
    errorNetwork: "Bağlantı hatası. Lütfen internet bağlantını kontrol et.",
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
    errorGeneric: "Something went wrong. Please try again.",
    errorNetwork: "Network error. Please check your connection.",
  },
  de: {
    title: "Nachricht senden",
    subtitle: "Ein ruhiger und privater Weg, mich zu erreichen. Ich lese jedes Wort und antworte so schnell wie möglich.",
    name: "Dein Name",
    namePlaceholder: "z. B. Max Mustermann",
    contact: "E-Mail oder Telefon",
    contactHint: "optional — damit ich antworten kann",
    contactPlaceholder: "beispiel@email.de",
    subject: "Betreff",
    subjectPlaceholder: "Worum geht es?",
    message: "Deine Nachricht",
    messagePlaceholder: "Schreibe hier deine Nachricht...",
    attachment: "Anhang",
    attachmentHint: "optional, max. 8 MB",
    consent: "Mein Name, meine Nachricht und Anhänge werden gesendet. Es werden keine Standort-, IP- oder Gerätedaten erfasst.",
    send: "Nachricht senden",
    sending: "Wird gesendet...",
    success: "Nachricht gesendet",
    successText: "Deine Nachricht ist sicher angekommen. Ich melde mich bald bei dir.",
    close: "Schließen",
    profanity: "Bitte entferne unangemessene Ausdrücke.",
    draftSaved: "Entwurf gespeichert",
    history: "Gesendete Nachrichten",
    errorGeneric: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    errorNetwork: "Netzwerkproblem. Bitte überprüfe deine Verbindung.",
  },
} as const

type Lang = "tr" | "en" | "de"

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
  const [showLangDropdown, setShowLangDropdown] = useState(false)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const toastTimer = useRef<NodeJS.Timeout | null>(null)
  const draftTimer = useRef<NodeJS.Timeout | null>(null)
  const shakeTimer = useRef<NodeJS.Timeout | null>(null)
  const hydrated = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Profanity kontrolü
  const profanity = useMemo(
    () => checkProfanity(`${name} ${subject} ${message}`),
    [name, subject, message]
  )
  const hasProfanity = !profanity.clean

  // Dil ve verileri yükle
  useEffect(() => {
    // URL'den dil algılama
    const urlParams = new URLSearchParams(window.location.search)
    const urlLang = urlParams.get("lang") as Lang | null
    const savedLang = localStorage.getItem("preferredLang") as Lang | null

    const initialLang = (urlLang && ["tr", "en", "de"].includes(urlLang)) 
      ? urlLang 
      : savedLang || "tr"

    setLang(initialLang)

    // History ve draft yükleme
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
    } catch (e) {
      console.warn("Draft yüklenemedi", e)
    }

    hydrated.current = true
  }, [])

  // Taslak otomatik kaydet (debounce)
  useEffect(() => {
    if (!hydrated.current) return
    if (draftTimer.current) clearTimeout(draftTimer.current)

    draftTimer.current = setTimeout(() => {
      if (name || contact || subject || message) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ name, contact, subject, message })
        )
        setDraftSaved(true)
      }
    }, 650)

    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
    }
  }, [name, contact, subject, message])

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, message: msg })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4800)
  }, [])

  const triggerShake = useCallback(() => {
    setShake(true)
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShake(false), 520)
  }, [])

  const changeLanguage = (newLang: Lang) => {
    setLang(newLang)
    localStorage.setItem("preferredLang", newLang)
    setShowLangDropdown(false)
    
    // URL'yi de güncelle (opsiyonel)
    const url = new URL(window.location.href)
    url.searchParams.set("lang", newLang)
    window.history.replaceState({}, "", url.toString())
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = lang === "tr" ? "Lütfen adını gir." : lang === "de" ? "Bitte gib deinen Namen ein." : "Please enter your name."
    if (!subject.trim()) next.subject = lang === "tr" ? "Lütfen konu gir." : lang === "de" ? "Bitte gib einen Betreff ein." : "Please enter a subject."
    if (message.trim().length < 10)
      next.message = lang === "tr" ? "Mesaj en az 10 karakter olmalı." : lang === "de" ? "Die Nachricht sollte mindestens 10 Zeichen lang sein." : "Message must be at least 10 characters."
    if (!consent) next.consent = lang === "tr" ? "Lütfen onay ver." : lang === "de" ? "Bitte bestätige vor dem Senden." : "Please confirm."
    
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
        showToast("error", data.error ?? t.errorGeneric)
        triggerShake()
        return
      }

      const entry: HistoryEntry = {
        id: `\( {Date.now().toString(36)}- \){Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
        date: new Date().toLocaleString(
          lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : "en-US",
          { dateStyle: "medium", timeStyle: "short" }
        ),
      }

      const newHistory = [entry, ...history].slice(0, MAX_HISTORY)
      setHistory(newHistory)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
      setHistoryOpen(true)

      // Reset form
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
      showToast("success", t.success)
    } catch {
      showToast("error", t.errorNetwork)
      triggerShake()
    } finally {
      setSubmitting(false)
    }
  }

  // Klavye kısayolu: Ctrl/Cmd + Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !submitting) {
        e.preventDefault()
        handleSubmit(e as any)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [submitting, name, subject, message, consent, files])

  const remaining = MAX_MESSAGE - message.length
  const canSend = !submitting && !hasProfanity

  return (
    <main className="portal-backdrop relative min-h-svh w-full px-4 py-10 sm:py-16">
      <div className="portal-grain pointer-events-none fixed inset-0" />

      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-6">
        {/* Gelişmiş Dil Seçici */}
        <div className="flex justify-end relative">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-5 py-2.5 text-sm hover:bg-primary/10 transition-all active:scale-[0.985]"
            aria-label="Dil değiştir"
          >
            <Globe className="size-4" />
            <span>{lang.toUpperCase()}</span>
            <ChevronDown className={`size-3.5 transition-transform ${showLangDropdown ? "rotate-180" : ""}`} />
          </button>

          {showLangDropdown && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-card p-2 shadow-xl z-50">
              {(["tr", "en", "de"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => changeLanguage(l)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-primary/10 transition-colors ${lang === l ? "bg-primary/10" : ""}`}
                >
                  <span className="text-lg">
                    {l === "tr" ? "🇹🇷" : l === "en" ? "🇬🇧" : "🇩🇪"}
                  </span>
                  <span className="font-medium">
                    {l === "tr" ? "Türkçe" : l === "en" ? "English" : "Deutsch"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ana Kart */}
        <section className={`animate-rise rounded-3xl border border-border bg-card/80 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-10 ${shake ? "animate-shake" : ""}`}>
          {/* Header */}
          <header className="flex flex-col items-center text-center mb-8">
            <span className="animate-breathe flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 font-serif text-3xl text-primary-foreground">
              N
            </span>
            <h1 className="mt-6 text-balance font-serif text-4xl font-semibold tracking-tight text-foreground">
              {t.title}
            </h1>
            <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
              {t.subtitle}
            </p>
          </header>

          <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

          <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
            {/* Honeypot */}
            <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

            {/* Form Alanları */}
            <Field label={t.name} error={errors.name}>
              <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} className={inputClass(!!errors.name)} />
            </Field>

            <Field label={t.contact} hint={t.contactHint} error={errors.contact}>
              <input type="text" value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} placeholder={t.contactPlaceholder} className={inputClass(false)} />
            </Field>

            <Field label={t.subject} error={errors.subject}>
              <input type="text" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder={t.subjectPlaceholder} className={inputClass(!!errors.subject)} />
            </Field>

            <Field label={t.message} error={errors.message}>
              <textarea value={message} maxLength={MAX_MESSAGE} onChange={(e) => setMessage(e.target.value)} placeholder={t.messagePlaceholder} rows={7} className={`${inputClass(!!errors.message)} resize-y leading-relaxed`} />
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {draftSaved && <><span className="size-1.5 rounded-full bg-primary/70" />{t.draftSaved}</>}
                </span>
                <span className={remaining < 80 ? "text-destructive" : "text-muted-foreground"}>
                  {message.length} / {MAX_MESSAGE}
                </span>
              </div>

              {hasProfanity && (
                <div className="mt-3 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                  <p>{t.profanity}</p>
                </div>
              )}
            </Field>

            <Field label={t.attachment} hint={t.attachmentHint}>
              <FileDropzone files={files} onChange={setFiles} onError={(msg) => showToast("error", msg)} />
            </Field>

            {/* Consent */}
            <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-background/50 p-5 hover:border-primary/40 transition-colors">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 peer size-5 cursor-pointer accent-primary" />
              <span className="text-sm leading-relaxed text-muted-foreground">{t.consent}</span>
            </label>

            {errors.consent && <p className="text-destructive text-sm pl-1">{errors.consent}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSend}
              className={`group relative mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base font-medium text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 ${canSend ? "animate-shimmer" : ""}`}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Send className="size-5 transition-transform group-hover:translate-x-1" />
                  {t.send}
                </>
              )}
            </button>

            <p className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5" />
              {lang === "de" ? "Sicher zugestellt. Nur das, was du schreibst, wird geteilt." : lang === "tr" ? "Sadece yazdıkların paylaşılır. Güvenli teslimat." : "Securely delivered. Only what you write is shared."}
            </p>
          </form>
        </section>

        <HistoryPanel
          entries={history}
          open={historyOpen}
          onToggle={() => setHistoryOpen((o) => !o)}
          onDelete={(id) => {
            const filtered = history.filter((e) => e.id !== id)
            setHistory(filtered)
            localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
          }}
          onClear={() => {
            setHistory([])
            localStorage.setItem(HISTORY_KEY, "[]")
          }}
        />
      </div>

      {/* Success Overlay */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-primary/30 bg-card p-10 text-center shadow-2xl">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <Check className="size-12 text-primary animate-pop" />
            </div>
            <h2 className="mt-8 text-3xl font-semibold font-serif">{t.success}</h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{t.successText}</p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-10 w-full rounded-2xl border border-primary/40 py-4 text-lg font-medium hover:bg-primary/5 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="animate-toast-in fixed bottom-8 left-1/2 z-[110] -translate-x-1/2 flex items-center gap-4 rounded-2xl border bg-card px-6 py-4 shadow-2xl">
          {toast.type === "error" ? <CircleAlert className="size-5 text-destructive" /> : <Check className="size-5 text-primary" />}
          <span className="text-foreground pr-6">{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Kapat">
            <X className="size-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}
    </main>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</label>
        {hint && <span className="text-xs text-muted-foreground/75">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-sm text-destructive pl-1">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full rounded-2xl border bg-background/70 px-5 py-4 text-base placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none ${hasError ? "border-destructive" : "border-border hover:border-primary/50"}`
                                                                     }
