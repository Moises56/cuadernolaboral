'use client'

import { useRef, useState } from 'react'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import {
  GripVertical,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { deleteFieldAction, toggleFieldAction } from '@/app/actions/form-config.actions'
import type { FormFieldConfig } from '@/generated/prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ─── Field type labels ───────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  TEXT:     'Texto',
  NUMBER:   'Número',
  DATE:     'Fecha',
  BOOLEAN:  'Sí / No',
  SELECT:   'Selección',
  TEXTAREA: 'Texto largo',
  EMAIL:    'Email',
  PHONE:    'Teléfono',
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface FieldCardProps {
  field: FormFieldConfig
  isDragging?: boolean
  dragHandleListeners?: SyntheticListenerMap | undefined
  isMobile?: boolean
  isFirst?: boolean
  isLast?: boolean
  isSelected?: boolean
  onEdit: (field: FormFieldConfig) => void
  onDeleteComplete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

// ─── FieldCard ────────────────────────────────────────────────────────────────

export function FieldCard({
  field,
  isDragging = false,
  dragHandleListeners,
  isMobile = false,
  isFirst = false,
  isLast = false,
  isSelected = false,
  onEdit,
  onDeleteComplete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: FieldCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [toggling, setToggling]       = useState(false)
  const [deleting, setDeleting]       = useState(false)

  // GSAP hover — desktop only
  useGSAP(
    () => {
      const card = cardRef.current
      if (!card || isMobile) return

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return

      const onEnter = () =>
        gsap.to(card, {
          scale: 1.01,
          boxShadow: '0 4px 12px rgba(30,58,95,0.12)',
          duration: ANIM.duration.micro,
          ease: ANIM.ease.enter,
        })

      const onLeave = () =>
        gsap.to(card, {
          scale: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          duration: ANIM.duration.micro,
          ease: ANIM.ease.exit,
        })

      card.addEventListener('mouseenter', onEnter)
      card.addEventListener('mouseleave', onLeave)

      return () => {
        card.removeEventListener('mouseenter', onEnter)
        card.removeEventListener('mouseleave', onLeave)
      }
    },
    { scope: cardRef, dependencies: [isMobile] },
  )

  // ─── Toggle active ──────────────────────────────────────────────────────

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    onToggle(field.id, !field.active) // optimistic
    const result = await toggleFieldAction(field.id)
    if (!result.success) {
      onToggle(field.id, field.active) // rollback
      toast.error(result.error)
    }
    setToggling(false)
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (deleting) return
    setDeleting(true)
    setDeleteOpen(false)

    const result = await deleteFieldAction(field.id)

    if (!result.success) {
      toast.error(result.error)
      setDeleting(false)
      return
    }

    // Animate out then remove from parent state
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReduced && cardRef.current) {
      gsap.to(cardRef.current, {
        x: 20,
        opacity: 0,
        scaleY: 0.85,
        transformOrigin: 'top center',
        duration: ANIM.duration.fast,
        ease: ANIM.ease.exit,
        onComplete: () => onDeleteComplete(field.id),
      })
    } else {
      onDeleteComplete(field.id)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={cardRef}
      data-field-id={field.id}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg border bg-card transition-colors',
        isDragging
          ? 'border-primary/40 bg-primary/5 opacity-80'
          : isSelected
          ? 'border-primary/40 bg-primary/5'
          : 'border-border',
        !field.active && 'opacity-60',
      )}
    >
      {/* Drag handle — desktop only */}
      {!isMobile && (
        <button
          {...dragHandleListeners}
          className="touch-none cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
          aria-label="Arrastrar para reordenar"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Mobile move buttons — gesture-alternative (ui-ux-pro-max) */}
      {isMobile && (
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => onMoveUp(field.id)}
            disabled={isFirst}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Mover arriba"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(field.id)}
            disabled={isLast}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Mover abajo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        {/* Core badge */}
        {field.isCore && (
          <Badge variant="outline" className="shrink-0 text-[10px] text-teal-foreground bg-teal/10 border-teal/30 font-medium">
            Base
          </Badge>
        )}

        {/* Type badge */}
        <Badge variant="secondary" className="shrink-0 text-[11px] font-mono">
          {TYPE_LABELS[field.type] ?? field.type}
        </Badge>

        {/* Label */}
        <span className="text-sm font-medium text-foreground truncate">
          {field.label}
        </span>

        {/* fieldKey */}
        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
          {field.fieldKey}
        </span>

        {/* Required badge */}
        {field.required && (
          <Badge variant="outline" className="shrink-0 text-[10px] bg-caution-bg text-caution-foreground border-caution/30">
            Requerido
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Active toggle */}
        <Switch
          checked={field.active}
          onCheckedChange={handleToggle}
          disabled={toggling}
          size="sm"
          aria-label={field.active ? 'Desactivar campo' : 'Activar campo'}
        />

        {/* Edit */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onEdit(field)}
          aria-label="Editar campo"
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>

        {/* Delete — oculto para campos base */}
        {!field.isCore && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Eliminar campo"
                className="text-muted-foreground hover:text-destructive"
                disabled={deleting}
              />
            }
          >
            <Trash2 className="w-3.5 h-3.5" />
          </DialogTrigger>

          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>¿Eliminar campo?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se eliminará <strong className="text-foreground">{field.label}</strong>.
              {' '}Esta acción no se puede deshacer.
            </p>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>
    </div>
  )
}
