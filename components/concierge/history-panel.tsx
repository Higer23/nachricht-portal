"use client"

import { useState } from "react"
import { ChevronDown, Inbox, Trash2 } from "lucide-react"
import type { Dictionary } from "@/lib/i18n/tr"

export type HistoryEntry = {
  id: string
  name: string
  subject: string
  message: string
  date: string
}

type HistoryPanelProps = {
  entries: HistoryEntry[]
  open: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onClear: () => void
  dict: Dictionary["history"]
}

export function HistoryPanel({
  entries,
  open,
  onToggle,
  onDelete,
  onClear,
  dict,
}: HistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <section className="w-full animate-rise" style={{ animationDelay: "120ms" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-card/70 px-5 py-4 text-left backdrop-blur-sm transition-colors hover:border-primary/50"
      >
        <span className="flex items-center gap-3">
          <Inbox className="size-[18px] text-primary" />
          <span className="font-serif text-base text-foreground">
            {dict.heading}
          </span>
          <span className="flex min-w-[22px] items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {entries.length}
          </span>
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-2 rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Inbox className="size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{dict.empty}</p>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {entries.map((entry) => {
                    const isExpanded = expandedId === entry.id
                    return (
                      <li
                        key={entry.id}
                        className="group rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : entry.id)
                            }
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-sm font-medium text-primary-foreground/90">
                              {entry.subject}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {entry.name} · {entry.date}
                            </p>
                            <p
                              className={`mt-2 text-sm leading-relaxed text-foreground/80 ${
                                isExpanded ? "" : "line-clamp-2"
                              }`}
                            >
                              {entry.message}
                            </p>
                          </button>
                          <button
                            type="button"
                            aria-label={dict.deleteLabel}
                            onClick={() => onDelete(entry.id)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={onClear}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                  >
                    {dict.clearAll}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
