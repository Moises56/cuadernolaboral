'use client'

import { useRef } from 'react'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  hasDemand:    boolean
  workPlace:    string | null
  contractType: 'ACUERDO' | 'CONTRATO' | null
}

export function StatusBadge({ hasDemand, workPlace, contractType }: StatusBadgeProps) {
  const badgeRef = useRef<HTMLSpanElement>(null)
  const status   = `${hasDemand}-${workPlace}-${contractType}`

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    gsap.fromTo(
      badgeRef.current,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.25, ease: ANIM.ease.enter },
    )
  }, { dependencies: [status] })

  // ── Derive label + styles ────────────────────────────────────────────────
  let label: string
  let styles: string

  if (workPlace) {
    const shortPlace = workPlace.length > 20 ? `${workPlace.slice(0, 18)}…` : workPlace
    if (contractType === 'ACUERDO') {
      label  = `Acuerdo — ${shortPlace}`
      styles = 'bg-primary-subtle text-primary border border-primary/20'
    } else {
      label  = `Contrato — ${shortPlace}`
      styles = 'bg-success-bg text-success-foreground border border-success/30'
    }
  } else if (hasDemand) {
    label  = 'Con demanda — Pendiente'
    styles = 'bg-destructive-bg text-destructive border border-destructive/30'
  } else {
    label  = 'Pendiente de plaza'
    styles = 'bg-caution-bg text-caution-foreground border border-caution/30'
  }

  return (
    <span
      ref={badgeRef}
      className={cn(
        'inline-flex items-center text-[0.7rem] font-medium px-2 py-0.5 rounded-md max-w-[200px] truncate',
        styles,
      )}
      title={workPlace ?? undefined}
    >
      {label}
    </span>
  )
}
