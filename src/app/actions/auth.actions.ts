'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyCredentials, createSession, destroySession } from '@/lib/auth'
import type { ActionResult } from '@/types'

const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido').max(50),
  password: z.string().min(1, 'Contraseña requerida').max(100),
})

export async function loginAction(
  formData: unknown,
): Promise<ActionResult<void>> {
  const parsed = loginSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' }
  }

  const { username, password } = parsed.data

  // Delay mínimo — dificulta timing attacks
  await new Promise((r) => setTimeout(r, 300))

  const user = await verifyCredentials(username, password)
  if (!user) {
    // Mensaje genérico — no revela si el usuario existe
    return { success: false, error: 'Usuario o contraseña incorrectos' }
  }

  await createSession(user.id)
  return { success: true, data: undefined }
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/login')
}
