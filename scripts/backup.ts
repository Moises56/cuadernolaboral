/**
 * Database Backup Script
 *
 * Exports all data from the Neon PostgreSQL database to JSON files.
 * READ-ONLY — does not modify any data.
 *
 * Usage: npx tsx scripts/backup.ts
 */
import 'dotenv/config'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// ── Setup ─────────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set. Check your .env file.')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const BACKUP_DIR = join(__dirname, '..', 'backup')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const folder = join(BACKUP_DIR, timestamp)

// ── Helpers ───────────────────────────────────────────────────────────────────

function saveJson(filename: string, data: unknown) {
  const path = join(folder, filename)
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`  ✅ ${filename}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔒 CuadernoLaboral — Backup de datos`)
  console.log(`   Destino: ${folder}\n`)

  // Create backup folder
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true })
  mkdirSync(folder, { recursive: true })

  // ── 1. Persons (with relations) ──────────────────────────────────────────
  console.log('📋 Exportando tablas...')

  const persons = await prisma.person.findMany({
    include: {
      relatedPerson: true,
      dynamicValues: {
        include: { field: { select: { fieldKey: true, label: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  saveJson('persons.json', persons)

  // ── 2. Form field configuration ──────────────────────────────────────────
  const fields = await prisma.formFieldConfig.findMany({
    orderBy: { order: 'asc' },
  })
  saveJson('form-fields.json', fields)

  // ── 3. Users (without password hashes for safety) ────────────────────────
  const users = await prisma.user.findMany({
    select: {
      id:          true,
      username:    true,
      role:        true,
      displayName: true,
      active:      true,
      createdAt:   true,
      updatedAt:   true,
      // passwordHash: EXCLUDED for security
    },
    orderBy: { createdAt: 'asc' },
  })
  saveJson('users.json', users)

  // ── 4. Metadata ──────────────────────────────────────────────────────────
  const meta = {
    backupDate: new Date().toISOString(),
    timestamp,
    counts: {
      persons:        persons.length,
      relatedPersons: persons.filter((p) => p.relatedPerson).length,
      dynamicValues:  persons.reduce((sum, p) => sum + p.dynamicValues.length, 0),
      formFields:     fields.length,
      users:          users.length,
    },
    database: 'Neon PostgreSQL',
    note: 'Passwords excluded from users export. Sessions not exported (ephemeral).',
  }
  saveJson('_metadata.json', meta)

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n📊 Resumen:`)
  console.log(`   Personas:          ${meta.counts.persons}`)
  console.log(`   Familiares:        ${meta.counts.relatedPersons}`)
  console.log(`   Valores dinámicos: ${meta.counts.dynamicValues}`)
  console.log(`   Campos config:     ${meta.counts.formFields}`)
  console.log(`   Usuarios:          ${meta.counts.users}`)
  console.log(`\n✅ Backup completado en: ${folder}\n`)
}

main()
  .catch((err) => {
    console.error('❌ Error durante el backup:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
