import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, FileDown, FileText } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import {
  normalizeProfession,
  buildProfessionOptions,
} from '@/lib/normalize-profession'
import { PersonaTable, type PersonaRow } from '@/components/personas/PersonaTable'
import { PersonaFilters } from '@/components/personas/PersonaFilters'
import { PersonaPagination } from '@/components/personas/PersonaPagination'

export const metadata: Metadata = {
  title: 'Personas',
}

const PAGE_SIZE = 20

type SortField = 'fullName' | 'dni' | 'createdAt'
type SortDir   = 'asc' | 'desc'

const VALID_SORT: SortField[] = ['fullName', 'dni', 'createdAt']

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const raw = await searchParams

  const str = (v: unknown) => (typeof v === 'string' ? v : '')

  const q         = str(raw.q).trim()
  const demanda   = str(raw.demanda) || 'all'
  const plaza     = str(raw.plaza)   || 'all'
  const profesion = str(raw.profesion) || 'all'
  const tipo      = str(raw.tipo) || 'all'
  const page      = Math.max(1, parseInt(str(raw.pagina) || '1', 10))
  const orderBy   = (VALID_SORT.includes(str(raw.orderBy) as SortField)
    ? str(raw.orderBy) : 'createdAt') as SortField
  const orderDir  = str(raw.orderDir) === 'asc' ? ('asc' as SortDir) : ('desc' as SortDir)

  // ── Get all unique raw profession strings for the filter dropdown ────────
  const allProfessionsRaw = await prisma.$queryRaw<{ profession: string }[]>`
    SELECT DISTINCT TRIM(unnest("profession")) AS profession
    FROM "Person"
    WHERE array_length("profession", 1) > 0
    ORDER BY profession
  `
  const allRawStrings = allProfessionsRaw.map((r) => r.profession)
  const professionOptions = buildProfessionOptions(allRawStrings)

  // ── Build profession filter: find all raw variants matching the normalized key
  let professionVariants: string[] = []
  if (profesion === '_none') {
    // Special: filter people with NO profession
  } else if (profesion !== 'all') {
    professionVariants = allRawStrings.filter(
      (raw) => normalizeProfession(raw) === profesion,
    )
  }

  // ── Prisma where clause ────────────────────────────────────────────────────
  const where = {
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' as const } },
        { dni:      { contains: q } },
      ],
    }),
    ...(demanda === 'con' && { hasDemand: true }),
    ...(demanda === 'sin' && { hasDemand: false }),
    ...(plaza === 'asignada'  && { workPlace: { not: null } }),
    ...(plaza === 'pendiente' && { workPlace: null }),
    // Profession filter
    ...(profesion === '_none' && { profession: { equals: [] as string[] } }),
    ...(professionVariants.length > 0 && {
      profession: { hasSome: professionVariants },
    }),
    // Tipo filter
    ...(tipo !== 'all' && { tipo: tipo as 'JRV' | 'MESA_APOYO' | 'OBSERVADORES' }),
  }

  // ── Parallel queries — async-parallel pattern ──────────────────────────────
  const [personas, total, conDemanda, conPlaza] = await Promise.all([
    prisma.person.findMany({
      where,
      select: {
        id:           true,
        fullName:     true,
        dni:          true,
        profession:   true,
        tipo:         true,
        hasDemand:    true,
        workPlace:    true,
        contractType: true,
        photoUrl:     true,
        relatedPerson: { select: { fullName: true, relationship: true } },
      },
      orderBy: { [orderBy]: orderDir },
      take:    PAGE_SIZE,
      skip:    (page - 1) * PAGE_SIZE,
    }),
    prisma.person.count({ where }),
    prisma.person.count({ where: { hasDemand: true } }),
    prisma.person.count({ where: { workPlace: { not: null } } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Compact record of non-default URL params — passed to client components
  const paramsRecord: Record<string, string> = {
    ...(q                       && { q }),
    ...(demanda   !== 'all'     && { demanda }),
    ...(plaza     !== 'all'     && { plaza }),
    ...(profesion !== 'all'     && { profesion }),
    ...(tipo      !== 'all'     && { tipo }),
    ...(page      > 1           && { pagina: String(page) }),
    ...(orderBy   !== 'createdAt' && { orderBy }),
    ...(orderDir  !== 'desc'    && { orderDir }),
  }

  // Export URLs preserve active filters + current sort order
  const exportBase = new URLSearchParams({
    ...(q && { q }),
    ...(demanda   !== 'all' && { demanda }),
    ...(plaza     !== 'all' && { plaza }),
    ...(profesion !== 'all' && { profesion }),
    ...(tipo      !== 'all' && { tipo }),
    ...(orderBy   !== 'createdAt' && { orderBy }),
    ...(orderDir  !== 'desc'     && { orderDir }),
  }).toString()
  const exportQs = exportBase ? `?${exportBase}` : ''

  return (
    <div className="px-6 py-7 lg:px-8 lg:py-8 max-w-[1400px] mx-auto w-full">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.6rem] font-semibold text-foreground leading-tight">
            Personas registradas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{total}</span>{' '}
            {total === 1 ? 'persona' : 'personas'}
            <span className="mx-1.5 text-border">·</span>
            <span className="text-amber-600 font-medium">{conDemanda}</span> con demanda
            <span className="mx-1.5 text-border">·</span>
            <span className="text-emerald-600 font-medium">{conPlaza}</span> con plaza
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`/api/export/excel${exportQs}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[0.8rem] font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <FileDown className="size-3.5" />
            Excel
          </a>
          <a
            href={`/api/export/pdf${exportQs}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[0.8rem] font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <FileText className="size-3.5" />
            PDF
          </a>
          <Link
            href="/personas/nueva"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            Nuevo registro
          </Link>
        </div>
      </header>

      {/* ── Filters (useSearchParams inside → Suspense boundary) ───────────── */}
      <Suspense fallback={<FiltersFallback />}>
        <PersonaFilters
          currentQ={q}
          currentDemanda={demanda}
          currentPlaza={plaza}
          currentProfesion={profesion}
          currentTipo={tipo}
          currentOrderBy={orderBy}
          currentOrderDir={orderDir}
          professionOptions={professionOptions}
        />
      </Suspense>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <PersonaTable
          personas={personas as PersonaRow[]}
          orderBy={orderBy}
          orderDir={orderDir}
          paramsRecord={paramsRecord}
          userRole={session.role}
        />
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <PersonaPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          paramsRecord={paramsRecord}
        />
      )}
    </div>
  )
}

function FiltersFallback() {
  return (
    <div className="h-8 w-full max-w-sm rounded-md bg-secondary/60 animate-pulse" />
  )
}
