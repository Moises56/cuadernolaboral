import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Briefcase,
  Users,
  FileText,
  Image as ImageIcon,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlignLeft,
  Download,
} from 'lucide-react'
import type { Metadata } from 'next'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { StatusBadge } from '@/components/personas/StatusBadge'
import { PersonaActions } from './PersonaActions'
import { cn } from '@/lib/utils'

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
      ? `${person.fullName} — CuadernoLaboral`
      : 'Persona no encontrada — CuadernoLaboral',
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-HN', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
  }).format(date)
}

function InfoRow({
  label,
  value,
  mono = false,
  className,
}: {
  label:      string
  value:      React.ReactNode
  mono?:      boolean
  className?: string | undefined
}) {
  if (!value && value !== 0) return null
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-sm text-foreground', mono && 'font-mono tracking-wide')}>
        {value}
      </span>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
  accent,
}: {
  icon:      React.ElementType
  title:     string
  children:  React.ReactNode
  accent?:   'warning' | 'default'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card',
        accent === 'warning'
          ? 'border-warning/50 dark:border-warning/30'
          : 'border-border',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b px-5 py-3',
          accent === 'warning'
            ? 'border-warning/40 dark:border-warning/25'
            : 'border-border',
        )}
      >
        <Icon
          className={cn(
            'size-4',
            accent === 'warning' ? 'text-caution' : 'text-primary',
          )}
        />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const person = await prisma.person.findUnique({
    where:   { id },
    include: {
      relatedPerson: true,
      dynamicValues: {
        include: {
          field: { select: { label: true, fieldKey: true, type: true } },
        },
        orderBy: { field: { order: 'asc' } },
      },
    },
  })

  if (!person) notFound()

  const detallePerfil    = person.dynamicValues.find(dv => dv.field.fieldKey === 'detallePerfil')
  const otherDynamicValues = person.dynamicValues.filter(dv => dv.field.fieldKey !== 'detallePerfil')

  const assigneePerson = {
    id:           person.id,
    fullName:     person.fullName,
    hasDemand:    person.hasDemand,
    relatedPerson: person.relatedPerson
      ? {
          fullName:     person.relatedPerson.fullName,
          relationship: person.relatedPerson.relationship,
        }
      : null,
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/personas"
            className="mt-0.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" />
            Volver
          </Link>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {person.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {person.dni}
              </span>
              <StatusBadge
                hasDemand={person.hasDemand}
                workPlace={person.workPlace}
                contractType={person.contractType}
              />
            </div>
          </div>
        </div>

        <PersonaActions person={assigneePerson} hasPlaza={Boolean(person.workPlace)} />
      </div>

      {/* ── Content grid ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">

          {/* Personal data */}
          <SectionCard icon={User} title="Datos Personales">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <InfoRow label="Nombre completo" value={person.fullName} className="col-span-2 sm:col-span-3" />
              <InfoRow label="DNI"             value={person.dni}      mono />
              <InfoRow label="Teléfono"        value={person.phone}    mono />
              {person.email     && <InfoRow label="Correo"      value={person.email} />}
              {person.age       && <InfoRow label="Edad"        value={`${person.age} años`} />}
              {person.profession.length > 0 && (
                <div className="col-span-2 sm:col-span-3 flex flex-col gap-1">
                  <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Profesión / Oficio
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {person.profession.map(p => (
                      <span
                        key={p}
                        className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Laboral data */}
          <SectionCard icon={Briefcase} title="Información Laboral">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {person.workedForState ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : (
                  <XCircle className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">
                  {person.workedForState
                    ? 'Trabajó para el Estado anteriormente'
                    : 'No ha trabajado para el Estado'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {person.hasDemand ? (
                  <AlertTriangle className="size-4 text-caution" />
                ) : (
                  <CheckCircle2 className="size-4 text-success" />
                )}
                <span className="text-sm text-foreground">
                  {person.hasDemand
                    ? 'Tiene demanda activa contra el Estado'
                    : 'Sin demanda contra el Estado'}
                </span>
              </div>

              {person.observations && (
                <div className="border-t border-border pt-4">
                  <InfoRow label="Observaciones" value={person.observations} />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Detalle del perfil — sección propia */}
          {detallePerfil && (
            <SectionCard icon={AlignLeft} title="Detalle del Perfil">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {detallePerfil.value}
              </p>
            </SectionCard>
          )}

          {/* Dynamic custom fields */}
          {otherDynamicValues.length > 0 && (
            <SectionCard icon={FileText} title="Campos Adicionales">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {otherDynamicValues.map(dv => (
                  <InfoRow
                    key={dv.id}
                    label={dv.field.label}
                    value={
                      dv.field.type === 'BOOLEAN'
                        ? dv.value === 'true' ? 'Sí' : 'No'
                        : dv.value
                    }
                    mono={dv.field.type === 'NUMBER' || dv.field.type === 'DATE'}
                    className={
                      dv.field.type === 'TEXTAREA' ? 'col-span-2 sm:col-span-3' : undefined
                    }
                  />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">

          {/* Plaza / status */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="size-4 text-primary" />
              Estado de Plaza
            </h2>

            {person.workPlace ? (
              <div className="space-y-3">
                <InfoRow label="Lugar de trabajo" value={person.workPlace} />
                {person.contractType && (
                  <InfoRow
                    label="Tipo de contrato"
                    value={person.contractType === 'ACUERDO' ? 'Acuerdo' : 'Contrato'}
                  />
                )}
                {person.contractDate && (
                  <InfoRow
                    label="Fecha del contrato"
                    value={formatDate(person.contractDate)}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin plaza asignada
              </p>
            )}
          </div>

          {/* Photo */}
          {person.photoUrl && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <ImageIcon className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Fotografía</h2>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={person.photoUrl}
                alt={`Foto de ${person.fullName}`}
                className="w-full object-cover"
                style={{ maxHeight: '280px' }}
              />
            </div>
          )}

          {/* CV document */}
          {person.cvUrl && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Currículum Vitae</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/download?url=${encodeURIComponent(person.cvUrl)}&name=${encodeURIComponent(person.fullName)}&inline=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <FileText className="size-3" />
                  Ver CV
                </a>
                <a
                  href={`/api/download?url=${encodeURIComponent(person.cvUrl)}&name=${encodeURIComponent(person.fullName)}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  <Download className="size-3" />
                  Descargar
                </a>
              </div>
            </div>
          )}

          {/* Related person */}
          {person.hasDemand && person.relatedPerson && (
            <SectionCard icon={Users} title="Familiar Designado" accent="warning">
              <div className="space-y-3">
                <InfoRow label="Nombre"    value={person.relatedPerson.fullName} />
                <InfoRow label="DNI"       value={person.relatedPerson.dni}      mono />
                <InfoRow label="Teléfono"  value={person.relatedPerson.phone}    mono />
                {person.relatedPerson.email && (
                  <InfoRow label="Correo"  value={person.relatedPerson.email} />
                )}
                <InfoRow label="Parentesco" value={person.relatedPerson.relationship} />
              </div>
            </SectionCard>
          )}

          {/* Registration dates */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Fechas</h2>
            </div>
            <InfoRow label="Registrado"   value={formatDate(person.createdAt)} />
            <InfoRow label="Actualizado"  value={formatDate(person.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  )
}
