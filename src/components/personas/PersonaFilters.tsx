'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'

interface ProfessionOption {
  value: string
  label: string
}

interface PersonaFiltersProps {
  currentQ:          string
  currentDemanda:    string
  currentPlaza:      string
  currentProfesion:  string
  professionOptions: ProfessionOption[]
}

export function PersonaFilters({
  currentQ,
  currentDemanda,
  currentPlaza,
  currentProfesion,
  professionOptions,
}: PersonaFiltersProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const advancedRef  = useRef<HTMLDivElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show advanced panel if any advanced filter is active
  const [showAdvanced, setShowAdvanced] = useState(
    currentDemanda !== 'all' || currentPlaza !== 'all' || currentProfesion !== 'all',
  )

  // ── URL helpers ──────────────────────────────────────────────────────────
  function buildUrl(
    key: string,
    value: string,
    extra?: Record<string, string | null>,
  ): string {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('pagina') // reset to page 1 on filter change
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => {
        if (v === null) params.delete(k)
        else params.set(k, v)
      })
    }
    const qs = params.toString()
    return `/personas${qs ? `?${qs}` : ''}`
  }

  // ── Debounced search ─────────────────────────────────────────────────────
  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        router.push(buildUrl('q', value))
      }, 300)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams],
  )

  function handleClear() {
    router.push('/personas')
  }

  const hasActiveFilters =
    currentQ || currentDemanda !== 'all' || currentPlaza !== 'all' || currentProfesion !== 'all'

  const activeAdvancedCount = [
    currentDemanda   !== 'all',
    currentPlaza     !== 'all',
    currentProfesion !== 'all',
  ].filter(Boolean).length

  // ── GSAP: slide-in advanced panel ────────────────────────────────────────
  useGSAP(
    () => {
      if (!advancedRef.current || !showAdvanced) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      gsap.fromTo(
        advancedRef.current,
        { opacity: 0, y: -6, scaleY: 0.96, transformOrigin: 'top center' },
        {
          opacity:  1,
          y:        0,
          scaleY:   1,
          duration: ANIM.duration.fast,
          ease:     ANIM.ease.enter,
        },
      )
    },
    { dependencies: [showAdvanced] },
  )

  return (
    <div className="space-y-2">
      {/* ── Main filter bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por nombre, DNI o profesión…"
            defaultValue={currentQ}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          />
        </div>

        {/* Advanced filters toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
            showAdvanced
              ? 'border-primary/30 bg-primary/8 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          Filtros
          {activeAdvancedCount > 0 && (
            <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground leading-none">
              {activeAdvancedCount}
            </span>
          )}
        </button>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="size-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* ── Advanced filters panel ───────────────────────────────────────── */}
      {showAdvanced && (
        <div
          ref={advancedRef}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
        >
          {/* Demanda */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Demanda
            </label>
            <select
              value={currentDemanda}
              onChange={(e) => router.push(buildUrl('demanda', e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="con">Con demanda</option>
              <option value="sin">Sin demanda</option>
            </select>
          </div>

          {/* Plaza */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Plaza
            </label>
            <select
              value={currentPlaza}
              onChange={(e) => router.push(buildUrl('plaza', e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="all">Todas</option>
              <option value="asignada">Asignada</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>

          {/* Profesión */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Profesión
            </label>
            <select
              value={currentProfesion}
              onChange={(e) => router.push(buildUrl('profesion', e.target.value))}
              className="h-7 max-w-[220px] rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer truncate"
            >
              <option value="all">Todas</option>
              {professionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="_none">Sin profesión</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
