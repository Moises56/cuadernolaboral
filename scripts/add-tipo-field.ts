import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const cs = process.env.DATABASE_URL
if (!cs) { console.error('DATABASE_URL not set'); process.exit(1) }

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) })

async function main() {
  // Check if tipo already exists
  const existing = await prisma.formFieldConfig.findUnique({ where: { fieldKey: 'tipo' } })
  if (existing) {
    console.log('✅ Campo "tipo" ya existe:', existing.id, '| order:', existing.order, '| isCore:', existing.isCore)
    // Ensure it's core and active
    if (!existing.isCore || !existing.active) {
      await prisma.formFieldConfig.update({
        where: { fieldKey: 'tipo' },
        data: { isCore: true, active: true },
      })
      console.log('   Actualizado a isCore=true, active=true')
    }
    return
  }

  // Find workedForState order to place tipo just before it
  const ws = await prisma.formFieldConfig.findUnique({ where: { fieldKey: 'workedForState' } })
  const tipoOrder = ws ? ws.order : 7

  // Shift existing fields at that order and above
  await prisma.formFieldConfig.updateMany({
    where: { isCore: true, order: { gte: tipoOrder } },
    data: { order: { increment: 1 } },
  })

  const created = await prisma.formFieldConfig.create({
    data: {
      label:    'Tipo',
      fieldKey: 'tipo',
      type:     'SELECT',
      required: true,
      options:  ['JRV', 'MESA_APOYO', 'OBSERVADORES'],
      order:    tipoOrder,
      active:   true,
      isCore:   true,
    },
  })

  console.log('✅ Campo "tipo" creado:', created.id, '| order:', created.order)
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
