'use client'

import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, FileCheck, FileSignature } from 'lucide-react'
import { toast } from 'sonner'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { plazaSchema, type PlazaFormValues } from '@/lib/validations/persona'
import { assignPlazaAction } from '@/app/actions/persona.actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AssignPlazaPerson {
  id:            string
  fullName:      string
  hasDemand:     boolean
  relatedPerson: { fullName: string; relationship: string } | null
}

interface AssignPlazaDialogProps {
  person:        AssignPlazaPerson | null
  open:          boolean
  onOpenChange:  (open: boolean) => void
  onSuccess?:    () => void
}

// ─── RadioCard ───────────────────────────────────────────────────────────────

function RadioCard({
  selected,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  selected:    boolean
  icon:        React.ElementType
  title:       string
  description: string
  onClick:     () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-background hover:border-primary/40 hover:bg-secondary/50',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn('size-4 flex-shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}
        />
        <span className={cn('text-sm font-medium', selected ? 'text-primary' : 'text-foreground')}>
          {title}
        </span>
        {selected && (
          <span className="ml-auto flex size-3.5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
            <span className="size-1.5 rounded-full bg-white" />
          </span>
        )}
      </div>
      <p className="text-[0.72rem] leading-snug text-muted-foreground">{description}</p>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssignPlazaDialog({
  person,
  open,
  onOpenChange,
  onSuccess,
}: AssignPlazaDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const alertRef   = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PlazaFormValues>({
    resolver:      zodResolver(plazaSchema),
    defaultValues: { contractType: 'ACUERDO' },
  })

  // ── GSAP: entrada del dialog y shake del alert de demanda ───────────────
  useGSAP(
    () => {
      if (!open) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { scale: 0.95, opacity: 0, y: 8 },
          {
            scale:    1,
            opacity:  1,
            y:        0,
            duration: ANIM.duration.fast,
            ease:     ANIM.ease.smooth,
          },
        )
      }

      if (person?.hasDemand && alertRef.current) {
        gsap.fromTo(
          alertRef.current,
          { x: -4 },
          { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)', delay: 0.3 },
        )
      }
    },
    { dependencies: [open] },
  )

  async function onSubmit(values: PlazaFormValues) {
    if (!person) return
    setLoading(true)
    const result = await assignPlazaAction(person.id, values)
    setLoading(false)

    if (result.success) {
      toast.success('Plaza asignada correctamente')
      reset()
      onOpenChange(false)
      onSuccess?.()
    } else {
      toast.error(result.error ?? 'Error al asignar la plaza')
    }
  }

  if (!person) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Animated inner content */}
          <div ref={contentRef} className="flex flex-col gap-4">

            <DialogHeader>
              <DialogTitle>Asignar plaza</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{person.fullName}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Alerta de demanda */}
            {person.hasDemand && person.relatedPerson && (
              <div
                ref={alertRef}
                className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
                <div className="text-[0.78rem] leading-snug">
                  <p className="font-semibold">
                    Esta persona tiene demanda activa contra el Estado.
                  </p>
                  <p className="mt-0.5 text-destructive/80">
                    El empleo será asignado a:{' '}
                    <span className="font-medium text-destructive">
                      {person.relatedPerson.fullName}
                    </span>{' '}
                    ({person.relatedPerson.relationship})
                  </p>
                </div>
              </div>
            )}

            {/* Lugar de trabajo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workPlace">Lugar de trabajo</Label>
              <Input
                id="workPlace"
                placeholder="Ej: Secretaría de Educación Pública"
                aria-invalid={!!errors.workPlace}
                {...register('workPlace')}
              />
              {errors.workPlace && (
                <p className="text-[0.75rem] text-destructive">{errors.workPlace.message}</p>
              )}
            </div>

            {/* Tipo de contrato — RadioCards */}
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de contrato</Label>
              <Controller
                name="contractType"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <RadioCard
                      selected={field.value === 'ACUERDO'}
                      icon={FileCheck}
                      title="Acuerdo"
                      description="Nombramiento por acuerdo ejecutivo"
                      onClick={() => field.onChange('ACUERDO')}
                    />
                    <RadioCard
                      selected={field.value === 'CONTRATO'}
                      icon={FileSignature}
                      title="Contrato"
                      description="Contrato laboral a plazo"
                      onClick={() => field.onChange('CONTRATO')}
                    />
                  </div>
                )}
              />
            </div>

            {/* Fecha del contrato */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contractDate">Fecha del contrato</Label>
              <Input
                id="contractDate"
                type="date"
                aria-invalid={!!errors.contractDate}
                {...register('contractDate')}
              />
              {errors.contractDate && (
                <p className="text-[0.75rem] text-destructive">{errors.contractDate.message}</p>
              )}
            </div>

          </div>

          {/* Footer — extends to dialog edges */}
          <div className="-mx-4 -mb-4 mt-5 flex justify-end rounded-b-xl border-t border-border bg-muted/50 px-4 py-3">
            <Button type="submit" disabled={loading} className="min-w-[160px]">
              {loading ? 'Guardando...' : 'Confirmar Asignación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
