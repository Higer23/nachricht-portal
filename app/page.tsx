import { redirect } from "next/navigation"
import { defaultLocale } from "@/lib/i18n"

// Middleware zaten yönlendirme yapıyor ama bu sayfa
// middleware'in çalışmadığı durumlarda yedek olarak hizmet verir.
export default function RootPage() {
  redirect(`/${defaultLocale}`)
}
