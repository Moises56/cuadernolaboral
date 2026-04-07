import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const cs = process.env.DATABASE_URL
if (!cs) { console.error('DATABASE_URL not set'); process.exit(1) }

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) })

function describe(s: string): string {
  const codes = [...s].slice(0, 6).map((c) => {
    const cp = c.codePointAt(0)!
    return `U+${cp.toString(16).padStart(4, '0')}(${JSON.stringify(c)})`
  })
  return codes.join(' ')
}

async function main() {
  const all = await prisma.person.findMany({
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  })

  console.log(`\nTotal: ${all.length} registros`)
  console.log('\n── Primeros 10 (orden Postgres ASC) ─────────────────────────')
  all.slice(0, 10).forEach((p, i) => {
    const trimmed = p.fullName.trim()
    const hasWs = p.fullName !== trimmed
    console.log(
      `${String(i + 1).padStart(3, ' ')}. ${hasWs ? '⚠ ' : '  '}${JSON.stringify(p.fullName)}`,
    )
    if (hasWs || /[^\x20-\x7Eáéíóúñü ÁÉÍÓÚÑÜ]/.test(p.fullName)) {
      console.log(`        first chars: ${describe(p.fullName)}`)
    }
  })

  console.log('\n── Registros con whitespace o caracteres raros al inicio ──')
  const sospechosos = all.filter((p) => {
    const firstChar = p.fullName[0] ?? ''
    const first     = firstChar.codePointAt(0) ?? 0
    // No es A-Z, a-z, ni vocal con tilde común
    return first < 0x41 || (first > 0x5a && first < 0x61) || first > 0x7a
      ? !'ÁÉÍÓÚÑáéíóúñ'.includes(firstChar)
      : false
  })
  if (sospechosos.length === 0) {
    console.log('  (ninguno)')
  } else {
    sospechosos.forEach((p) => {
      console.log(`  - ${p.id}: ${describe(p.fullName)}`)
    })
  }

  console.log('\n── Buscar específicamente "Yeni" ────────────────────────────')
  const yeni = all.filter((p) => p.fullName.toLowerCase().includes('yeni'))
  yeni.forEach((p) => {
    console.log(`  id: ${p.id}`)
    console.log(`  fullName raw: ${JSON.stringify(p.fullName)}`)
    console.log(`  trimmed:      ${JSON.stringify(p.fullName.trim())}`)
    console.log(`  has whitespace at edges: ${p.fullName !== p.fullName.trim()}`)
    console.log(`  first 6 codepoints: ${describe(p.fullName)}`)
  })
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
