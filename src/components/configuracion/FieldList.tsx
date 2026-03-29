'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { reorderFieldsAction } from '@/app/actions/form-config.actions'
import type { FormFieldConfig } from '@/generated/prisma/client'
import { Button } from '@/components/ui/button'
import { FieldCard } from '@/components/configuracion/FieldCard'
import { FieldEditor } from '@/components/configuracion/FieldEditor'

// ─── SortableItem wrapper ─────────────────────────────────────────────────────

interface SortableItemProps {
  field: FormFieldConfig
  isMobile: boolean
  isFirst: boolean
  isLast: boolean
  isSelected: boolean
  onEdit: (field: FormFieldConfig) => void
  onDeleteComplete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

function SortableItem({
  field,
  isMobile,
  isFirst,
  isLast,
  isSelected,
  onEdit,
  onDeleteComplete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <FieldCard
        field={field}
        isDragging={isDragging}
        dragHandleListeners={isMobile ? undefined : listeners}
        isMobile={isMobile}
        isFirst={isFirst}
        isLast={isLast}
        isSelected={isSelected}
        onEdit={onEdit}
        onDeleteComplete={onDeleteComplete}
        onToggle={onToggle}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  )
}

// ─── FieldList ─────────────────────────────────────────────────────────────────

interface FieldListProps {
  initialFields: FormFieldConfig[]
}

export function FieldList({ initialFields }: FieldListProps) {
  const [items, setItems]           = useState<FormFieldConfig[]>(initialFields)
  const [selectedField, setSelectedField] = useState<FormFieldConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  // Mobile detection via useSyncExternalStore — avoids setState-in-effect rule
  const isMobile = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia('(max-width: 767px)')
      mq.addEventListener('change', callback)
      return () => mq.removeEventListener('change', callback)
    },
    () => window.matchMedia('(max-width: 767px)').matches,
    () => false,
  )

  // Transient ref — avoids re-renders when just storing ordered IDs for background sync
  const orderedIdsRef = useRef<string[]>(items.map(i => i.id))

  const listRef = useRef<HTMLDivElement>(null)

  // DnD sensors — ui-ux-pro-max: drag-threshold rule (distance: 8)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Stagger entrance animation on mount
  useGSAP(
    () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced || items.length === 0) return

      gsap.fromTo(
        '.field-card-item',
        { y: 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: ANIM.duration.fast,
          ease: ANIM.ease.enter,
          stagger: ANIM.stagger.cards,
        },
      )
    },
    { scope: listRef, dependencies: [] }, // run once on mount
  )

  // ─── Drag end ──────────────────────────────────────────────────────────────

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex  = items.findIndex(i => i.id === over.id)
    const newItems  = arrayMove(items, oldIndex, newIndex)

    // Optimistic update
    setItems(prev => arrayMove(prev, oldIndex, newIndex))
    orderedIdsRef.current = newItems.map(i => i.id)

    // GSAP: pulse on dropped card
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReduced) {
      gsap.fromTo(
        `[data-field-id="${active.id}"]`,
        { scale: 1.03 },
        { scale: 1, duration: ANIM.duration.fast, ease: ANIM.ease.spring },
      )
    }

    // Persist in background
    const result = await reorderFieldsAction(orderedIdsRef.current)
    if (!result.success) {
      toast.error('Error al guardar el orden')
      setItems(initialFields) // rollback
    }
  }

  // ─── Mobile move up / down ────────────────────────────────────────────────

  const handleMoveUp = (id: string) => {
    const index = items.findIndex(i => i.id === id)
    if (index <= 0) return
    const newItems = arrayMove(items, index, index - 1)
    setItems(newItems)
    orderedIdsRef.current = newItems.map(i => i.id)
    reorderFieldsAction(orderedIdsRef.current).then(r => {
      if (!r.success) toast.error('Error al guardar el orden')
    })
  }

  const handleMoveDown = (id: string) => {
    const index = items.findIndex(i => i.id === id)
    if (index >= items.length - 1) return
    const newItems = arrayMove(items, index, index + 1)
    setItems(newItems)
    orderedIdsRef.current = newItems.map(i => i.id)
    reorderFieldsAction(orderedIdsRef.current).then(r => {
      if (!r.success) toast.error('Error al guardar el orden')
    })
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDeleteComplete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    if (selectedField?.id === id) setSelectedField(null)
  }

  // ─── Toggle active ──────────────────────────────────────────────────────

  const handleToggle = (id: string, active: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, active } : i))
  }

  // ─── Editor callbacks ────────────────────────────────────────────────────

  const handleSaved = (field: FormFieldConfig) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === field.id)
      if (exists) {
        return prev.map(i => i.id === field.id ? field : i)
      }
      return [...prev, field]
    })
    setSelectedField(null)
    setIsCreating(false)
  }

  const handleCancel = () => {
    setSelectedField(null)
    setIsCreating(false)
  }

  const handleEdit = (field: FormFieldConfig) => {
    setSelectedField(field)
    setIsCreating(false)
  }

  const handleNewField = () => {
    setSelectedField(null)
    setIsCreating(true)
  }

  const showEditor = isCreating || selectedField !== null

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Column 1: Field list (2/3) */}
      <div className="lg:col-span-2 space-y-3" ref={listRef}>
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? 'No hay campos configurados'
              : `${items.length} ${items.length === 1 ? 'campo' : 'campos'} configurados`}
          </p>
          <Button
            size="sm"
            onClick={handleNewField}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo campo
          </Button>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Agrega campos personalizados para el formulario de registro
            </p>
          </div>
        )}

        {/* Sortable list */}
        {items.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((field, index) => (
                  <div key={field.id} className="field-card-item">
                    <SortableItem
                      field={field}
                      isMobile={isMobile}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      isSelected={selectedField?.id === field.id}
                      onEdit={handleEdit}
                      onDeleteComplete={handleDeleteComplete}
                      onToggle={handleToggle}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Column 2: Editor (1/3) */}
      <div className="lg:col-span-1">
        {showEditor ? (
          <FieldEditor
            key={selectedField?.id ?? 'new'}
            field={selectedField}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">
              Selecciona un campo para editarlo o crea uno nuevo
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
