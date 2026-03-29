import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { PageTransition } from '@/components/layout/PageTransition'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, personCount] = await Promise.all([
    requireSession(),
    prisma.person.count(),
  ])

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — fixed panel, always visible >= 1024px */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 border-r border-border bg-sidebar z-30">
        <Sidebar personCount={personCount} session={session} />
      </aside>

      {/* Main area — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 lg:pl-60 min-w-0">
        {/* Mobile header — only visible < 1024px */}
        <MobileHeader personCount={personCount} session={session} />
        <main className="flex-1 p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
