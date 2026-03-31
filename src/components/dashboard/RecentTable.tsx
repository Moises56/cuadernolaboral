'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { gsap, ScrollTrigger, useGSAP, ANIM } from '@/lib/gsap.config'
import { Badge } from '@/components/ui/badge'

// Silence unused import warning — ScrollTrigger registered via gsap.config
void ScrollTrigger

export interface RecentPerson {
  id: string
  fullName: string
  dni: string
  hasDemand: boolean
  contractType: string | null
  createdAt: string // pre-formatted on server to avoid hydration mismatch
}

export function RecentTable({ persons }: { persons: RecentPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router       = useRouter()

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (prefersReduced) return

      gsap.fromTo(
        '.recent-row',
        { y: 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: ANIM.duration.fast,
          ease: ANIM.ease.enter,
          stagger: 0.08,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
            once: true,
          },
        },
      )
    },
    { scope: containerRef },
  )

  if (persons.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-10 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No hay personas registradas aún.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Nombre completo
              </th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground font-mono whitespace-nowrap">
                DNI
              </th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Demanda
              </th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Contrato
              </th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">
                Registrado
              </th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person) => (
              <tr
                key={person.id}
                onClick={() => router.push(`/personas/${person.id}`)}
                className="recent-row border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
              >
                <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap hover:text-primary transition-colors">
                  {person.fullName}
                </td>
                <td className="px-5 py-3.5 font-mono text-muted-foreground whitespace-nowrap">
                  {person.dni}
                </td>
                <td className="px-5 py-3.5">
                  {person.hasDemand ? (
                    <Badge
                      variant="outline"
                      className="bg-destructive-bg text-destructive border-destructive/30 text-xs font-medium"
                    >
                      Con demanda
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-success-bg text-success-foreground border-success/30 text-xs font-medium"
                    >
                      Sin demanda
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                  {person.contractType ?? '—'}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap font-mono text-xs">
                  {person.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
