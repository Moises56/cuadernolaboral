'use client'
import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap.config'

export default function DashboardLoading() {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (prefersReduced) return

      gsap.to('.skeleton-item', {
        opacity: 0.4,
        duration: 0.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.1,
      })
    },
    { scope: container },
  )

  return (
    <div
      ref={container}
      className="px-6 py-7 lg:px-8 lg:py-8 max-w-[1400px] mx-auto w-full"
      aria-busy="true"
      aria-label="Cargando panel de control"
    >
      {/* Header */}
      <div className="mb-7 space-y-2">
        <div className="skeleton-item h-8 w-56 rounded-md bg-muted" />
        <div className="skeleton-item h-4 w-40 rounded bg-muted" />
      </div>

      {/* Stats grid — 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-item rounded-xl border border-border bg-white h-28"
          />
        ))}
      </div>

      {/* Recent table skeleton */}
      <div className="mt-8">
        <div className="skeleton-item h-5 w-52 rounded bg-muted mb-4" />
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-secondary/40">
            <div className="skeleton-item h-3.5 rounded bg-muted" style={{ width: 140 }} />
            <div className="skeleton-item h-3.5 rounded bg-muted" style={{ width: 96 }} />
            <div className="skeleton-item h-3.5 rounded bg-muted ml-auto" style={{ width: 80 }} />
          </div>
          {/* Data rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-item flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
            >
              <div className="h-4 rounded bg-muted/70" style={{ width: 150 + (i % 3) * 20 }} />
              <div className="h-4 w-24 rounded bg-muted/70 shrink-0" />
              <div className="h-5 rounded-full bg-muted/70 shrink-0" style={{ width: 64 }} />
              <div className="h-4 rounded bg-muted/70 ml-auto" style={{ width: 80 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
