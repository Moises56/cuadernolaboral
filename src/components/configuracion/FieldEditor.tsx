'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { createFieldAction, updateFieldAction } from '@/app/actions/form-config.actions'
import type { FormFieldConfig } from '@/generated/prisma/client'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Switch }   from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'TEXTAREA', 'EMAIL', 'PHONE'] as const
type FieldType = typeof FIELD_TYPES[number]

const TYPE_LABELS: Record<FieldType, string> = {
  TEXT:     'Texto',
  NUMBER:   'Número',
  DATE:     'Fecha',
  BOOLEAN:  'Sí / No',
  SELECT:   'Selección',
  TEXTAREA: 'Texto largo',
  EMAIL:    'Email',
  PHONE:    'Teléfono',
}

const fieldSchema = z.object({
  label:       z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  fieldKey:    z.string()
                .regex(/^[a-z][a-z0-9_]*$/, 'Solo minúsculas, números y _')
                .max(30, 'Máximo 30 caracteres'),
  type:        z.enum(FIELD_TYPES),
  required:    z.boolean(),
  placeholder: z.string().max(100).optional(),
  options:     z.array(z.string().min(1)).optional(),
})

type FieldFormValues = z.infer<typeof fieldSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^[^a-z]/, match => `f${match}`)
    .slice(0, 30)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FieldEditorProps {
  field: FormFieldConfig | null
  onSaved: (field: FormFieldConfig) => void
  onCancel: () => void
}

// ─── FieldEditor ──────────────────────────────────────────────────────────────

export function FieldEditor({ field, onSaved, onCancel }: FieldEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isEditing    = field !== null
  const isCore       = field?.isCore ?? false

  const [fieldKeyLocked, setFieldKeyLocked] = useState(isEditing)
  const [optionInput, setOptionInput]       = useState('')
  const [submitting, setSubmitting]         = useState(false)

  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldSchema) as Resolver<FieldFormValues>,
    defaultValues: {
      label:       field?.label       ?? '',
      fieldKey:    field?.fieldKey    ?? '',
      type:        (field?.type as FieldType) ?? 'TEXT',
      required:    field?.required    ?? false,
      placeholder: field?.placeholder ?? '',
      options:     field?.options     ?? [],
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is not memoizable by React Compiler; component works correctly without memoization
  const watchedLabel   = form.watch('label')
  const watchedType    = form.watch('type')
  const watchedOptions = form.watch('options') ?? []

  // Auto-generate fieldKey from label (only when creating and not manually edited)
  useEffect(() => {
    if (isEditing || fieldKeyLocked) return
    const slug = slugify(watchedLabel)
    form.setValue('fieldKey', slug, { shouldValidate: false })
  }, [watchedLabel, isEditing, fieldKeyLocked, form])

  // GSAP mount animation
  useGSAP(
    () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return

      gsap.fromTo(
        containerRef.current,
        { opacity: 0, x: 16 },
        { opacity: 1, x: 0, duration: ANIM.duration.fast, ease: ANIM.ease.enter },
      )
    },
    { scope: containerRef },
  )

  // ─── Options management ──────────────────────────────────────────────────

  const addOption = () => {
    const trimmed = optionInput.trim()
    if (!trimmed || watchedOptions.includes(trimmed)) return

    const newOptions = [...watchedOptions, trimmed]
    form.setValue('options', newOptions)
    setOptionInput('')

    // GSAP: animate new tag scale 0→1
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReduced) {
      requestAnimationFrame(() => {
        const tags = containerRef.current?.querySelectorAll('.option-tag')
        const lastTag = tags?.[tags.length - 1]
        if (lastTag) {
          gsap.fromTo(lastTag, { scale: 0, opacity: 0 }, {
            scale: 1, opacity: 1, duration: ANIM.duration.micro, ease: ANIM.ease.spring,
          })
        }
      })
    }
  }

  const removeOption = (opt: string) => {
    form.setValue('options', watchedOptions.filter(o => o !== opt))
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const onSubmit = async (values: FieldFormValues) => {
    if (submitting) return
    setSubmitting(true)

    const result = isEditing
      ? await updateFieldAction(field.id, values)
      : await createFieldAction(values)

    if (!result.success) {
      toast.error(result.error)
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([key, msgs]) => {
          if (msgs[0]) form.setError(key as keyof FieldFormValues, { message: msgs[0] })
        })
      }
      setSubmitting(false)
      return
    }

    toast.success(isEditing ? 'Campo actualizado' : 'Campo creado')
    onSaved(result.data)
    setSubmitting(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-border bg-card p-5 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {isEditing ? 'Editar campo' : 'Nuevo campo'}
        </h3>
        <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Cerrar editor">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Label */}
          <FormField
            name="label"
            control={form.control}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>Nombre del campo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Municipio de origen"
                    {...f}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* fieldKey — bloqueado para campos base */}
          <FormField
            name="fieldKey"
            control={form.control}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Identificador
                  {(isCore || (isEditing && fieldKeyLocked)) && (
                    <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {isCore ? 'campo base' : 'bloqueado'}
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="municipio_origen"
                    className="font-mono text-sm"
                    disabled={isCore || (isEditing && fieldKeyLocked)}
                    {...f}
                    onChange={e => {
                      f.onChange(e)
                      if (!isEditing) setFieldKeyLocked(true)
                    }}
                    onFocus={() => {
                      if (!isEditing) setFieldKeyLocked(false)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Type — bloqueado para campos base */}
          <FormField
            name="type"
            control={form.control}
            render={({ field: f }) => (
              <FormItem>
                <FormLabel>Tipo de campo</FormLabel>
                <Select value={f.value} onValueChange={f.onChange} disabled={isCore}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FIELD_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCore && (
                  <p className="text-[11px] text-muted-foreground">
                    El tipo de los campos base no se puede cambiar
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Options — only for SELECT type */}
          {watchedType === 'SELECT' && (
            <FormItem>
              <FormLabel>Opciones</FormLabel>
              {/* Tags display */}
              {watchedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {watchedOptions.map(opt => (
                    <span
                      key={opt}
                      className={cn(
                        'option-tag inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                        'text-xs bg-primary/10 text-primary border border-primary/20',
                      )}
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(opt)}
                        className="hover:text-destructive transition-colors"
                        aria-label={`Eliminar opción ${opt}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe una opción y presiona Enter"
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOption()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addOption}
                  aria-label="Agregar opción"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </FormItem>
          )}

          {/* Placeholder */}
          {watchedType !== 'BOOLEAN' && watchedType !== 'DATE' && (
            <FormField
              name="placeholder"
              control={form.control}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel>Placeholder <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Texto de ayuda en el campo" {...f} value={f.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Required */}
          <FormField
            name="required"
            control={form.control}
            render={({ field: f }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <FormLabel className="cursor-pointer text-sm font-normal">
                  Campo requerido
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={f.value as boolean}
                    onCheckedChange={f.onChange}
                    size="sm"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="flex-1"
              disabled={submitting}
            >
              {submitting
                ? isEditing ? 'Guardando…' : 'Creando…'
                : isEditing ? 'Guardar'    : 'Crear campo'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
