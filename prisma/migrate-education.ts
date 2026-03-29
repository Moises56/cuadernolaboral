/**
 * One-time migration: update education-level dynamic field options
 * and add the "¿Completó el nivel?" BOOLEAN field.
 *
 * Run once against your production DB:
 *   npm run migrate:education
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // 1. Update nivelEducativo options (overwrite whatever is stored)
  await prisma.formFieldConfig.upsert({
    where:  { fieldKey: 'nivelEducativo' },
    update: {
      options:  ['Primaria', 'Secundaria', 'Universidad', 'Maestría', 'Doctorado'],
      required: false,
    },
    create: {
      label:    'Nivel educativo',
      fieldKey: 'nivelEducativo',
      type:     'SELECT',
      required: false,
      options:  ['Primaria', 'Secundaria', 'Universidad', 'Maestría', 'Doctorado'],
      order:    2,
      active:   true,
    },
  })
  console.log('  ✔ nivelEducativo actualizado')

  // 2. Add completoNivel BOOLEAN field (idempotent)
  await prisma.formFieldConfig.upsert({
    where:  { fieldKey: 'completoNivel' },
    update: {},
    create: {
      label:    '¿Completó el nivel?',
      fieldKey: 'completoNivel',
      type:     'BOOLEAN',
      required: false,
      options:  [],
      order:    3,
      active:   true,
    },
  })
  console.log('  ✔ completoNivel creado')

  // 3. Shift fechaNacimiento to order 4 (was 3) to make room
  await prisma.formFieldConfig.updateMany({
    where: { fieldKey: 'fechaNacimiento' },
    data:  { order: 4 },
  })
  console.log('  ✔ fechaNacimiento → order 4')

  console.log('\n✅ Migración de campos educativos completada.')
}

main()
  .catch(e => { console.error('❌ Error de migración:', e); process.exit(1) })
  .finally(() => void prisma.$disconnect())
