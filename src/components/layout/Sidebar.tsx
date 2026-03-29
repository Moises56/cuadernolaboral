'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/app/actions/auth.actions'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import type { SessionPayload } from '@/types'

const NAV_ITEMS = [
  { href: '/',              label: 'Inicio',        icon: LayoutDashboard },
  { href: '/personas',      label: 'Personas',       icon: Users },
  { href: '/configuracion', label: 'Configuración',  icon: Settings },
] as const

interface SidebarProps {
  personCount?: number
  session:      SessionPayload
}

export function Sidebar({ personCount = 0, session }: SidebarProps) {
  const pathname = usePathname()
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return

      gsap.fromTo(
        container.current,
        { x: -16, opacity: 0 },
        { x: 0, opacity: 1, duration: ANIM.duration.normal, ease: ANIM.ease.enter },
      )

      gsap.fromTo(
        '.nav-item',
        { x: -12, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: ANIM.duration.fast,
          ease: ANIM.ease.enter,
          stagger: ANIM.stagger.list,
          delay: 0.2,
        },
      )
    },
    { scope: container },
  )

  return (
    <div ref={container} className="flex flex-col h-full w-full bg-sidebar">
      {/* Logo header */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shrink-0">
          <Briefcase className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[14px] tracking-tight text-foreground leading-tight truncate">
            CuadernoLaboral
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">Registro Laboral</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px]',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold border-l-[3px] border-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
              style={isActive ? { paddingLeft: 'calc(0.75rem - 3px)' } : {}}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — sesión de usuario */}
      <div className="px-4 py-4 border-t border-border space-y-3 shrink-0">
        {/* Info del usuario */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0" aria-hidden="true">
            <span className="text-[11px] font-bold text-primary">
              {session.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">
              {session.displayName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {session.role === 'ADMIN' ? 'Administrador' : 'Solo lectura'}
            </p>
          </div>
        </div>

        {/* Badge de rol */}
        <div
          className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full w-fit',
            session.role === 'ADMIN'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {session.role === 'ADMIN' ? '● Admin' : '● Viewer'}
        </div>

        {/* Toggle de tema */}
        <ThemeToggle />

        {/* Contador + logout */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            <span className="font-medium">{personCount}</span>{' '}
            {personCount === 1 ? 'persona' : 'personas'}
          </p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-3 h-3" aria-hidden="true" />
              Salir
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
