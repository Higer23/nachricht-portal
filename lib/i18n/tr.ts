const tr = {
  meta: {
    title: "Concierge — Mesaj Portalı",
    description:
      "Mesaj göndermenin sakin ve özel bir yolu. Yalnızca yazdıkların toplanır.",
  },

  portal: {
    heading: "Mesaj Gönder",
    subheading:
      "Bana ulaşmanın sakin ve özel bir yolu. Her kelimeyi okur ve en kısa sürede yanıt veririm.",

    fields: {
      name: { label: "Adın", placeholder: "örn. Ahmet Yılmaz" },
      contact: {
        label: "E-posta veya Telefon",
        hint: "isteğe bağlı — yanıt verebilmem için",
        placeholder: "sen@ornek.com",
      },
      subject: { label: "Konu", placeholder: "Ne hakkında?" },
      message: {
        label: "Mesaj",
        placeholder: "Mesajını buraya yaz…",
        draftSaved: "Taslak kaydedildi",
      },
      attachment: { label: "Ek", hint: "isteğe bağlı, 8 MB'a kadar" },
    },

    consent: {
      base: "Adımın, mesajımın",
      withContact: ", iletişim bilgimin",
      suffix:
        " ve varsa eklerimin, talebimi işlemek amacıyla alıcıya iletileceğini anlıyorum. Konum, IP veya cihaz verisi toplanmaz.",
    },

    errors: {
      name: "Lütfen adını gir.",
      subject: "Lütfen bir konu gir.",
      message: "Mesajın en az 10 karakter olmalıdır.",
      consent: "Göndermeden önce lütfen onayla.",
    },

    profanity: {
      warning:
        "Lütfen saygılı bir dil kullan. Uygunsuz kelimeler gönderilmeden önce kaldırılmalıdır.",
      button: "İfadeyi Kontrol Et",
      toast: "Göndermeden önce lütfen uygunsuz ifadeleri kaldır.",
    },

    submit: {
      idle: "Mesaj Gönder",
      sending: "Gönderiliyor…",
    },

    privacy: "Güvenli iletim. Yalnızca yazdıkların paylaşılır.",

    toast: {
      networkError: "Ağ sorunu. Lütfen bağlantını kontrol et.",
      genericError: "Bir şeyler ters gitti. Lütfen tekrar dene.",
    },

    success: {
      heading: "Mesaj Gönderildi",
      body: "Mesajın güvenle ulaştı. En kısa sürede yazacağım.",
      close: "Kapat",
    },
  },

  history: {
    heading: "Gönderilen Mesajlar",
    empty: "Gönderilen mesajların burada görünür.",
    deleteLabel: "Mesajı sil",
    clearAll: "Tümünü Sil",
  },

  dropzone: {
    heading: "Dosyayı buraya bırak ya da seçmek için tıkla",
    hint: "Görseller, PDF'ler ve belgeler — her biri 8 MB'a kadar",
    tooBig: "MB'den büyük.",
    tooMany: "En fazla 5 dosya ekleyebilirsin.",
    removeLabel: "kaldır",
  },
} as const

export type Dictionary = typeof tr
export default tr
