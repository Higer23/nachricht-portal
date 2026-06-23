// Bu dosya artık yalnızca bir sarmalayıcı görevi görür.
// Gerçek layout app/[lang]/layout.tsx içindedir.
// globals.css burada import edilmez — [lang]/layout.tsx üstlenir.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
