import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

# Manuel ekledin karanlık aydınlık mod. 
  const [theme, setTheme] = useState("dark")

<button onClick={() => {
  const newTheme = theme === "dark" ? "light" : "dark"
  setTheme(newTheme)
  document.documentElement.classList.toggle("dark")
}}>
  {theme === "dark" ? "☀️" : "🌙"}
</button>
  
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Concierge — Message Portal',
  description:
    'A calm, private way to send a message. Only what you write is collected.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#13161d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${playfair.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
