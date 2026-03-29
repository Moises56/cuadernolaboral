'use client'
/* eslint-disable react-hooks/refs, react-hooks/incompatible-library -- react-hook-form field objects contain a ref property and watch() is not memoizable by React Compiler; components work correctly */

import React, { useMemo, useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useForm, type FieldPath, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  User, Briefcase, Users, FileUp, AlertTriangle, Loader2, X, Plus,
} from 'lucide-react'

import { useGSAP, gsap, ANIM } from '@/lib/gsap.config'
import { buildPersonaSchema, type PersonaFormValues } from '@/lib/validations/persona'
import { createPersonaAction, updatePersonaAction } from '@/app/actions/persona.actions'
import type { FormFieldConfig } from '@/generated/prisma/client'

import {
  Form, FormField, FormItem, FormLabel, FormControl,
  FormDescription, FormMessage,
} from '@/components/ui/form'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch }   from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// FileUploader es lazy-loaded — lógica drag-drop + GSAP pesada
const FileUploader = dynamic(
  () => import('@/components/personas/FileUploader').then(m => m.FileUploader),
  { ssr: false, loading: () => <div className="min-h-[120px] rounded-lg border-2 border-dashed border-border bg-muted/30 animate-pulse" /> }
)

// ─── Helper: año de nacimiento desde DNI hondureño ────────────────────────────
// Formato: 0801-1995-033990 → sin guiones → posiciones 4-7 = año
function parseBirthYearFromDNI(dni: string): number | null {
  const stripped = dni.replace(/\D/g, '')
  if (stripped.length >= 8) {
    const year = parseInt(stripped.substring(4, 8), 10)
    const current = new Date().getFullYear()
    if (year >= 1920 && year <= current - 10) return year
  }
  return null
}

// ─── Secciones de campos base ─────────────────────────────────────────────────
// Define a qué sección pertenece cada campo base del modelo Person.
const CORE_SECTION: Record<string, 'personal' | 'laboral'> = {
  fullName:       'personal',
  dni:            'personal',
  phone:          'personal',
  email:          'personal',
  age:            'personal',
  profession:     'personal',
  workedForState: 'laboral',
  hasDemand:      'laboral',
  observations:   'laboral',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PersonaFormProps {
  /** Todos los FormFieldConfig (core + custom), ya ordenados por `order` asc */
  allFieldConfigs: FormFieldConfig[]
  /** Si se provee, el form hace UPDATE en vez de CREATE */
  personId?: string
  /** Valores iniciales para modo edición */
  defaultValues?: Partial<PersonaFormValues>
}

// ─── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, index }: {
  icon: React.ElementType
  label: string
  index: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {index}
      </span>
      <Icon className="size-4 text-muted-foreground" />
      <span className="font-medium">{label}</span>
    </div>
  )
}

// ─── Indicador de campo requerido ────────────────────────────────────────────

function RequiredMark({ required }: { required: boolean }) {
  if (!required) return null
  return <span className="text-destructive"> *</span>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PersonaForm({ allFieldConfigs, personId, defaultValues }: PersonaFormProps) {
  const router    = useRouter()
  const isEditing = Boolean(personId)

  // Schema dinámico — se construye una vez con los configs recibidos del servidor
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => buildPersonaSchema(allFieldConfigs), [])

  const form = useForm<PersonaFormValues, unknown, PersonaFormValues>({
    resolver: zodResolver(schema) as Resolver<PersonaFormValues, unknown, PersonaFormValues>,
    mode:     'onBlur',
    defaultValues: {
      fullName:       '',
      dni:            '',
      phone:          '',
      email:          '',
      profession:     [],
      workedForState: false,
      hasDemand:      false,
      observations:   '',
      relatedPerson: {
        fullName:     '',
        dni:          '',
        phone:        '',
        email:        '',
        relationship: '',
      },
      dynamicFields: {},
      ...defaultValues,
    },
  })

  const hasDemand    = form.watch('hasDemand')
  // eslint-disable-next-line react-hooks/incompatible-library
  const dniValue     = form.watch('dni')
  const isSubmitting = form.formState.isSubmitting
  const relatedRef   = useRef<HTMLDivElement>(null)

  // Calcula la edad automáticamente desde el DNI hondureño (grupo 2 = año)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const year = parseBirthYearFromDNI(dniValue ?? '')
    if (year !== null) {
      form.setValue('age', new Date().getFullYear() - year, { shouldDirty: false, shouldValidate: false })
    }
  }, [dniValue])

  // ─── Config maps ──────────────────────────────────────────────────────────
  const cfgMap   = useMemo(() => new Map(allFieldConfigs.map(c => [c.fieldKey, c])), [allFieldConfigs])
  const isReq    = (key: string) => cfgMap.get(key)?.required ?? false
  const isActive = (key: string) => cfgMap.get(key)?.active ?? true

  // Campos base por sección, ordenados por `order`
  const coreFields = allFieldConfigs.filter(f => f.isCore && f.active)
  const personalFields = coreFields
    .filter(f => CORE_SECTION[f.fieldKey] === 'personal')
  const laboralFields  = coreFields
    .filter(f => CORE_SECTION[f.fieldKey] === 'laboral')

  // Campos personalizados activos
  const customFields = allFieldConfigs.filter(f => !f.isCore && f.active)

  // ─── GSAP: sección familiar condicional ───────────────────────────────────
  useGSAP(() => {
    const el = relatedRef.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (hasDemand) {
      gsap.fromTo(el,
        { height: 0, opacity: 0, y: -10 },
        { height: 'auto', opacity: 1, y: 0,
          duration: reduced ? 0 : ANIM.duration.fast, ease: ANIM.ease.enter }
      )
    } else {
      gsap.to(el, {
        height: 0, opacity: 0,
        duration: reduced ? 0 : ANIM.duration.micro, ease: ANIM.ease.exit,
      })
    }
  }, { dependencies: [hasDemand] })

  // ─── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (values: PersonaFormValues) => {
    const result = isEditing
      ? await updatePersonaAction(personId!, values)
      : await createPersonaAction(values)

    if (!result.success) {
      if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          const msg = messages[0]
          if (msg) form.setError(key as FieldPath<PersonaFormValues>, { message: msg })
        }
        const firstError = Object.keys(result.fieldErrors)[0]
        if (firstError) {
          const el = document.getElementById(`form-item-${firstError}`) ??
                     document.querySelector(`[name="${firstError}"]`)
          if (el instanceof HTMLElement) el.focus()
        }
      }
      toast.error(isEditing ? 'No se pudo actualizar el registro' : 'No se pudo guardar el registro',
        { description: result.error })
      return
    }

    toast.success(isEditing ? 'Registro actualizado' : 'Registro guardado correctamente')
    router.push('/personas')
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Accordion
          multiple
          defaultValue={[
            'personal',
            'laboral',
            'documentos',
            ...(customFields.length > 0 ? ['campos'] : []),
          ]}
          className="rounded-lg border border-border bg-card shadow-sm"
        >
          {/* ── Sección 1: Datos Personales ──────────────────────────────── */}
          {personalFields.length > 0 && (
            <AccordionItem value="personal" className="px-4">
              <AccordionTrigger className="py-3">
                <SectionHeader icon={User} label="Datos Personales" index={1} />
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
                  {personalFields.map(fc => (
                    <CoreField
                      key={fc.fieldKey}
                      fieldKey={fc.fieldKey}
                      label={fc.label}
                      required={isReq(fc.fieldKey)}
                      placeholder={fc.placeholder ?? undefined}
                      form={form}
                      dniValue={dniValue}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* ── Sección 2: Información Laboral ───────────────────────────── */}
          {laboralFields.length > 0 && (
            <AccordionItem value="laboral" className="px-4">
              <AccordionTrigger className="py-3">
                <SectionHeader icon={Briefcase} label="Información Laboral" index={2} />
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-4">
                  {laboralFields.map(fc => (
                    <CoreField
                      key={fc.fieldKey}
                      fieldKey={fc.fieldKey}
                      label={fc.label}
                      required={isReq(fc.fieldKey)}
                      placeholder={fc.placeholder ?? undefined}
                      form={form}
                      dniValue={dniValue}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* ── Sección 4: Documentos ────────────────────────────────────── */}
          {(isActive('cvUrl') || isActive('photoUrl')) && (
            <AccordionItem value="documentos" className="px-4">
              <AccordionTrigger className="py-3">
                <SectionHeader icon={FileUp} label="Documentos" index={4} />
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
                  <FormField
                    name="cvUrl"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currículum Vitae</FormLabel>
                        <FormControl>
                          <FileUploader
                            folder="cvs"
                            accept=".pdf,.doc,.docx"
                            label="Subir CV"
                            currentUrl={field.value}
                            onUpload={(url, publicId) => {
                              field.onChange(url)
                              form.setValue('cvPublicId', publicId)
                            }}
                          />
                        </FormControl>
                        <FormDescription>PDF, DOC o DOCX · Máx. 10 MB</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="photoUrl"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fotografía</FormLabel>
                        <FormControl>
                          <FileUploader
                            folder="fotos"
                            accept="image/*"
                            label="Subir foto"
                            currentUrl={field.value}
                            onUpload={(url, publicId) => {
                              field.onChange(url)
                              form.setValue('photoPublicId', publicId)
                            }}
                          />
                        </FormControl>
                        <FormDescription>JPG, PNG o WEBP · Máx. 10 MB</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* ── Sección 5: Campos Adicionales (personalizados) ────────────── */}
          {customFields.length > 0 && (
            <AccordionItem value="campos" className="border-0 px-4">
              <AccordionTrigger className="py-3">
                <SectionHeader icon={Briefcase} label="Campos Adicionales" index={5} />
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
                  {customFields.map(fc => (
                    <DynamicField key={fc.id} config={fc} form={form} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* ── Sección 3: Familiar Designado (condicional GSAP) ──────────── */}
        <div
          ref={relatedRef}
          className="overflow-hidden"
          style={{ height: 0, opacity: 0 }}
          aria-hidden={!hasDemand}
        >
          <div className="rounded-lg border border-warning bg-card shadow-sm dark:border-warning/40">
            <div className="border-b border-warning/60 px-4 py-3 dark:border-warning/30">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-warning-bg text-xs font-bold text-warning-foreground">
                  3
                </span>
                <Users className="size-4 text-caution dark:text-caution" />
                <span className="font-medium text-caution-foreground dark:text-caution">
                  Familiar Designado
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <Alert className="border-warning/50 bg-warning-bg text-warning-foreground">
                <AlertTriangle className="size-4 text-caution" />
                <AlertDescription>
                  El empleo será asignado al familiar indicado a continuación
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField name="relatedPerson.fullName" control={form.control}
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nombre completo <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Nombre del familiar" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField name="relatedPerson.dni" control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0000000000000" maxLength={13}
                          inputMode="numeric" className="font-mono tracking-widest text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField name="relatedPerson.phone" control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="+504 9999-9999" inputMode="tel" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField name="relatedPerson.email" control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl><Input placeholder="familiar@ejemplo.com" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField name="relatedPerson.relationship" control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parentesco <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="Ej. Cónyuge, Hijo/a…" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? (
              <><Loader2 className="mr-2 size-4 animate-spin" />{isEditing ? 'Actualizando…' : 'Guardando…'}</>
            ) : (
              isEditing ? 'Actualizar registro' : 'Guardar registro'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ─── CoreField — renderiza un campo base según su fieldKey ───────────────────

function CoreField({
  fieldKey,
  label,
  required,
  placeholder,
  form,
  dniValue,
}: {
  fieldKey:     string
  label:        string
  required:     boolean
  placeholder?: string | undefined
  form:         ReturnType<typeof useForm<PersonaFormValues>>
  dniValue?:    string | undefined
}) {
  switch (fieldKey) {
    case 'fullName':
      return (
        <FormField name="fullName" control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{label}<RequiredMark required={required} /></FormLabel>
              <FormControl><Input placeholder={placeholder ?? 'Ej. Ana Lucía García López'} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )

    case 'dni':
      return (
        <FormField name="dni" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}<RequiredMark required={required} /></FormLabel>
              <FormControl>
                <Input {...field} placeholder={placeholder ?? '08011995033990'} maxLength={14}
                  inputMode="numeric" className="font-mono tracking-widest text-base" />
              </FormControl>
              <FormDescription>14 dígitos sin guiones — Ej: 0801<strong>1995</strong>033990</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )

    case 'phone':
      return (
        <FormField name="phone" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}<RequiredMark required={required} /></FormLabel>
              <FormControl><Input placeholder={placeholder ?? '+504 9999-9999'} inputMode="tel" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )

    case 'email':
      return (
        <FormField name="email" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}<RequiredMark required={required} /></FormLabel>
              <FormControl><Input placeholder={placeholder ?? 'correo@ejemplo.com'} type="email" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )

    case 'age': {
      const birthYear = parseBirthYearFromDNI(dniValue ?? '')
      const autoAge   = birthYear !== null ? new Date().getFullYear() - birthYear : null
      return (
        <FormField name="age" control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}<RequiredMark required={required} /></FormLabel>
              {autoAge !== null ? (
                <div className="flex items-center gap-2 h-8 rounded-lg border border-border bg-muted/40 px-3">
                  <span className="font-mono text-sm font-semibold text-foreground">{autoAge}</span>
                  <span className="text-xs text-muted-foreground">años</span>
                  <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Calculado desde DNI
                  </span>
                </div>
              ) : (
                <FormControl>
                  <Input type="number" placeholder={placeholder ?? '30'} min={0} max={120} inputMode="numeric"
                    value={field.value ?? ''}
                    onChange={e => {
                      const v = e.target.value
                      field.onChange(v === '' ? undefined : parseInt(v, 10))
                    }}
                    onBlur={field.onBlur} name={field.name} ref={field.ref}
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    case 'profession':
      return <ProfessionTagInput form={form} label={label} required={required} placeholder={placeholder} />

    case 'workedForState':
      return (
        <FormField name="workedForState" control={form.control}
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2">
              <div className="space-y-0.5">
                <FormLabel className="cursor-pointer">{label}</FormLabel>
                <FormDescription>Tuvo cargo público previo</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      )

    case 'hasDemand':
      return (
        <FormField name="hasDemand" control={form.control}
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-warning/50 bg-warning-bg/40 p-3 sm:col-span-2">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-1.5 cursor-pointer">
                  <AlertTriangle className="size-3.5 text-caution" />
                  {label}
                </FormLabel>
                <FormDescription>
                  El empleo se asignará al familiar indicado en la sección 3
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      )

    case 'observations':
      return (
        <FormField name="observations" control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{label}<RequiredMark required={required} /></FormLabel>
              <FormControl>
                <Textarea placeholder={placeholder ?? 'Información adicional relevante…'}
                  rows={3} className="resize-none" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )

    default:
      return null
  }
}

// ─── ProfessionTagInput — multi-carrera/oficio/grado ─────────────────────────

function ProfessionTagInput({
  form, label, required, placeholder,
}: {
  form:         ReturnType<typeof useForm<PersonaFormValues>>
  label:        string
  required:     boolean
  placeholder?: string | undefined
}) {
  const [input, setInput] = useState('')
  // eslint-disable-next-line react-hooks/incompatible-library
  const professions = (form.watch('profession') as string[] | undefined) ?? []

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed || professions.includes(trimmed)) return
    form.setValue('profession', [...professions, trimmed], { shouldValidate: true })
    setInput('')
  }

  const remove = (p: string) => {
    form.setValue('profession', professions.filter(x => x !== p), { shouldValidate: true })
  }

  return (
    <FormField
      name="profession"
      control={form.control}
      render={() => (
        <FormItem className="sm:col-span-2">
          <FormLabel>{label}<RequiredMark required={required} /></FormLabel>
          <FormControl>
            <div className="space-y-2">
              {professions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {professions.map(p => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="ml-0.5 transition-colors hover:text-destructive"
                        aria-label={`Eliminar ${p}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder={placeholder ?? 'Ej: Ingeniero Civil, Maestría en Administración…'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      add()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={add}
                  aria-label="Agregar profesión"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </FormControl>
          <FormDescription>
            Presiona <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Enter</kbd> o coma para agregar. Puede incluir carreras, maestrías y doctorados.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── DynamicField — campos personalizados ────────────────────────────────────

function DynamicField({
  config,
  form,
}: {
  config: FormFieldConfig
  form:   ReturnType<typeof useForm<PersonaFormValues>>
}) {
  const name = `dynamicFields.${config.fieldKey}` as FieldPath<PersonaFormValues>

  return (
    <FormField name={name} control={form.control}
      render={({ field }) => (
        <FormItem className={config.type === 'TEXTAREA' ? 'sm:col-span-2' : undefined}>
          <FormLabel>
            {config.label}
            {config.required && <span className="text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            <DynamicInput config={config} field={field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── DynamicInput ─────────────────────────────────────────────────────────────

function DynamicInput({ config, field }: {
  config: FormFieldConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field:  any
}) {
  switch (config.type) {
    case 'TEXTAREA':
      return <Textarea placeholder={config.placeholder ?? undefined} rows={3}
        className="resize-none" {...field} value={field.value ?? ''} />

    case 'NUMBER':
      return <Input type="number" inputMode="numeric" placeholder={config.placeholder ?? undefined}
        value={field.value ?? ''}
        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        onBlur={field.onBlur} name={field.name} ref={field.ref} />

    case 'DATE':
      return <Input type="date" {...field} value={field.value ?? ''} />

    case 'BOOLEAN': {
      // Values are stored as strings 'true'/'false' in DB and passed around as such.
      // !!field.value would treat 'false' (non-empty string) as truthy — must compare explicitly.
      const isChecked = field.value === 'true' || field.value === true
      return (
        <div className="flex items-center pt-1">
          <Switch
            checked={isChecked}
            onCheckedChange={(v) => field.onChange(v ? 'true' : 'false')}
          />
        </div>
      )
    }

    case 'SELECT':
      return (
        <Select onValueChange={field.onChange} value={field.value ?? ''}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={config.placeholder ?? 'Seleccione…'} />
          </SelectTrigger>
          <SelectContent>
            {config.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    default:
      return <Input
        type={config.type === 'EMAIL' ? 'email' : config.type === 'PHONE' ? 'tel' : 'text'}
        placeholder={config.placeholder ?? undefined}
        {...field} value={field.value ?? ''} />
  }
}
