/**
 * One-time migration: add "Detalle del perfil" TEXTAREA field.
 *
 * Run once against your production DB:
 *   npm run migrate:detalleperfil
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.formFieldConfig.upsert({
    where:  { fieldKey: 'detallePerfil' },
    update: {},
    create: {
      label:       'Detalle del perfil',
      fieldKey:    'detallePerfil',
      type:        'TEXTAREA',
      required:    false,
      placeholder: 'Descripción del perfil profesional, experiencia relevante, observaciones...',
      options:     [],
      order:       5,
      active:      true,
    },
  })
  console.log('  ✔ detallePerfil creado (TEXTAREA, order 5)')
  console.log('\n✅ Migración de detalle de perfil completada.')
}

main()
  .catch(e => { console.error('❌ Error de migración:', e); process.exit(1) })
  .finally(() => void prisma.$disconnect())
