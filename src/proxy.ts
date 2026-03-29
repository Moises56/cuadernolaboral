// Edge Runtime — solo valida existencia de cookie; la validación profunda
// ocurre en getSession() dentro de cada Server Component / Server Action.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME        = 'cl_session'
const PUBLIC_PATHS       = ['/login', '/sin-acceso']
const PROTECTED_PREFIXES = ['/personas', '/configuracion', '/api/export', '/api/upload']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get(COOKIE_NAME)

  const isPublic    = PUBLIC_PATHS.some((p) => pathname === p)
  const isProtected =
    pathname === '/' ||
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  // Ruta protegida sin cookie → login
  if (isProtected && !sessionCookie?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // Ya logueado y va a /login → dashboard
  if (isPublic && sessionCookie?.value && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
