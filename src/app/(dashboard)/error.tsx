'use client'
import { useRef } from 'react'
import Link from 'next/link'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string | undefined }
  reset: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (prefersReduced) return

      const tl = gsap.timeline()

      // Fade + slide in the card
      tl.fromTo(
        container.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: ANIM.duration.fast, ease: ANIM.ease.enter },
      )
      // Shake the icon
      .fromTo(
        iconRef.current,
        { x: -5 },
        { x: 5, duration: 0.06, ease: 'none', repeat: 7, yoyo: true },
        '<0.1',
      )
      .set(iconRef.current, { x: 0 })
    },
    { scope: container },
  )

  return (
    <div
      className="flex min-h-[50vh] items-center justify-center px-6"
      role="alert"
      aria-live="assertive"
    >
      <div ref={container} className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div
          ref={iconRef}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mx-auto"
          aria-hidden="true"
        >
          <AlertCircle className="size-8" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Algo salió mal
          </h1>
          <p className="text-sm text-muted-foreground">
            {error.message
              ? error.message
              : 'Ocurrió un error inesperado. Por favor, intente nuevamente.'}
          </p>
          {error.digest !== undefined && (
            <p className="text-xs text-muted-foreground font-mono">
              Código: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Home className="size-4" aria-hidden="true" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
