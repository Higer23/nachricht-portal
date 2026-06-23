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
} from "lucide-react"
import { FileDropzone } from "./file-dropzone"
import { HistoryPanel, type HistoryEntry } from "./history-panel"
import { checkProfanity } from "@/lib/profanity"
import type { Dictionary } from "@/lib/i18n/tr"
import type { Locale } from "@/lib/i18n"

const HISTORY_KEY = "concierge_history"
const DRAFT_KEY = "concierge_draft"
const MAX_HISTORY = 20
const MAX_MESSAGE = 2000

type ToastState = { type: "success" | "error"; message: string } | null

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")
  } catch {
    return []
  }
}

interface MessagePortalProps {
  dict: Dictionary
  locale: Locale
}

export function MessagePortal({ dict, locale }: MessagePortalProps) {
  const t = dict.portal
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

  // Live profanity check across all text fields.
  const profanity = useMemo(
    () => checkProfanity(`${name} ${subject} ${message}`),
    [name, subject, message],
  )
  const hasProfanity = !profanity.clean

  // Load history + draft from localStorage.
  useEffect(() => {
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
    } catch {
      // ignore
    }
    hydrated.current = true
  }, [])

  // Auto-save draft (debounced).
  useEffect(() => {
    if (!hydrated.current) return
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      if (name || contact || subject || message) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ name, contact, subject, message }),
        )
        setDraftSaved(true)
      }
    }, 800)
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
    }
  }, [name, contact, subject, message])

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, message: msg })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }

  function triggerShake() {
    setShake(true)
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShake(false), 500)
  }

  function persistHistory(next: HistoryEntry[]) {
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, MAX_HISTORY)))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = t.errors.name
    if (!subject.trim()) next.subject = t.errors.subject
    if (message.trim().length < 10) next.message = t.errors.message
    if (!consent) next.consent = t.errors.consent
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

    // Profanity filter blocks sending.
    if (hasProfanity) {
      triggerShake()
      showToast("error", t.profanity.toast)
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
        showToast("error", data.error ?? t.toast.genericError)
        triggerShake()
        return
      }

      const entry: HistoryEntry = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
        date: new Date().toLocaleString(locale === "tr" ? "tr-TR" : "de-DE", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      }
      persistHistory([entry, ...history])
      setHistoryOpen(true)

      // Reset form.
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
      showToast("error", t.toast.networkError)
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
        {/* Card */}
        <section
          className={`animate-rise rounded-3xl border border-border bg-card/80 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-10 ${
            shake ? "animate-shake" : ""
          }`}
        >
          <header className="flex flex-col items-center text-center">
            <span className="animate-breathe flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/15 font-serif text-xl text-primary-foreground">
              N
            </span>
            <h1 className="mt-5 text-balance font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t.heading}
            </h1>
            <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
              {t.subheading}
            </p>
          </header>

          <div
            className="my-8 h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--border), transparent)",
            }}
          />

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            {/* Honeypot */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <Field index={0} label={t.fields.name.label} error={errors.name}>
              <input
                type="text"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.fields.name.placeholder}
                className={inputClass(!!errors.name)}
              />
            </Field>

            <Field
              index={1}
              label={t.fields.contact.label}
              hint={t.fields.contact.hint}
              error={errors.contact}
            >
              <input
                type="text"
                value={contact}
                maxLength={120}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t.fields.contact.placeholder}
                className={inputClass(false)}
              />
            </Field>

            <Field index={2} label={t.fields.subject.label} error={errors.subject}>
              <input
                type="text"
                value={subject}
                maxLength={120}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t.fields.subject.placeholder}
                className={inputClass(!!errors.subject)}
              />
            </Field>

            <Field index={3} label={t.fields.message.label} error={errors.message}>
              <textarea
                value={message}
                maxLength={MAX_MESSAGE}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.fields.message.placeholder}
                rows={6}
                className={`${inputClass(!!errors.message)} resize-y leading-relaxed`}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {draftSaved && (
                    <>
                      <span className="size-1.5 rounded-full bg-primary/70" />
                      {t.fields.message.draftSaved}
                    </>
                  )}
                </span>
                <span
                  className={`text-xs ${
                    remaining < 100 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {message.length} / {MAX_MESSAGE}
                </span>
              </div>

              {/* Profanity warning */}
              {hasProfanity && (
                <div className="animate-rise mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{t.profanity.warning}</span>
                </div>
              )}
            </Field>

            <Field
              index={4}
              label={t.fields.attachment.label}
              hint={t.fields.attachment.hint}
            >
              <FileDropzone
                files={files}
                onChange={setFiles}
                onError={(msg) => showToast("error", msg)}
                dict={dict.dropzone}
              />
            </Field>

            {/* Consent */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/40">
              <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="peer size-5 cursor-pointer appearance-none rounded-md border border-border bg-card transition-colors checked:border-primary checked:bg-primary"
                />
                <Check className="pointer-events-none absolute size-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" />
              </span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {t.consent.base}
                {contact.trim() ? t.consent.withContact : ""}
                {t.consent.suffix}
              </span>
            </label>
            {errors.consent && (
              <p className="-mt-3 text-xs text-destructive">{errors.consent}</p>
            )}

            <button
              type="submit"
              disabled={!canSend}
              className={`group relative mt-1 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-sm font-medium tracking-wide text-primary-foreground transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${
                canSend ? "animate-shimmer" : ""
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t.submit.sending}
                </>
              ) : hasProfanity ? (
                <>
                  <TriangleAlert className="size-4" />
                  {t.profanity.button}
                </>
              ) : (
                <>
                  <Send className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  {t.submit.idle}
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="size-3" />
              {t.privacy}
            </p>
          </form>
        </section>

        <HistoryPanel
          entries={history}
          open={historyOpen}
          onToggle={() => setHistoryOpen((o) => !o)}
          onDelete={(id) => persistHistory(history.filter((e) => e.id !== id))}
          onClear={() => persistHistory([])}
          dict={dict.history}
        />
      </div>

      {/* Success overlay */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md transition-opacity duration-300 ${
          success ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!success}
      >
        <div
          className={`w-full max-w-sm rounded-3xl border border-primary/30 bg-card p-9 text-center shadow-2xl transition-transform duration-300 ${
            success ? "scale-100" : "scale-90"
          }`}
        >
          <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/15">
            {success && (
              <Check className="animate-pop size-8 text-primary-foreground" />
            )}
          </span>
          <h2 className="mt-5 font-serif text-2xl font-semibold text-foreground">
            {t.success.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t.success.body}
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-7 w-full rounded-xl border border-primary/40 bg-transparent px-6 py-2.5 text-sm text-primary-foreground/90 transition-colors hover:bg-primary/10"
          >
            {t.success.close}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`animate-toast-in fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-card px-5 py-3.5 text-sm shadow-xl ${
            toast.type === "error" ? "border-destructive/40" : "border-primary/40"
          }`}
          role="status"
        >
          {toast.type === "error" ? (
            <CircleAlert className="size-4 shrink-0 text-destructive" />
          ) : (
            <Check className="size-4 shrink-0 text-primary-foreground" />
          )}
          <span className="text-foreground">{toast.message}</span>
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setToast(null)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </main>
  )
}

function Field({
  index = 0,
  label,
  hint,
  error,
  children,
}: {
  index?: number
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="animate-stagger flex flex-col gap-2"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </label>
        {hint && <span className="text-xs text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
    hasError ? "border-destructive/60" : "border-border hover:border-primary/40"
  }`
}
