'use client'

import { useRef } from 'react'
import {
  Users,
  AlertTriangle,
  Building2,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────────── */

export interface DashboardStats {
  total:      number
  withDemand: number
  withPlaza:  number
}

interface FractionCard {
  label:   string
  value:   number
  total:   number
  icon:    LucideIcon
  color:   'accent' | 'green' | 'muted'
}

const COLOR: Record<FractionCard['color'], {
  icon: string; bar: string; bg: string; badge: string
}> = {
  accent: {
    icon:  'text-destructive',
    bar:   'bg-destructive',
    bg:    'bg-destructive-bg',
    badge: 'text-destructive bg-destructive-bg',
  },
  green: {
    icon:  'text-success',
    bar:   'bg-success',
    bg:    'bg-success-bg',
    badge: 'text-success-foreground bg-success-bg',
  },
  muted: {
    icon:  'text-caution-foreground',
    bar:   'bg-caution',
    bg:    'bg-caution-bg',
    badge: 'text-caution-foreground bg-caution-bg',
  },
}

/* ── Component ─────────────────────────────────────────────────────── */

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef      = useRef<HTMLSpanElement>(null)
  const fracRefs     = useRef<(HTMLSpanElement | null)[]>([])
  const barRefs      = useRef<(HTMLDivElement | null)[]>([])
  const pctRefs      = useRef<(HTMLSpanElement | null)[]>([])

  const cards: FractionCard[] = [
    {
      label: 'Con demanda',
      value: stats.withDemand,
      total: stats.total,
      icon:  AlertTriangle,
      color: 'accent',
    },
    {
      label: 'Con plaza asignada',
      value: stats.withPlaza,
      total: stats.total,
      icon:  Building2,
      color: 'green',
    },
    {
      label: 'Sin plaza aún',
      value: stats.total - stats.withPlaza,
      total: stats.total,
      icon:  Clock,
      color: 'muted',
    },
  ]

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      // Resolve all counters immediately if reduced motion
      const resolveFinal = () => {
        if (heroRef.current) heroRef.current.textContent = stats.total.toString()
        cards.forEach((c, i) => {
          const el  = fracRefs.current[i]
          const pct = pctRefs.current[i]
          const bar = barRefs.current[i]
          if (el) el.textContent = c.value.toString()
          if (pct) pct.textContent = stats.total > 0
            ? `${Math.round((c.value / stats.total) * 100)}%`
            : '0%'
          if (bar) bar.style.width = stats.total > 0
            ? `${(c.value / stats.total) * 100}%`
            : '0%'
        })
      }

      if (prefersReduced) { resolveFinal(); return }

      // ─ Hero card entrance
      gsap.fromTo(
        '.stat-hero',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: ANIM.duration.normal, ease: ANIM.ease.smooth },
      )

      // ─ Hero counter
      if (heroRef.current) {
        const obj = { val: 0 }
        gsap.to(obj, {
          val: stats.total,
          duration: 1.4,
          ease: 'power2.out',
          onUpdate() { heroRef.current!.textContent = Math.round(obj.val).toString() },
          onComplete() { heroRef.current!.textContent = stats.total.toString() },
        })
      }

      // ─ Fraction cards entrance (stagger)
      gsap.fromTo(
        '.stat-fraction',
        { y: 24, opacity: 0, scale: 0.97 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: ANIM.duration.normal,
          ease: ANIM.ease.smooth,
          stagger: ANIM.stagger.cards,
          delay: 0.15,
        },
      )

      // ─ Fraction counters + percentage bars
      cards.forEach((card, i) => {
        const el  = fracRefs.current[i]
        const pct = pctRefs.current[i]
        const bar = barRefs.current[i]
        const pctVal = stats.total > 0 ? (card.value / stats.total) * 100 : 0
        const delay = 0.25 + i * ANIM.stagger.cards

        // Animated numerator
        if (el) {
          const obj = { val: 0 }
          gsap.to(obj, {
            val: card.value,
            duration: 1.2,
            ease: 'power2.out',
            delay,
            onUpdate() { el.textContent = Math.round(obj.val).toString() },
            onComplete() { el.textContent = card.value.toString() },
          })
        }

        // Animated percentage text
        if (pct) {
          const obj = { val: 0 }
          gsap.to(obj, {
            val: pctVal,
            duration: 1.2,
            ease: 'power2.out',
            delay,
            onUpdate() { pct.textContent = `${Math.round(obj.val)}%` },
            onComplete() { pct.textContent = `${Math.round(pctVal)}%` },
          })
        }

        // Animated bar width
        if (bar) {
          gsap.fromTo(
            bar,
            { width: '0%' },
            { width: `${pctVal}%`, duration: 1, ease: 'power2.out', delay: delay + 0.2 },
          )
        }
      })
    },
    { scope: containerRef, dependencies: [stats] },
  )

  return (
    <div ref={containerRef} className="space-y-4">
      {/* ── Hero: Total ───────────────────────────────────────────── */}
      <div className="stat-hero bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Total de personas registradas
            </p>
            <p className="mt-2 text-[2.8rem] font-bold font-mono leading-none tracking-tight text-foreground">
              <span ref={heroRef}>0</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              personas en el sistema
            </p>
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 shrink-0">
            <Users className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ── Fraction cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const c = COLOR[card.color]
          return (
            <div
              key={card.label}
              className="stat-fraction bg-card rounded-xl border border-border p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">
                    {card.label}
                  </p>
                  {/* Fraction: value / total */}
                  <p className="mt-2 font-mono leading-none tracking-tight text-foreground flex items-baseline gap-1">
                    <span
                      ref={(el) => { fracRefs.current[i] = el }}
                      className="text-[1.8rem] font-semibold"
                    >
                      0
                    </span>
                    <span className="text-base text-muted-foreground font-normal">
                      / {card.total}
                    </span>
                  </p>
                </div>
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                  c.bg,
                )}>
                  <card.icon className={cn('w-5 h-5', c.icon)} aria-hidden="true" />
                </div>
              </div>

              {/* Progress bar + percentage */}
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    ref={(el) => { barRefs.current[i] = el }}
                    className={cn('h-full rounded-full', c.bar)}
                    style={{ width: '0%' }}
                  />
                </div>
                <div className="flex justify-end">
                  <span
                    ref={(el) => { pctRefs.current[i] = el }}
                    className={cn(
                      'text-xs font-mono font-medium px-1.5 py-0.5 rounded',
                      c.badge,
                    )}
                  >
                    0%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
