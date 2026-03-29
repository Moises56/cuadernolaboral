'use client'
import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap.config'

export default function PersonasLoading() {
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
      aria-label="Cargando listado de personas"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton-item h-8 w-52 rounded-md bg-muted" />
          <div className="skeleton-item h-4 w-64 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="skeleton-item h-8 w-20 rounded-md bg-muted" />
          <div className="skeleton-item h-8 w-16 rounded-md bg-muted" />
          <div className="skeleton-item h-8 w-32 rounded-md bg-muted" />
        </div>
      </div>

      {/* Filters bar */}
      <div className="skeleton-item h-9 w-full max-w-sm rounded-md bg-muted mb-4" />

      {/* Table — 5 rows × 7 columns */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-secondary/40">
          <div className="skeleton-item size-8 rounded-full bg-muted shrink-0" />
          <div className="skeleton-item h-3.5 rounded bg-muted" style={{ width: 120 }} />
          <div className="skeleton-item h-3.5 rounded bg-muted" style={{ width: 88 }} />
          <div className="skeleton-item h-3.5 rounded bg-muted" style={{ width: 100 }} />
          <div className="skeleton-item h-3.5 rounded bg-muted" style={{ width: 64 }} />
          <div className="skeleton-item h-3.5 rounded bg-muted" style={{ width: 80 }} />
          <div className="skeleton-item size-5 rounded bg-muted ml-auto shrink-0" />
        </div>

        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div
            key={row}
            className="skeleton-item flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          >
            <div className="size-8 rounded-full bg-muted/70 shrink-0" />
            <div className="h-4 rounded bg-muted/70" style={{ width: 140 + (row % 3) * 24 }} />
            <div className="h-4 w-24 rounded bg-muted/70 font-mono shrink-0" />
            <div className="h-4 rounded bg-muted/70" style={{ width: 90 + (row % 2) * 20 }} />
            <div className="h-5 rounded-full bg-muted/70 shrink-0" style={{ width: 68 }} />
            <div className="h-4 rounded bg-muted/70" style={{ width: 80 + (row % 2) * 16 }} />
            <div className="size-7 rounded bg-muted/70 ml-auto shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
