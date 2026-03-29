import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión — CuadernoLaboral',
}

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/')

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-sm bg-white rounded-xl border border-[#e2e8f0] shadow-md p-8 space-y-6 animate-pulse">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted" />
        <div className="space-y-2 text-center">
          <div className="h-5 w-32 rounded bg-muted mx-auto" />
          <div className="h-4 w-44 rounded bg-muted mx-auto" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-9 rounded-md bg-muted" />
        <div className="h-9 rounded-md bg-muted" />
        <div className="h-9 rounded-md bg-muted" />
      </div>
    </div>
  )
}
