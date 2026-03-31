'use client'

import { useRef } from 'react'
import { Briefcase } from 'lucide-react'
import { gsap, ScrollTrigger, useGSAP, ANIM } from '@/lib/gsap.config'

// Silence unused import — ScrollTrigger registered via gsap.config
void ScrollTrigger

export interface ProfessionStat {
  profession: string
  count:      number
}

export function ProfessionChart({
  data,
  total,
}: {
  data:  ProfessionStat[]
  total: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const barRefs      = useRef<(HTMLDivElement | null)[]>([])
  const countRefs    = useRef<(HTMLSpanElement | null)[]>([])

  const max = data[0]?.count ?? 1

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      if (prefersReduced) {
        data.forEach((item, i) => {
          const bar   = barRefs.current[i]
          const count = countRefs.current[i]
          if (bar) bar.style.width = `${(item.count / max) * 100}%`
          if (count) count.textContent = item.count.toString()
        })
        return
      }

      // Staggered row entrance
      gsap.fromTo(
        '.prof-row',
        { x: -16, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: ANIM.duration.fast,
          ease: ANIM.ease.enter,
          stagger: ANIM.stagger.list,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 88%',
            once: true,
          },
        },
      )

      // Animate each bar width + counter
      data.forEach((item, i) => {
        const bar   = barRefs.current[i]
        const count = countRefs.current[i]
        const delay = 0.3 + i * ANIM.stagger.list

        if (bar) {
          gsap.fromTo(
            bar,
            { width: '0%' },
            {
              width: `${(item.count / max) * 100}%`,
              duration: 0.8,
              ease: 'power2.out',
              delay,
              scrollTrigger: {
                trigger: containerRef.current,
                start: 'top 88%',
                once: true,
              },
            },
          )
        }

        if (count) {
          const obj = { val: 0 }
          gsap.to(obj, {
            val: item.count,
            duration: 0.8,
            ease: 'power2.out',
            delay,
            onUpdate() { count.textContent = Math.round(obj.val).toString() },
            onComplete() { count.textContent = item.count.toString() },
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top 88%',
              once: true,
            },
          })
        }
      })
    },
    { scope: containerRef, dependencies: [data] },
  )

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No hay profesiones registradas aún.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-secondary/30">
        <Briefcase className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          Distribución por profesión
        </h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {data.length} profesiones
        </span>
      </div>

      {/* Bars */}
      <div className="divide-y divide-border/50">
        {data.map((item, i) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0

          return (
            <div
              key={item.profession}
              className="prof-row flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors"
            >
              {/* Label */}
              <span className="text-sm text-foreground font-medium w-40 shrink-0 truncate">
                {item.profession}
              </span>

              {/* Bar */}
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  ref={(el) => { barRefs.current[i] = el }}
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: '0%' }}
                />
              </div>

              {/* Count + percentage */}
              <div className="flex items-center gap-2 shrink-0 w-20 justify-end">
                <span
                  ref={(el) => { countRefs.current[i] = el }}
                  className="text-sm font-mono font-semibold text-foreground tabular-nums"
                >
                  0
                </span>
                <span className="text-xs font-mono text-muted-foreground tabular-nums w-8 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
