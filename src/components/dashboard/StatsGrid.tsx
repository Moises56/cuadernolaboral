'use client'

import { useRef } from 'react'
import { Users, AlertTriangle, Building2, Clock } from 'lucide-react'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { cn } from '@/lib/utils'

const ICONS = { Users, AlertTriangle, Building2, Clock } as const
type IconKey = keyof typeof ICONS
type StatColor = 'primary' | 'accent' | 'green' | 'muted'

export interface StatItem {
  label: string
  value: number
  icon: IconKey
  color: StatColor
}

const COLOR_MAP: Record<StatColor, { wrap: string; icon: string }> = {
  primary: { wrap: 'bg-primary/10',      icon: 'text-primary' },
  accent:  { wrap: 'bg-destructive-bg',  icon: 'text-destructive' },
  green:   { wrap: 'bg-success-bg',      icon: 'text-success' },
  muted:   { wrap: 'bg-muted',           icon: 'text-muted-foreground' },
}

export function StatsGrid({ stats }: { stats: StatItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const counterRefs  = useRef<(HTMLSpanElement | null)[]>([])

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      // Always resolve counters to final value
      const resolveCounters = () => {
        counterRefs.current.forEach((el, i) => {
          if (el) el.textContent = stats[i]?.value.toString() ?? '0'
        })
      }

      if (prefersReduced) {
        resolveCounters()
        return
      }

      // Card entrance
      gsap.fromTo(
        '.stat-card',
        { y: 24, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: ANIM.duration.normal,
          ease: ANIM.ease.smooth,
          stagger: ANIM.stagger.cards,
        },
      )

      // Counter animations
      counterRefs.current.forEach((el, i) => {
        if (!el) return
        const target = stats[i]?.value ?? 0
        const obj = { val: 0 }
        gsap.fromTo(
          obj,
          { val: 0 },
          {
            val: target,
            duration: 1.2,
            ease: 'power2.out',
            delay: i * ANIM.stagger.cards,
            onUpdate() {
              el.textContent = Math.round(obj.val).toString()
            },
            onComplete() {
              el.textContent = target.toString()
            },
          },
        )
      })
    },
    { scope: containerRef, dependencies: [stats] },
  )

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {stats.map((stat, i) => {
        const Icon   = ICONS[stat.icon]
        const colors = COLOR_MAP[stat.color]

        return (
          <div
            key={stat.label}
            className="stat-card bg-card rounded-xl border border-border p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className="mt-2 text-[2rem] font-semibold font-mono leading-none tracking-tight text-foreground">
                  <span ref={(el) => { counterRefs.current[i] = el }}>0</span>
                </p>
              </div>
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                  colors.wrap,
                )}
              >
                <Icon className={cn('w-5 h-5', colors.icon)} aria-hidden="true" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
