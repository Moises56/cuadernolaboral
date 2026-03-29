import Link from 'next/link'
import type { Metadata } from 'next'
import { ShieldOff, Home } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sin acceso — CuadernoLaboral',
}

export default function SinAccesoPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto">
          <ShieldOff className="size-8" aria-hidden="true" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Sin permisos de acceso
          </h1>
          <p className="text-sm text-muted-foreground">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-sm text-muted-foreground">
            Tu rol es de solo lectura. Contacta al administrador si necesitas acceso.
          </p>
        </div>

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Home className="size-4" aria-hidden="true" />
          Ir al inicio
        </Link>
      </div>
    </main>
  )
}
