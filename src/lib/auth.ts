// ⚠️  SERVIDOR ÚNICAMENTE — nunca importar en código 'use client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { User } from '@/generated/prisma/client'
import type { SessionPayload } from '@/types'

const COOKIE_NAME  = 'cl_session'
const SESSION_DAYS = 7
const SESSION_MS   = SESSION_DAYS * 24 * 60 * 60 * 1000

// ── Tipos públicos ─────────────────────────────────────────────────────────────
export type SafeUser = Omit<User, 'passwordHash'>
export type { SessionPayload }

// ── Crear sesión en DB + establecer cookie ─────────────────────────────────────
export async function createSession(userId: string): Promise<void> {
  // Limpiar sesiones expiradas del usuario
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  })

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_MS),
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, session.token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   SESSION_MS / 1000,
  })
}

// ── Obtener sesión actual desde la cookie ──────────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const session = await prisma.session.findUnique({
      where:   { token },
      include: {
        user: {
          select: {
            id:          true,
            role:        true,
            displayName: true,
            active:      true,
          },
        },
      },
    })

    if (!session)                       return null
    if (session.expiresAt < new Date()) return null
    if (!session.user.active)           return null

    return {
      userId:      session.user.id,
      role:        session.user.role,
      displayName: session.user.displayName,
    }
  } catch {
    return null
  }
}

// ── Requerir sesión — redirige a /login si no hay ──────────────────────────────
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

// ── Requerir rol ADMIN — redirige a /sin-acceso si es VIEWER ──────────────────
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession()
  if (session.role !== 'ADMIN') redirect('/sin-acceso')
  return session
}

// ── Destruir sesión ────────────────────────────────────────────────────────────
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined)
  }

  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   0,
  })
}

// ── Verificar credenciales ─────────────────────────────────────────────────────
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase().trim() },
  })

  if (!user || !user.active) return null

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  const { passwordHash: _pw, ...safeUser } = user
  void _pw
  return safeUser
}
