import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { StatsGrid, type StatItem } from '@/components/dashboard/StatsGrid'
import { RecentTable, type RecentPerson } from '@/components/dashboard/RecentTable'

export const metadata: Metadata = {
  title: 'Panel de control',
}

export default async function DashboardPage() {
  await requireSession()
  const [totalPersons, withDemand, withPlaza, recentPersons] =
    await Promise.all([
      prisma.person.count(),
      prisma.person.count({ where: { hasDemand: true } }),
      prisma.person.count({ where: { contractType: { not: null } } }),
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

  const stats: StatItem[] = [
    {
      label: 'Total registradas',
      value: totalPersons,
      icon:  'Users',
      color: 'primary',
    },
    {
      label: 'Con demanda',
      value: withDemand,
      icon:  'AlertTriangle',
      color: 'accent',
    },
    {
      label: 'Con plaza asignada',
      value: withPlaza,
      icon:  'Building2',
      color: 'green',
    },
    {
      label: 'Sin plaza aún',
      value: totalPersons - withPlaza,
      icon:  'Clock',
      color: 'muted',
    },
  ]

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
      <StatsGrid stats={stats} />

      {/* Recent persons table */}
      <section className="mt-8">
        <h2 className="text-[1.05rem] font-semibold text-foreground mb-3">
          Últimas personas registradas
        </h2>
        <RecentTable persons={persons} />
      </section>
    </div>
  )
}
