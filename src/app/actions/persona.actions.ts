'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { personaFormSchema, plazaSchema } from '@/lib/validations/persona'
import type { ActionResult } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────
function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  )
}

function getPrismaUniqueTarget(error: unknown): string[] {
  const e = error as { meta?: { target?: string[] } }
  return e.meta?.target ?? []
}

function flattenErrors(
  fieldErrors: Partial<Record<string, string[] | undefined>>
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter((entry): entry is [string, string[]] =>
      Array.isArray(entry[1])
    )
  )
}

// ─── createPersonaAction ────────────────────────────────────────────────────
export async function createPersonaAction(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()
  const parsed = personaFormSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisa los campos con errores',
      fieldErrors: flattenErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const { relatedPerson, dynamicFields, ...person } = parsed.data
  const email = person.email || undefined

  try {
    const created = await prisma.person.create({
      data: {
        fullName:       person.fullName,
        dni:            person.dni,
        phone:          person.phone,
        workedForState: person.workedForState,
        hasDemand:      person.workedForState,
        conciliando:    person.conciliando,
        ...(email                       && { email }),
        ...(person.age !== undefined    && { age: person.age }),
        ...(person.profession && person.profession.length > 0 && { profession: person.profession }),
        ...(person.observations         && { observations: person.observations }),
        ...(person.cvUrl                && { cvUrl: person.cvUrl }),
        ...(person.cvPublicId           && { cvPublicId: person.cvPublicId }),
        ...(person.photoUrl             && { photoUrl: person.photoUrl }),
        ...(person.photoPublicId        && { photoPublicId: person.photoPublicId }),
        ...(person.workedForState && !person.conciliando && relatedPerson?.fullName && {
          relatedPerson: {
            create: {
              fullName:     relatedPerson.fullName!,
              dni:          relatedPerson.dni!,
              phone:        relatedPerson.phone!,
              relationship: relatedPerson.relationship!,
              ...(relatedPerson.email && { email: relatedPerson.email }),
            },
          },
        }),
      },
    })

    // Save dynamic field values
    if (dynamicFields && Object.keys(dynamicFields).length > 0) {
      const fieldConfigs = await prisma.formFieldConfig.findMany({
        where: { fieldKey: { in: Object.keys(dynamicFields) }, active: true },
        select: { id: true, fieldKey: true },
      })

      await prisma.dynamicFieldValue.createMany({
        data: fieldConfigs.flatMap(fc => {
          const value = dynamicFields[fc.fieldKey]
          return value !== undefined ? [{ personId: created.id, fieldId: fc.id, value }] : []
        }),
      })
    }

    revalidatePath('/personas')
    revalidatePath('/')
    return { success: true, data: { id: created.id } }
  } catch (error: unknown) {
    if (isPrismaUniqueError(error)) {
      if (getPrismaUniqueTarget(error).includes('dni')) {
        return {
          success: false,
          error: 'El DNI ingresado ya está registrado en el sistema',
          fieldErrors: { dni: ['Este DNI ya existe en el sistema'] },
        }
      }
    }
    console.error('[createPersonaAction]', error)
    return { success: false, error: 'Error al guardar el registro. Intente nuevamente.' }
  }
}

// ─── updatePersonaAction ────────────────────────────────────────────────────
export async function updatePersonaAction(
  id: string,
  data: unknown
): Promise<ActionResult<void>> {
  await requireAdmin()
  const parsed = personaFormSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisa los campos con errores',
      fieldErrors: flattenErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const { relatedPerson, dynamicFields, ...person } = parsed.data
  const email = person.email || undefined

  try {
    await prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id },
        data: {
          fullName:       person.fullName,
          dni:            person.dni,
          phone:          person.phone,
          workedForState: person.workedForState,
          hasDemand:      person.workedForState,
          conciliando:    person.conciliando,
          email:          email ?? null,
          age:            person.age ?? null,
          profession:     person.profession ?? [],
          observations:   person.observations ?? null,
          cvUrl:          person.cvUrl ?? null,
          cvPublicId:     person.cvPublicId ?? null,
          photoUrl:       person.photoUrl ?? null,
          photoPublicId:  person.photoPublicId ?? null,
        },
      })

      if (person.workedForState && !person.conciliando && relatedPerson?.fullName) {
        await tx.relatedPerson.upsert({
          where:  { personId: id },
          update: {
            fullName:     relatedPerson.fullName!,
            dni:          relatedPerson.dni!,
            phone:        relatedPerson.phone!,
            relationship: relatedPerson.relationship!,
            email:        relatedPerson.email ?? null,
          },
          create: {
            personId:     id,
            fullName:     relatedPerson.fullName!,
            dni:          relatedPerson.dni!,
            phone:        relatedPerson.phone!,
            relationship: relatedPerson.relationship!,
            ...(relatedPerson.email && { email: relatedPerson.email }),
          },
        })
      } else if (!person.workedForState || person.conciliando) {
        // Sin demanda o en conciliación: eliminar familiar designado si existía
        await tx.relatedPerson.deleteMany({ where: { personId: id } })
      }

      if (dynamicFields) {
        const fieldConfigs = await tx.formFieldConfig.findMany({
          where: { fieldKey: { in: Object.keys(dynamicFields) }, active: true },
          select: { id: true, fieldKey: true },
        })
        for (const fc of fieldConfigs) {
          const value = dynamicFields[fc.fieldKey]
          if (value !== undefined) {
            await tx.dynamicFieldValue.upsert({
              where:  { personId_fieldId: { personId: id, fieldId: fc.id } },
              update: { value },
              create: { personId: id, fieldId: fc.id, value },
            })
          }
        }
      }
    })

    revalidatePath('/personas')
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error: unknown) {
    if (isPrismaUniqueError(error)) {
      if (getPrismaUniqueTarget(error).includes('dni')) {
        return {
          success: false,
          error: 'El DNI ingresado ya está registrado en el sistema',
          fieldErrors: { dni: ['Este DNI ya existe en el sistema'] },
        }
      }
    }
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[updatePersonaAction]', detail, error)
    return { success: false, error: `Error al actualizar el registro: ${detail}` }
  }
}

// ─── assignPlazaAction ──────────────────────────────────────────────────────
export async function assignPlazaAction(
  id: string,
  data: unknown
): Promise<ActionResult<void>> {
  await requireAdmin()
  const parsed = plazaSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Datos de plaza inválidos',
      fieldErrors: flattenErrors(parsed.error.flatten().fieldErrors),
    }
  }

  try {
    const person = await prisma.person.findUnique({
      where: { id },
      select: { hasDemand: true, fullName: true },
    })

    if (!person) {
      return { success: false, error: 'La persona no existe en el sistema.' }
    }

    if (person.hasDemand) {
      console.info(
        `[assignPlazaAction] Asignando plaza a "${person.fullName}" (id: ${id}) que tiene demanda activa contra el Estado. La plaza se registra a su nombre conforme a normativa.`
      )
    }

    await prisma.person.update({
      where: { id },
      data: {
        workPlace:    parsed.data.workPlace,
        contractType: parsed.data.contractType,
        contractDate: new Date(parsed.data.contractDate),
      },
    })

    revalidatePath('/personas')
    revalidatePath(`/personas/${id}`)
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[assignPlazaAction]', error)
    return { success: false, error: 'Error al asignar la plaza. Intente nuevamente.' }
  }
}

// ─── deletePersonaAction ────────────────────────────────────────────────────
export async function deletePersonaAction(id: string): Promise<ActionResult<void>> {
  await requireAdmin()
  try {
    await prisma.person.delete({ where: { id } })
    revalidatePath('/personas')
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deletePersonaAction]', error)
    return { success: false, error: 'Error al eliminar el registro. Intente nuevamente.' }
  }
}
