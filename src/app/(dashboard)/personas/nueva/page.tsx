import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PersonaForm } from '@/components/personas/PersonaForm'

export const metadata: Metadata = {
  title: 'Nuevo Registro',
}

export default async function NuevaPersonaPage() {
  await requireAdmin()

  const allFieldConfigs = await prisma.formFieldConfig.findMany({
    where:   { active: true },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/personas"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Nuevo Registro
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete los datos de la persona a registrar
          </p>
        </div>
      </div>

      {/* Form */}
      <PersonaForm allFieldConfigs={allFieldConfigs} />
    </div>
  )
}
