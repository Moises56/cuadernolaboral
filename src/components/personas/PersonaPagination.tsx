'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PersonaPaginationProps {
  currentPage:  number
  totalPages:   number
  total:        number
  pageSize:     number
  paramsRecord: Record<string, string>
}

export function PersonaPagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  paramsRecord,
}: PersonaPaginationProps) {
  function buildPageHref(page: number): string {
    const params = new URLSearchParams(paramsRecord)
    if (page <= 1) {
      params.delete('pagina')
    } else {
      params.set('pagina', String(page))
    }
    const qs = params.toString()
    return `/personas${qs ? `?${qs}` : ''}`
  }

  const from = (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, total)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  // Compute visible page numbers (window of 5 centered around currentPage)
  const pageWindow: number[] = []
  const delta = 2
  for (
    let p = Math.max(1, currentPage - delta);
    p <= Math.min(totalPages, currentPage + delta);
    p++
  ) {
    pageWindow.push(p)
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      {/* Count info */}
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Mostrando{' '}
        <span className="font-medium text-foreground">{from}–{to}</span>{' '}
        de{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Prev */}
        <Link
          href={buildPageHref(currentPage - 1)}
          aria-disabled={!hasPrev}
          aria-label="Página anterior"
          className={`inline-flex size-8 items-center justify-center rounded-md border border-border transition-colors ${
            hasPrev
              ? 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              : 'pointer-events-none opacity-40 text-muted-foreground'
          }`}
        >
          <ChevronLeft className="size-4" />
        </Link>

        {/* First page + ellipsis */}
        {(pageWindow[0] ?? 1) > 1 && (
          <>
            <Link
              href={buildPageHref(1)}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              1
            </Link>
            {(pageWindow[0] ?? 1) > 2 && (
              <span className="px-1 text-xs text-muted-foreground/50">…</span>
            )}
          </>
        )}

        {/* Page window */}
        {pageWindow.map((p) => (
          <Link
            key={p}
            href={buildPageHref(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={`inline-flex size-8 items-center justify-center rounded-md border text-xs transition-colors ${
              p === currentPage
                ? 'border-primary bg-primary text-primary-foreground font-medium'
                : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {p}
          </Link>
        ))}

        {/* Ellipsis + last page */}
        {(pageWindow[pageWindow.length - 1] ?? totalPages) < totalPages && (
          <>
            {(pageWindow[pageWindow.length - 1] ?? totalPages) < totalPages - 1 && (
              <span className="px-1 text-xs text-muted-foreground/50">…</span>
            )}
            <Link
              href={buildPageHref(totalPages)}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {totalPages}
            </Link>
          </>
        )}

        {/* Next */}
        <Link
          href={buildPageHref(currentPage + 1)}
          aria-disabled={!hasNext}
          aria-label="Página siguiente"
          className={`inline-flex size-8 items-center justify-center rounded-md border border-border transition-colors ${
            hasNext
              ? 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              : 'pointer-events-none opacity-40 text-muted-foreground'
          }`}
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
