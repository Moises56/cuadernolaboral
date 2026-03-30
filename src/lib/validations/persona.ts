import { z } from 'zod'
import type { FormFieldConfig } from '@/generated/prisma/client'

// ─── Labels ────────────────────────────────────────────────────────────────
export const ContractTypeLabels = {
  ACUERDO: 'Acuerdo',
  CONTRATO: 'Contrato',
} as const satisfies Record<string, string>

// ─── DNI hondureño: XXXX-YYYY-NNNNNN (con guiones, ej: 0801-1995-033990) ────
const DNI_REGEX = /^\d{4}-\d{4}-\d{6}$/
const DNI_ERROR = 'El DNI debe tener el formato 0801-1995-033990'

// ─── Schema del familiar designado ────────────────────────────────────────
export const relatedPersonSchema = z.object({
  fullName:     z.string().min(2, 'Ingrese el nombre completo'),
  dni:          z.string().regex(DNI_REGEX, DNI_ERROR),
  phone:        z.string().min(8, 'Ingrese un teléfono válido'),
  email:        z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  relationship: z.string().min(2, 'Indique el parentesco'),
})

export type RelatedPersonValues = z.infer<typeof relatedPersonSchema>

// ─── Schema dinámico según configuración ──────────────────────────────────
export function buildPersonaSchema(fieldConfigs: FormFieldConfig[]) {
  const cfgMap = new Map(fieldConfigs.map(c => [c.fieldKey, c]))
  const req = (key: string) => cfgMap.get(key)?.required ?? false

  // ── Campos base ────────────────────────────────────────────────────────
  const baseShape = {
    fullName: req('fullName')
      ? z.string().min(2, 'Ingrese el nombre completo')
      : z.string(),
    dni: req('dni')
      ? z.string().regex(DNI_REGEX, DNI_ERROR)
      : z.string(),
    phone: req('phone')
      ? z.string().min(8, 'Ingrese un teléfono válido')
      : z.string(),
    email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
    age: req('age')
      ? z.number().int().min(16, 'Edad mínima 16').max(99, 'Edad máxima 99')
      : z.number().int().min(0).max(120).optional(),
    profession: req('profession')
      ? z.array(z.string().min(1)).min(1, 'Ingrese al menos una profesión u oficio')
      : z.array(z.string()).optional(),
    workedForState: z.boolean().default(false),
    hasDemand:      z.boolean().default(false),
    observations:   req('observations')
      ? z.string().min(1, 'Ingrese observaciones')
      : z.string().optional(),
    cvUrl:         z.string().optional(),
    cvPublicId:    z.string().optional(),
    photoUrl:      z.string().optional(),
    photoPublicId: z.string().optional(),
  }

  // ── Campos personalizados (no core) ──────────────────────────────────
  const customFields = fieldConfigs.filter(f => !f.isCore && f.active)
  const dynamicShape: Record<string, z.ZodTypeAny> = {}
  for (const field of customFields) {
    let s: z.ZodTypeAny
    switch (field.type) {
      case 'NUMBER':  s = z.coerce.number(); break
      // BOOLEAN stored as 'true'/'false' string in DB and DynamicInput; not a JS boolean
      case 'BOOLEAN': s = z.string(); break
      case 'EMAIL':   s = z.union([z.string().email('Email inválido'), z.literal('')]); break
      default:        s = z.string()
    }
    if (field.required && field.type !== 'BOOLEAN') {
      s = z.string().min(1, `${field.label} es requerido`)
    } else {
      s = s.optional()
    }
    dynamicShape[field.fieldKey] = s
  }

  return z.object(baseShape)
    .extend({
      relatedPerson: z.object({
        fullName:     z.string().optional(),
        dni:          z.string().optional(),
        phone:        z.string().optional(),
        email:        z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
        relationship: z.string().optional(),
      }).optional(),
      dynamicFields: z.record(z.string(), z.coerce.string()).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.workedForState) return
      const rp = data.relatedPerson
      if (!rp?.fullName || rp.fullName.length < 2)
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'fullName'], message: 'Ingrese el nombre completo' })
      if (!rp?.dni || !DNI_REGEX.test(rp.dni))
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'dni'], message: DNI_ERROR })
      if (!rp?.phone || rp.phone.length < 8)
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'phone'], message: 'Ingrese un teléfono válido' })
      if (!rp?.relationship || rp.relationship.length < 2)
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'relationship'], message: 'Indique el parentesco' })
    })
}

// Tipo base — compatible con ambas variantes del schema
export const personaBaseSchema = z.object({
  fullName:       z.string(),
  dni:            z.string(),
  phone:          z.string(),
  email:          z.union([z.string().email(), z.literal('')]).optional(),
  age:            z.number().int().min(0).max(120).optional(),
  profession:     z.array(z.string()).optional(),
  workedForState: z.boolean(),
  hasDemand:      z.boolean(),
  observations:   z.string().optional(),
  cvUrl:          z.string().optional(),
  cvPublicId:     z.string().optional(),
  photoUrl:       z.string().optional(),
  photoPublicId:  z.string().optional(),
})

export const personaFormSchema = personaBaseSchema
  .extend({
    relatedPerson: z.object({
      fullName:     z.string().optional(),
      dni:          z.string().optional(),
      phone:        z.string().optional(),
      email:        z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
      relationship: z.string().optional(),
    }).optional(),
    dynamicFields: z.record(z.string(), z.coerce.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.workedForState) return
    const rp = data.relatedPerson
    if (!rp?.fullName || rp.fullName.length < 2)
      ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'fullName'], message: 'Ingrese el nombre completo' })
    if (!rp?.dni || !DNI_REGEX.test(rp.dni))
      ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'dni'], message: DNI_ERROR })
    if (!rp?.phone || rp.phone.length < 8)
      ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'phone'], message: 'Ingrese un teléfono válido' })
    if (!rp?.relationship || rp.relationship.length < 2)
      ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'relationship'], message: 'Indique el parentesco' })
  })

export type PersonaFormValues = z.infer<typeof personaFormSchema>

// ─── Schema de asignación de plaza ─────────────────────────────────────────
export const plazaSchema = z.object({
  workPlace:    z.string().min(2, 'Indique el lugar de trabajo'),
  contractType: z.enum(['ACUERDO', 'CONTRATO']),
  contractDate: z.string().min(1, 'Seleccione la fecha del contrato'),
})

export type PlazaFormValues = z.infer<typeof plazaSchema>
