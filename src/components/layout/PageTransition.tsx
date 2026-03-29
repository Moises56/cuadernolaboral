'use client'
import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (prefersReduced) return

      gsap.fromTo(
        container.current,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: ANIM.duration.fast,
          ease: ANIM.ease.enter,
        },
      )
    },
    { dependencies: [pathname], scope: container },
  )

  return <div ref={container}>{children}</div>
}
