'use client'
import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap.config'

export default function ConfiguracionLoading() {
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
      className="max-w-5xl mx-auto space-y-6"
      aria-busy="true"
      aria-label="Cargando configuración"
    >
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="skeleton-item w-9 h-9 rounded-lg bg-muted shrink-0" />
        <div className="space-y-2">
          <div className="skeleton-item h-5 w-36 rounded bg-muted" />
          <div className="skeleton-item h-4 w-64 rounded bg-muted" />
        </div>
      </div>

      {/* Two-column: field list + editor */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Field list — 4 cards */}
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-item rounded-lg border border-border bg-white px-4 py-3 h-14"
            />
          ))}
        </div>

        {/* Editor panel */}
        <div className="skeleton-item rounded-lg border border-border bg-white h-72" />
      </div>
    </div>
  )
}
