'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { gsap, ANIM } from '@/lib/gsap.config'

interface ThemeToggleProps {
  /** Modo compacto: solo ícono, sin texto — para uso en el navbar */
  compact?: boolean
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const iconRef = useRef<HTMLSpanElement>(null)

  useEffect(() => setMounted(true), [])

  const handleToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReduced && iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { rotation: -45, scale: 0.5, opacity: 0 },
        {
          rotation: 0,
          scale:    1,
          opacity:  1,
          duration: ANIM.duration.fast,
          ease:     ANIM.ease.spring,
        },
      )
    }
  }

  const isDark = theme === 'dark'

  // Placeholder para evitar hydration mismatch
  if (!mounted) {
    return compact
      ? <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
      : <div className="h-8 w-full rounded-md bg-muted" />
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="h-9 w-9 flex items-center justify-center rounded-lg shrink-0
                   text-sidebar-foreground hover:bg-sidebar-accent
                   transition-colors duration-150 cursor-pointer"
      >
        <span ref={iconRef} className="flex items-center justify-center" data-gsap>
          {isDark
            ? <Sun  className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md
                 text-xs font-medium text-muted-foreground
                 hover:bg-sidebar-accent hover:text-foreground
                 transition-colors duration-150 cursor-pointer"
    >
      <span ref={iconRef} className="flex-shrink-0" data-gsap>
        {isDark
          ? <Sun  className="w-3.5 h-3.5" />
          : <Moon className="w-3.5 h-3.5" />
        }
      </span>
      <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  )
}
