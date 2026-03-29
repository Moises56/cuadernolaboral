import { z } from 'zod'
import type { FormFieldConfig } from '@/generated/prisma/client'

// ─── Labels ────────────────────────────────────────────────────────────────
export const ContractTypeLabels = {
  ACUERDO: 'Acuerdo',
  CONTRATO: 'Contrato',
} as const satisfies Record<string, string>

// ─── Schema del familiar designado ────────────────────────────────────────
export const relatedPersonSchema = z.object({
  fullName:     z.string().min(2, 'Ingrese el nombre completo'),
  dni:          z.string().regex(/^\d{13}$/, 'El DNI debe tener exactamente 13 dígitos'),
  phone:        z.string().min(8, 'Ingrese un teléfono válido'),
  email:        z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  relationship: z.string().min(2, 'Indique el parentesco'),
})

export type RelatedPersonValues = z.infer<typeof relatedPersonSchema>

// ─── Schema dinámico según configuración ──────────────────────────────────
// Recibe los FormFieldConfig (core + custom, activos) y genera el schema.
// Si un campo core tiene required:true → valida el formato.
// Si tiene required:false → acepta string vacío o undefined.

export function buildPersonaSchema(fieldConfigs: FormFieldConfig[]) {
  const cfgMap = new Map(fieldConfigs.map(c => [c.fieldKey, c]))
  const req = (key: string) => cfgMap.get(key)?.required ?? false

  // ── Campos base ────────────────────────────────────────────────────────
  const baseShape = {
    fullName: req('fullName')
      ? z.string().min(2, 'Ingrese el nombre completo')
      : z.string(),
    dni: req('dni')
      ? z.string().regex(/^\d{13}$/, 'El DNI debe tener exactamente 13 dígitos')
      : z.string(),
    phone: req('phone')
      ? z.string().min(8, 'Ingrese un teléfono válido')
      : z.string(),
    email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
    age: req('age')
      ? z.number().int().min(16, 'Edad mínima 16').max(99, 'Edad máxima 99')
      : z.number().int().min(16).max(99).optional(),
    profession: req('profession')
      ? z.string().min(1, 'Ingrese la profesión')
      : z.string().optional(),
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
      case 'BOOLEAN': s = z.boolean(); break
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
      dynamicFields: z.record(z.string(), z.string()).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.hasDemand) return
      const rp = data.relatedPerson
      if (!rp?.fullName || rp.fullName.length < 2)
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'fullName'], message: 'Ingrese el nombre completo' })
      if (!rp?.dni || !/^\d{13}$/.test(rp.dni))
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'dni'], message: 'El DNI debe tener 13 dígitos' })
      if (!rp?.phone || rp.phone.length < 8)
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'phone'], message: 'Ingrese un teléfono válido' })
      if (!rp?.relationship || rp.relationship.length < 2)
        ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'relationship'], message: 'Indique el parentesco' })
    })
}

// Tipo base para TypeScript — compatible con ambas variantes del schema
export const personaBaseSchema = z.object({
  fullName:       z.string(),
  dni:            z.string(),
  phone:          z.string(),
  email:          z.union([z.string().email(), z.literal('')]).optional(),
  age:            z.number().int().min(16).max(99).optional(),
  profession:     z.string().optional(),
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
    dynamicFields: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasDemand) return
    const rp = data.relatedPerson
    if (!rp?.fullName || rp.fullName.length < 2)
      ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'fullName'], message: 'Ingrese el nombre completo' })
    if (!rp?.dni || !/^\d{13}$/.test(rp.dni))
      ctx.addIssue({ code: 'custom', path: ['relatedPerson', 'dni'], message: 'El DNI debe tener 13 dígitos' })
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
