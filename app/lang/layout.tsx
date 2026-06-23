import type { Metadata, Viewport } from "next"
import { DM_Sans, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "../globals.css"
import { getDictionary, isValidLocale, defaultLocale, type Locale } from "@/lib/i18n"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

interface Props {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const locale: Locale = isValidLocale(lang) ? lang : defaultLocale
  const dict = await getDictionary(locale)
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    generator: "v0.app",
  }
}

export async function generateStaticParams() {
  return [{ lang: "de" }, { lang: "tr" }]
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#13161d",
}

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params
  const locale: Locale = isValidLocale(lang) ? lang : defaultLocale

  return (
    <html
      lang={locale}
      className={`dark ${dmSans.variable} ${playfair.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
