import { MessagePortal } from "@/components/concierge/message-portal"
import { getDictionary, isValidLocale, defaultLocale, type Locale } from "@/lib/i18n"

interface Props {
  params: Promise<{ lang: string }>
}

export default async function Page({ params }: Props) {
  const { lang } = await params
  const locale: Locale = isValidLocale(lang) ? lang : defaultLocale
  const dict = await getDictionary(locale)

  return <MessagePortal dict={dict} locale={locale} />
}
