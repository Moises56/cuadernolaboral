import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PersonaNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* SVG illustration */}
        <div className="mx-auto w-20 h-20 text-muted-foreground" aria-hidden="true">
          <svg
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <circle
              cx="40"
              cy="40"
              r="38"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.3"
            />
            {/* Person silhouette */}
            <circle cx="40" cy="30" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M18 64c0-11.046 9.85-20 22-20s22 8.954 22 20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* X mark */}
            <path
              d="M53 18l10 10M63 18L53 28"
              stroke="hsl(var(--destructive))"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Persona no encontrada
          </h1>
          <p className="text-sm text-muted-foreground">
            El registro que buscas no existe o fue eliminado.
          </p>
        </div>

        <Link
          href="/personas"
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al listado
        </Link>
      </div>
    </div>
  )
}
