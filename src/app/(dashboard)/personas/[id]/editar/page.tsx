import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { PersonaForm } from '@/components/personas/PersonaForm'
import type { PersonaFormValues } from '@/lib/validations/persona'

// ─── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const person = await prisma.person.findUnique({
    where:  { id },
    select: { fullName: true },
  })
  return {
    title: person
      ? `Editar — ${person.fullName} — CuadernoLaboral`
      : 'Editar registro — CuadernoLaboral',
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function EditarPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const [person, allFieldConfigs] = await Promise.all([
    prisma.person.findUnique({
      where:   { id },
      include: {
        relatedPerson: true,
        dynamicValues: {
          include: { field: { select: { fieldKey: true } } },
        },
      },
    }),
    prisma.formFieldConfig.findMany({
      where:   { active: true },
      orderBy: { order: 'asc' },
    }),
  ])

  if (!person) notFound()

  // Map DB record → PersonaFormValues default values
  const dynamicFields: Record<string, string> = {}
  for (const dv of person.dynamicValues) {
    dynamicFields[dv.field.fieldKey] = dv.value
  }

  const defaultValues: Partial<PersonaFormValues> = {
    fullName:       person.fullName,
    dni:            person.dni,
    phone:          person.phone,
    email:          person.email ?? '',
    age:            person.age ?? undefined,
    profession:     person.profession,
    workedForState: person.workedForState,
    hasDemand:      person.hasDemand,
    conciliando:    person.conciliando,
    observations:   person.observations ?? '',
    cvUrl:          person.cvUrl ?? '',
    cvPublicId:     person.cvPublicId ?? '',
    photoUrl:       person.photoUrl ?? '',
    photoPublicId:  person.photoPublicId ?? '',
    relatedPerson:  person.relatedPerson
      ? {
          fullName:     person.relatedPerson.fullName,
          dni:          person.relatedPerson.dni,
          phone:        person.relatedPerson.phone,
          email:        person.relatedPerson.email ?? '',
          relationship: person.relatedPerson.relationship,
        }
      : undefined,
    dynamicFields,
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/personas/${id}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Editar Registro
          </h1>
          <p className="text-sm text-muted-foreground">{person.fullName}</p>
        </div>
      </div>

      {/* Form — edit mode */}
      <PersonaForm
        allFieldConfigs={allFieldConfigs}
        personId={id}
        defaultValues={defaultValues}
      />
    </div>
  )
}
