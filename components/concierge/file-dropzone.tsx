"use client"

import { useRef, useState } from "react"
import { FileText, ImageIcon, Paperclip, X } from "lucide-react"

const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_FILES = 5

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type FileDropzoneProps = {
  files: File[]
  onChange: (files: File[]) => void
  onError: (message: string) => void
}

export function FileDropzone({ files, onChange, onError }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function addFiles(incoming: File[]) {
    const next = [...files]
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        onError(`"${file.name}" is larger than 8 MB.`)
        continue
      }
      if (next.length >= MAX_FILES) {
        onError("You can attach up to 5 files.")
        break
      }
      next.push(file)
    }
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(Array.from(e.dataTransfer.files))
        }}
        className={`group flex w-full items-center gap-4 rounded-xl border border-dashed bg-background/40 px-4 py-5 text-left transition-colors duration-300 ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60 hover:bg-primary/[0.03]"
        }`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors group-hover:text-primary">
          <Paperclip className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            Drop a file here, or click to browse
          </span>
          <span className="text-xs text-muted-foreground">
            Images, PDFs and documents — up to 8 MB each
          </span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 animate-rise"
            >
              <span className="text-muted-foreground">
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(file.size)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
