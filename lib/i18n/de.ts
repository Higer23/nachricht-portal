import type { Dictionary } from "./tr"

const de: Dictionary = {
  meta: {
    title: "Concierge — Nachrichtenportal",
    description:
      "Ein ruhiger, privater Weg, eine Nachricht zu senden. Nur das, was du schreibst, wird erfasst.",
  },

  portal: {
    heading: "Nachricht senden",
    subheading:
      "Ein ruhiger, privater Weg, mich zu erreichen. Ich lese jedes Wort und antworte so bald ich kann.",

    fields: {
      name: { label: "Dein Name", placeholder: "z. B. Alex Müller" },
      contact: {
        label: "E-Mail oder Telefon",
        hint: "optional — damit ich antworten kann",
        placeholder: "du@beispiel.de",
      },
      subject: { label: "Betreff", placeholder: "Worum geht es?" },
      message: {
        label: "Nachricht",
        placeholder: "Schreib hier deine Nachricht…",
        draftSaved: "Entwurf gespeichert",
      },
      attachment: { label: "Anhang", hint: "optional, bis zu 8 MB" },
    },

    consent: {
      base: "Ich verstehe, dass mein Name, meine Nachricht",
      withContact: ", meine Kontaktangabe",
      suffix:
        " und etwaige Anhänge an den Empfänger gesendet werden, um mein Anliegen zu bearbeiten. Es werden keine Standort-, IP- oder Gerätedaten erfasst.",
    },

    errors: {
      name: "Bitte gib deinen Namen ein.",
      subject: "Bitte gib einen Betreff ein.",
      message: "Deine Nachricht sollte mindestens 10 Zeichen lang sein.",
      consent: "Bitte bestätige vor dem Senden.",
    },

    profanity: {
      warning:
        "Bitte achte auf einen respektvollen Ausdruck. Unangemessene Wörter müssen vor dem Senden entfernt werden.",
      button: "Ausdruck überprüfen",
      toast: "Bitte entferne unangemessene Ausdrücke, bevor du sendest.",
    },

    submit: {
      idle: "Nachricht senden",
      sending: "Wird gesendet…",
    },

    privacy: "Sicher zugestellt. Nur das, was du schreibst, wird geteilt.",

    toast: {
      networkError: "Netzwerkproblem. Bitte prüfe deine Verbindung.",
      genericError: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
    },

    success: {
      heading: "Nachricht gesendet",
      body: "Deine Nachricht ist sicher angekommen. Ich melde mich bald.",
      close: "Schließen",
    },
  },

  history: {
    heading: "Gesendete Nachrichten",
    empty: "Deine gesendeten Nachrichten erscheinen hier.",
    deleteLabel: "Nachricht löschen",
    clearAll: "Alle löschen",
  },

  dropzone: {
    heading: "Datei hier ablegen oder zum Auswählen klicken",
    hint: "Bilder, PDFs und Dokumente — je bis zu 8 MB",
    tooBig: "ist größer als 8 MB.",
    tooMany: "Du kannst bis zu 5 Dateien anhängen.",
    removeLabel: "entfernen",
  },
}

export default de
