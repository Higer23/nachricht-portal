import { NextRequest, NextResponse } from "next/server"
import { locales, defaultLocale, isValidLocale } from "@/lib/i18n"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API rotalarını ve statik dosyaları atla
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Zaten geçerli bir locale segmenti varsa dokunma
  const firstSegment = pathname.split("/")[1]
  if (isValidLocale(firstSegment)) {
    return NextResponse.next()
  }

  // Accept-Language başlığından dil algıla
  const acceptLang = request.headers.get("accept-language") ?? ""
  const preferred = acceptLang
    .split(",")
    .map((s) => s.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find((lang) => isValidLocale(lang))

  const locale = preferred ?? defaultLocale

  // Kullanıcıyı doğru dil yoluna yönlendir
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*).*)"],
}
