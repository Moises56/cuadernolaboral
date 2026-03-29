'use client'

import { useState } from 'react'
import { Briefcase, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/Sidebar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import type { SessionPayload } from '@/types'

interface MobileHeaderProps {
  personCount?: number
  session:      SessionPayload
}

export function MobileHeader({ personCount = 0, session }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="lg:hidden sticky top-0 z-20 flex h-14 items-center
                       justify-between border-b border-sidebar-border
                       bg-sidebar px-3 gap-2">
      {/* Izquierda — hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menú de navegación"
              className="h-9 w-9 text-sidebar-foreground
                         hover:bg-sidebar-accent hover:text-sidebar-foreground
                         shrink-0"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>

        {/* El panel del sidebar usa bg-sidebar para coherencia */}
        <SheetContent
          side="left"
          className="w-60 p-0 border-r border-sidebar-border bg-sidebar"
        >
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <Sidebar personCount={personCount} session={session} />
        </SheetContent>
      </Sheet>

      {/* Centro — identidad de marca */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-center">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg
                        bg-primary text-primary-foreground shrink-0">
          <Briefcase className="w-[14px] h-[14px]" />
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground
                         tracking-tight truncate">
          CuadernoLaboral
        </span>
      </div>

      {/* Derecha — toggle de tema compacto */}
      <ThemeToggle compact />
    </header>
  )
}
