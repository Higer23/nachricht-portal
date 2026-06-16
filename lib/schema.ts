import { z } from "zod"
import { checkProfanity } from "@/lib/profanity"

export const MAX_MESSAGE = 2000
export const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 MB
export const MAX_FILES = 5

// Hilfsverfeinerung: blockiert unangemessene Ausdrücke.
const noProfanity = (val: string) => checkProfanity(val).clean

/**
 * Gemeinsames Schema für Client (React Hook Form) und Server (Edge-Route).
 * Eine einzige Quelle der Wahrheit für alle Validierungen.
 */
export const messageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Bitte gib deinen Namen ein." })
    .max(80, { message: "Der Name darf höchstens 80 Zeichen lang sein." })
    .refine(noProfanity, { message: "Bitte verwende einen respektvollen Namen." }),
  contact: z
    .string()
    .trim()
    .max(120, { message: "Die Kontaktangabe ist zu lang." })
    .optional()
    .or(z.literal("")),
  subject: z
    .string()
    .trim()
    .min(1, { message: "Bitte gib einen Betreff ein." })
    .max(120, { message: "Der Betreff darf höchstens 120 Zeichen lang sein." })
    .refine(noProfanity, { message: "Bitte formuliere den Betreff respektvoll." }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Deine Nachricht sollte mindestens 10 Zeichen lang sein." })
    .max(MAX_MESSAGE, {
      message: `Die Nachricht darf höchstens ${MAX_MESSAGE} Zeichen lang sein.`,
    })
    .refine(noProfanity, {
      message: "Deine Nachricht enthält unangemessene Ausdrücke.",
    }),
  consent: z.literal(true, {
    message: "Bitte bestätige vor dem Senden.",
  }),
})

export type MessageInput = z.input<typeof messageSchema>
export type MessageData = z.output<typeof messageSchema>
