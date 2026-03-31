'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  MoreHorizontal, Eye, Pencil, Building2, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { toast } from 'sonner'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PersonTypeLabels } from '@/lib/validations/persona'
import { deletePersonaAction } from '@/app/actions/persona.actions'
import { StatusBadge } from '@/components/personas/StatusBadge'
import { AssignPlazaDialog } from '@/components/personas/AssignPlazaDialog'

// ─── Tipo badge ─────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<string, string> = {
  JRV:          'bg-primary/10 text-primary border-primary/20',
  MESA_APOYO:   'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
  OBSERVADORES: 'bg-caution-bg text-caution-foreground border-caution/30',
}

function TipoBadge({ tipo }: { tipo: string }) {
  const label = PersonTypeLabels[tipo as keyof typeof PersonTypeLabels] ?? tipo
  const colors = TIPO_COLORS[tipo] ?? 'bg-secondary text-muted-foreground border-border'
  return (
    <Badge className={`${colors} text-[0.7rem] font-medium px-2 py-0.5 rounded-md border`}>
      {label}
    </Badge>
  )
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PersonaRow {
  id:           string
  fullName:     string
  dni:          string
  profession:   string[]
  tipo:         'JRV' | 'MESA_APOYO' | 'OBSERVADORES'
  hasDemand:    boolean
  workPlace:    string | null
  contractType: 'ACUERDO' | 'CONTRATO' | null
  photoUrl:     string | null
  relatedPerson: { fullName: string; relationship: string } | null
}

type SortField = 'fullName' | 'dni' | 'createdAt'
type SortDir   = 'asc' | 'desc'

// ─── Avatar ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function PersonAvatar({
  photoUrl,
  fullName,
}: {
  photoUrl: string | null
  fullName: string
}) {
  if (photoUrl) {
    return (
      <div className="relative size-9 rounded-full overflow-hidden border border-border flex-shrink-0">
        <Image
          src={photoUrl}
          alt={fullName}
          fill
          sizes="36px"
          className="object-cover"
        />
      </div>
    )
  }
  return (
    <div className="size-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
      <span className="text-[0.65rem] font-semibold text-primary-foreground leading-none tracking-wide">
        {getInitials(fullName)}
      </span>
    </div>
  )
}

// ─── Sortable header ─────────────────────────────────────────────────────────

function SortableHeader({
  field,
  label,
  orderBy,
  orderDir,
  buildSortHref,
}: {
  field:        SortField
  label:        string
  orderBy:      SortField
  orderDir:     SortDir
  buildSortHref: (field: SortField) => string
}) {
  const isActive = orderBy === field
  const Icon = !isActive
    ? ArrowUpDown
    : orderDir === 'asc'
      ? ArrowUp
      : ArrowDown

  return (
    <th className="text-left px-4 py-3 whitespace-nowrap">
      <Link
        href={buildSortHref(field)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        aria-sort={
          !isActive
            ? undefined
            : orderDir === 'asc'
              ? 'ascending'
              : 'descending'
        }
      >
        {label}
        <Icon
          className={`size-3 transition-colors flex-shrink-0 ${
            isActive
              ? 'text-primary'
              : 'text-muted-foreground/40 group-hover:text-muted-foreground'
          }`}
        />
      </Link>
    </th>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function PersonaTable({
  personas,
  orderBy,
  orderDir,
  paramsRecord,
  userRole,
}: {
  personas:     PersonaRow[]
  orderBy:      SortField
  orderDir:     SortDir
  paramsRecord: Record<string, string>
  userRole:     UserRole
}) {
  const isAdmin = userRole === 'ADMIN'
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const [dialogPersona, setDialogPersona] = useState<PersonaRow | null>(null)

  // Build sort URL without useSearchParams — from server-provided paramsRecord
  function buildSortHref(field: SortField): string {
    const params = new URLSearchParams(paramsRecord)
    params.set('orderBy', field)
    params.set(
      'orderDir',
      orderBy === field && orderDir === 'asc' ? 'desc' : 'asc',
    )
    params.delete('pagina')
    return `/personas?${params.toString()}`
  }

  // ── GSAP: animate rows on load / filter change ───────────────────────────
  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      gsap.fromTo(
        'tbody tr',
        { opacity: 0, x: -8 },
        {
          opacity:  1,
          x:        0,
          duration: ANIM.duration.fast,
          stagger:  0.04,
          ease:     ANIM.ease.enter,
        },
      )
    },
    { scope: containerRef, dependencies: [personas] },
  )

  async function handleDelete(id: string, fullName: string) {
    const confirmed = window.confirm(
      `¿Eliminar a "${fullName}"? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    const result = await deletePersonaAction(id)
    if (result.success) {
      toast.success('Persona eliminada correctamente')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (personas.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">
          No se encontraron personas
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Intenta ajustar los filtros de búsqueda
        </p>
      </div>
    )
  }

  // ── Table ────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        ref={containerRef}
        className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {/* Avatar column */}
                <th className="w-[52px] px-4 py-3" />
                <SortableHeader
                  field="fullName"
                  label="Nombre / DNI"
                  orderBy={orderBy}
                  orderDir={orderDir}
                  buildSortHref={buildSortHref}
                />
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Profesión / Oficio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Demanda
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Estado de plaza
                </th>
                {/* Actions column */}
                <th className="w-[52px] px-4 py-3" aria-hidden="true" />
              </tr>
            </thead>

            <tbody>
              {personas.map((persona) => (
                <tr
                  key={persona.id}
                  className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  {/* Avatar */}
                  <td className="px-4 py-3 w-[52px]">
                    <PersonAvatar
                      photoUrl={persona.photoUrl}
                      fullName={persona.fullName}
                    />
                  </td>

                  {/* Nombre + DNI */}
                  <td className="px-4 py-3 min-w-[180px]">
                    <p className="font-medium text-foreground leading-snug line-clamp-1">
                      {persona.fullName}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {persona.dni}
                    </p>
                  </td>

                  {/* Profesión */}
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-sm">
                    {persona.profession.length > 0
                      ? persona.profession.join(', ')
                      : <span className="text-muted-foreground/30">—</span>
                    }
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3">
                    <TipoBadge tipo={persona.tipo} />
                  </td>

                  {/* Demanda */}
                  <td className="px-4 py-3">
                    {persona.hasDemand ? (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-300 text-[0.7rem] font-medium px-2 py-0.5 rounded-md">
                        Con demanda
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-[0.7rem] font-normal"
                      >
                        Sin demanda
                      </Badge>
                    )}
                  </td>

                  {/* Estado de plaza (merged plaza + contrato) */}
                  <td className="px-4 py-3">
                    <StatusBadge
                      hasDemand={persona.hasDemand}
                      workPlace={persona.workPlace}
                      contractType={persona.contractType}
                    />
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 w-[52px]">
                    {isAdmin ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label={`Acciones para ${persona.fullName}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => router.push(`/personas/${persona.id}`)}
                          >
                            <Eye className="size-3.5 text-muted-foreground" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => router.push(`/personas/${persona.id}/editar`)}
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setDialogPersona(persona)}
                          >
                            <Building2 className="size-3.5 text-muted-foreground" />
                            Asignar plaza
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => handleDelete(persona.id, persona.fullName)}
                          >
                            <Trash2 className="size-3.5" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Link
                        href={`/personas/${persona.id}`}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label={`Ver detalle de ${persona.fullName}`}
                      >
                        <Eye className="size-4" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plaza assignment dialog — admin only */}
      {isAdmin && (
        <AssignPlazaDialog
          person={dialogPersona}
          open={dialogPersona !== null}
          onOpenChange={(open) => { if (!open) setDialogPersona(null) }}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  )
}
