import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { mergeProfessions } from '@/lib/normalize-profession'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { ProfessionChart, type ProfessionStat } from '@/components/dashboard/ProfessionChart'
import { RecentTable, type RecentPerson } from '@/components/dashboard/RecentTable'

export const metadata: Metadata = {
  title: 'Panel de control',
}

export default async function DashboardPage() {
  await requireSession()

  const [totalPersons, withDemand, withPlaza, professionRaw, withoutProfession, recentPersons] =
    await Promise.all([
      prisma.person.count(),
      prisma.person.count({ where: { hasDemand: true } }),
      prisma.person.count({ where: { contractType: { not: null } } }),
      // Get ALL profession/count pairs (no limit) — merging happens in JS
      prisma.$queryRaw<{ profession: string; count: bigint }[]>`
        SELECT TRIM(unnest("profession")) AS profession, COUNT(*)::bigint AS count
        FROM "Person"
        WHERE array_length("profession", 1) > 0
        GROUP BY 1
        ORDER BY count DESC
      `,
      // Count people with empty profession array
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "Person"
        WHERE "profession" = '{}'
           OR "profession" IS NULL
      `,
      prisma.person.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id:           true,
          fullName:     true,
          dni:          true,
          hasDemand:    true,
          contractType: true,
          createdAt:    true,
        },
      }),
    ])

  // Merge gender variants ("Abogado" + "Abogada" → single entry)
  const rawRows = professionRaw.map((r) => ({
    profession: r.profession,
    count: Number(r.count),
  }))
  const merged = mergeProfessions(rawRows, 10)

  const professionData: ProfessionStat[] = merged.map((g) => ({
    profession: g.display,
    count: g.count,
  }))

  const noProfessionCount = Number(withoutProfession[0]?.count ?? 0)

  const persons: RecentPerson[] = recentPersons.map((p) => ({
    ...p,
    contractType: p.contractType ?? null,
  }))

  return (
    <div className="px-6 py-7 lg:px-8 lg:py-8 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <header className="mb-7">
        <h1 className="text-[1.6rem] font-semibold text-foreground leading-tight">
          Panel de control
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen del registro laboral
        </p>
      </header>

      {/* Stats cards */}
      <StatsGrid stats={{ total: totalPersons, withDemand, withPlaza }} />

      {/* Profession distribution */}
      <section className="mt-6">
        <ProfessionChart
          data={professionData}
          total={totalPersons}
          withoutProfession={noProfessionCount}
        />
      </section>

      {/* Recent persons table */}
      <section className="mt-6">
        <h2 className="text-[1.05rem] font-semibold text-foreground mb-3">
          Últimas personas registradas
        </h2>
        <RecentTable persons={persons} />
      </section>
    </div>
  )
}
