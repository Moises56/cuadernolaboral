export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

// ── Auth — seguro para usar en Client Components (sin dependencias de servidor)
export type UserRole = 'ADMIN' | 'VIEWER'

export type SessionPayload = {
  userId:      string
  role:        UserRole
  displayName: string
}
