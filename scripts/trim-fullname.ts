import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const cs = process.env.DATABASE_URL
if (!cs) { console.error('DATABASE_URL not set'); process.exit(1) }

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) })

async function main() {
  console.log('🔍 Buscando registros con whitespace al inicio o al final en fullName...\n')

  // ── Person.fullName ────────────────────────────────────────────────────────
  const personas = await prisma.person.findMany({ select: { id: true, fullName: true } })
  const personasSucias = personas.filter((p) => p.fullName !== p.fullName.trim())

  console.log(`Person: ${personasSucias.length} registro(s) con whitespace de ${personas.length} totales`)
  for (const p of personasSucias) {
    const clean = p.fullName.trim()
    console.log(`  ✏ ${p.id}: ${JSON.stringify(p.fullName)} → ${JSON.stringify(clean)}`)
    await prisma.person.update({
      where: { id: p.id },
      data:  { fullName: clean },
    })
  }

  // ── RelatedPerson.fullName ─────────────────────────────────────────────────
  const related = await prisma.relatedPerson.findMany({ select: { id: true, fullName: true } })
  const relatedSucios = related.filter((r) => r.fullName !== r.fullName.trim())

  console.log(`\nRelatedPerson: ${relatedSucios.length} registro(s) con whitespace de ${related.length} totales`)
  for (const r of relatedSucios) {
    const clean = r.fullName.trim()
    console.log(`  ✏ ${r.id}: ${JSON.stringify(r.fullName)} → ${JSON.stringify(clean)}`)
    await prisma.relatedPerson.update({
      where: { id: r.id },
      data:  { fullName: clean },
    })
  }

  console.log('\n✅ Limpieza completada')
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
