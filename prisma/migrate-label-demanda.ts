/**
 * One-time migration: rename workedForState label to "Tiene demanda al Estado".
 *
 * Run once against your production DB:
 *   npx tsx prisma/migrate-label-demanda.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.formFieldConfig.update({
    where:  { fieldKey: 'workedForState' },
    data:   { label: 'Tiene demanda al Estado' },
  })
  console.log('  ✔ workedForState → label actualizado a "Tiene demanda al Estado"')
  console.log('\n✅ Migración completada.')
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => void prisma.$disconnect())
