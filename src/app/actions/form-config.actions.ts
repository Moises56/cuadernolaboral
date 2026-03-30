'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import type { ActionResult } from '@/types'
import type { FormFieldConfig } from '@/generated/prisma/client'

// ─── Core fields — campos base del modelo Person ─────────────────────────────
// Estos campos siempre existen; no se pueden eliminar ni cambiar su tipo/clave.
// Por defecto ninguno es requerido.

const CORE_FIELDS = [
  { fieldKey: 'fullName',       label: 'Nombre completo',       type: 'TEXT',     order: 10, placeholder: 'Ej. Ana Lucía García López' },
  { fieldKey: 'dni',            label: 'DNI',                   type: 'TEXT',     order: 20, placeholder: '0000000000000' },
  { fieldKey: 'phone',          label: 'Teléfono',              type: 'PHONE',    order: 30, placeholder: '+504 9999-9999' },
  { fieldKey: 'email',          label: 'Correo electrónico',    type: 'EMAIL',    order: 40, placeholder: 'correo@ejemplo.com' },
  { fieldKey: 'age',            label: 'Edad',                  type: 'NUMBER',   order: 50, placeholder: '25' },
  { fieldKey: 'profession',     label: 'Profesión / Oficio',    type: 'TEXT',     order: 60, placeholder: 'Ej. Ingeniero, Docente…' },
  { fieldKey: 'workedForState', label: 'Tiene demanda al Estado', type: 'BOOLEAN',  order: 70, placeholder: null },
  { fieldKey: 'hasDemand',      label: 'Asignación a familiar', type: 'BOOLEAN',  order: 80, placeholder: null },
  { fieldKey: 'observations',   label: 'Observaciones',         type: 'TEXTAREA', order: 90, placeholder: 'Información adicional…' },
] as const

// Siembra los campos base si no existen en la BD (idempotente).
export async function initCoreFieldsAction(): Promise<void> {
  try {
    for (const cf of CORE_FIELDS) {
      await prisma.formFieldConfig.upsert({
        where:  { fieldKey: cf.fieldKey },
        update: { isCore: true, label: cf.label },   // actualiza label/isCore si cambió
        create: {
          fieldKey:    cf.fieldKey,
          label:       cf.label,
          type:        cf.type as FormFieldConfig['type'],
          required:    false,
          placeholder: cf.placeholder ?? null,
          options:     [],
          order:       cf.order,
          active:      true,
          isCore:      true,
        },
      })
    }
  } catch (error) {
    console.error('[initCoreFieldsAction]', error)
  }
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'TEXTAREA', 'EMAIL', 'PHONE'] as const

const fieldSchema = z.object({
  label:       z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  fieldKey:    z.string()
                .regex(/^[a-z][a-z0-9_]*$/, 'Solo minúsculas, números y _')
                .max(30, 'Máximo 30 caracteres'),
  type:        z.enum(FIELD_TYPES),
  required:    z.boolean().default(false),
  placeholder: z.string().max(100).optional(),
  options:     z.array(z.string().min(1)).optional(),
})

type FieldInput = z.infer<typeof fieldSchema>

function flattenErrors(
  fieldErrors: Partial<Record<string, string[] | undefined>>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]),
    ),
  )
}

// ─── createFieldAction ────────────────────────────────────────────────────────

export async function createFieldAction(
  input: unknown,
): Promise<ActionResult<FormFieldConfig>> {
  await requireAdmin()
  const parsed = fieldSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisa los campos con errores',
      fieldErrors: flattenErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const data: FieldInput = parsed.data

  try {
    // Verify unique fieldKey
    const existing = await prisma.formFieldConfig.findUnique({
      where: { fieldKey: data.fieldKey },
    })
    if (existing) {
      return {
        success: false,
        error: 'El identificador ya existe',
        fieldErrors: { fieldKey: ['Este identificador ya está en uso'] },
      }
    }

    // order = max + 1
    const agg = await prisma.formFieldConfig.aggregate({ _max: { order: true } })
    const order = (agg._max.order ?? 0) + 1

    const field = await prisma.formFieldConfig.create({
      data: {
        label:       data.label,
        fieldKey:    data.fieldKey,
        type:        data.type,
        required:    data.required,
        placeholder: data.placeholder ?? null,
        options:     data.options ?? [],
        order,
      },
    })

    revalidatePath('/configuracion')
    return { success: true, data: field }
  } catch (error) {
    console.error('[createFieldAction]', error)
    return { success: false, error: 'Error al crear el campo. Intente nuevamente.' }
  }
}

// ─── updateFieldAction ────────────────────────────────────────────────────────

export async function updateFieldAction(
  id: string,
  input: unknown,
): Promise<ActionResult<FormFieldConfig>> {
  await requireAdmin()
  const parsed = fieldSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisa los campos con errores',
      fieldErrors: flattenErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const data: FieldInput = parsed.data

  try {
    // If fieldKey is changing, check it's unique
    const current = await prisma.formFieldConfig.findUnique({ where: { id } })
    if (!current) return { success: false, error: 'Campo no encontrado' }

    if (current.fieldKey !== data.fieldKey) {
      // fieldKey cannot change if it already has values
      const valueCount = await prisma.dynamicFieldValue.count({
        where: { fieldId: id },
      })
      if (valueCount > 0) {
        return {
          success: false,
          error: 'No se puede cambiar el identificador de un campo con datos',
          fieldErrors: { fieldKey: [`Este campo tiene ${valueCount} registros — identificador bloqueado`] },
        }
      }

      // Verify uniqueness
      const conflict = await prisma.formFieldConfig.findUnique({
        where: { fieldKey: data.fieldKey },
      })
      if (conflict) {
        return {
          success: false,
          error: 'El identificador ya existe',
          fieldErrors: { fieldKey: ['Este identificador ya está en uso'] },
        }
      }
    }

    const field = await prisma.formFieldConfig.update({
      where: { id },
      data: {
        label:       data.label,
        fieldKey:    data.fieldKey,
        type:        data.type,
        required:    data.required,
        placeholder: data.placeholder ?? null,
        options:     data.options ?? [],
      },
    })

    revalidatePath('/configuracion')
    return { success: true, data: field }
  } catch (error) {
    console.error('[updateFieldAction]', error)
    return { success: false, error: 'Error al actualizar el campo. Intente nuevamente.' }
  }
}

// ─── reorderFieldsAction ──────────────────────────────────────────────────────

export async function reorderFieldsAction(
  orderedIds: string[],
): Promise<ActionResult<void>> {
  await requireAdmin()
  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.formFieldConfig.update({
          where: { id },
          data:  { order: index + 1 },
        }),
      ),
    )

    revalidatePath('/configuracion')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[reorderFieldsAction]', error)
    return { success: false, error: 'Error al reordenar los campos.' }
  }
}

// ─── toggleFieldAction ────────────────────────────────────────────────────────

export async function toggleFieldAction(id: string): Promise<ActionResult<{ active: boolean }>> {
  await requireAdmin()
  try {
    const current = await prisma.formFieldConfig.findUnique({
      where: { id },
      select: { active: true },
    })
    if (!current) return { success: false, error: 'Campo no encontrado' }

    const updated = await prisma.formFieldConfig.update({
      where: { id },
      data:  { active: !current.active },
    })

    revalidatePath('/configuracion')
    revalidatePath('/personas')
    return { success: true, data: { active: updated.active } }
  } catch (error) {
    console.error('[toggleFieldAction]', error)
    return { success: false, error: 'Error al actualizar el campo.' }
  }
}

// ─── deleteFieldAction ────────────────────────────────────────────────────────

export async function deleteFieldAction(
  id: string,
): Promise<ActionResult<{ deleted: true } | { blocked: true; count: number }>> {
  await requireAdmin()
  try {
    const field = await prisma.formFieldConfig.findUnique({ where: { id }, select: { isCore: true } })
    if (field?.isCore) {
      return { success: false, error: 'Los campos base del sistema no se pueden eliminar.' }
    }

    const valueCount = await prisma.dynamicFieldValue.count({
      where: { fieldId: id },
    })

    if (valueCount > 0) {
      return {
        success: false,
        error: `Este campo tiene ${valueCount} ${valueCount === 1 ? 'valor registrado' : 'valores registrados'}. Elimine los datos primero.`,
      }
    }

    await prisma.formFieldConfig.delete({ where: { id } })

    revalidatePath('/configuracion')
    revalidatePath('/personas')
    return { success: true, data: { deleted: true } }
  } catch (error) {
    console.error('[deleteFieldAction]', error)
    return { success: false, error: 'Error al eliminar el campo. Intente nuevamente.' }
  }
}
