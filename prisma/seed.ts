import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set')
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── Campos dinámicos ───────────────────────────────────────────────
  const municipio = await prisma.formFieldConfig.upsert({
    where:  { fieldKey: 'municipio' },
    update: {},
    create: {
      label:       'Municipio',
      fieldKey:    'municipio',
      type:        'TEXT',
      required:    false,
      placeholder: 'Ej: Capital',
      options:     [],
      order:       1,
      active:      true,
    },
  })

  const nivelEducativo = await prisma.formFieldConfig.upsert({
    where:  { fieldKey: 'nivelEducativo' },
    update: {},
    create: {
      label:    'Nivel educativo',
      fieldKey: 'nivelEducativo',
      type:     'SELECT',
      required: false,
      options:  ['Primario', 'Secundario', 'Terciario', 'Universitario', 'Posgrado'],
      order:    2,
      active:   true,
    },
  })

  const fechaNacimiento = await prisma.formFieldConfig.upsert({
    where:  { fieldKey: 'fechaNacimiento' },
    update: {},
    create: {
      label:    'Fecha de nacimiento',
      fieldKey: 'fechaNacimiento',
      type:     'DATE',
      required: false,
      options:  [],
      order:    3,
      active:   true,
    },
  })

  // ── Personas ───────────────────────────────────────────────────────

  // 1 — Sin demanda, sin vinculado
  const persona1 = await prisma.person.upsert({
    where:  { dni: '28456789' },
    update: {},
    create: {
      fullName:       'Carlos Alberto Fernández',
      dni:            '28456789',
      phone:          '3814001122',
      email:          'carlos.fernandez@mail.com',
      age:            42,
      profession:     'Contador Público',
      workedForState: true,
      hasDemand:      false,
      observations:   'Experiencia en administración pública provincial.',
    },
  })

  // 2 — Sin demanda, con valor en nivelEducativo
  const persona2 = await prisma.person.upsert({
    where:  { dni: '31987654' },
    update: {},
    create: {
      fullName:       'María Luisa Romero',
      dni:            '31987654',
      phone:          '3815003344',
      email:          'mluisa.romero@mail.com',
      age:            35,
      profession:     'Licenciada en Trabajo Social',
      workedForState: false,
      hasDemand:      false,
    },
  })

  // 3 — Con demanda + persona vinculada
  const persona3 = await prisma.person.upsert({
    where:  { dni: '25113344' },
    update: {},
    create: {
      fullName:       'Roberto Javier Medina',
      dni:            '25113344',
      phone:          '3816005566',
      age:            50,
      profession:     'Técnico Electricista',
      workedForState: true,
      hasDemand:      true,
      observations:   'Demanda laboral activa desde 2023. Derivado a legal.',
      relatedPerson: {
        create: {
          fullName:     'Susana Beatriz Medina',
          dni:          '27441122',
          phone:        '3816009900',
          email:        'susana.medina@mail.com',
          relationship: 'Cónyuge',
        },
      },
    },
  })

  // 4 — Con demanda + persona vinculada
  const persona4 = await prisma.person.upsert({
    where:  { dni: '33667788' },
    update: {},
    create: {
      fullName:       'Ana Cecilia Torres',
      dni:            '33667788',
      phone:          '3817007788',
      email:          'ana.torres@mail.com',
      age:            29,
      profession:     'Abogada',
      workedForState: false,
      hasDemand:      true,
      observations:   'Presenta reclamo por acceso a cargo público.',
      relatedPerson: {
        create: {
          fullName:     'Marcelo Ariel Torres',
          dni:          '30558899',
          phone:        '3817001234',
          relationship: 'Hermano',
        },
      },
    },
  })

  // 5 — Sin demanda, con municipio y fechaNacimiento
  const persona5 = await prisma.person.upsert({
    where:  { dni: '20334455' },
    update: {},
    create: {
      fullName:       'José Luis Gutiérrez',
      dni:            '20334455',
      phone:          '3818009911',
      age:            58,
      profession:     'Ingeniero Civil',
      workedForState: true,
      hasDemand:      false,
    },
  })

  // ── Valores dinámicos ──────────────────────────────────────────────
  await prisma.dynamicFieldValue.createMany({
    skipDuplicates: true,
    data: [
      { personId: persona2.id, fieldId: nivelEducativo.id, value: 'Universitario' },
      { personId: persona3.id, fieldId: municipio.id,      value: 'Capital' },
      { personId: persona5.id, fieldId: municipio.id,      value: 'Banda' },
      { personId: persona5.id, fieldId: fechaNacimiento.id, value: '1967-04-12' },
      { personId: persona5.id, fieldId: nivelEducativo.id,  value: 'Universitario' },
    ],
  })

  // ── Usuarios ───────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where:  { username: 'admin' },
    update: {},
    create: {
      username:     'admin',
      passwordHash: await bcrypt.hash('Admin2024!', 12),
      role:         'ADMIN',
      displayName:  'Administrador',
      active:       true,
    },
  })

  const viewer = await prisma.user.upsert({
    where:  { username: 'viewer' },
    update: {},
    create: {
      username:     'viewer',
      passwordHash: await bcrypt.hash('Viewer2024!', 12),
      role:         'VIEWER',
      displayName:  'Solo Lectura',
      active:       true,
    },
  })

  console.log('✅ Seed completado:')
  console.log(`   Usuarios: ${admin.username} (ADMIN) | ${viewer.username} (VIEWER)`)
  console.log(`   FormFieldConfig: municipio(${municipio.id}), nivelEducativo(${nivelEducativo.id}), fechaNacimiento(${fechaNacimiento.id})`)
  console.log(`   Personas: ${[persona1, persona2, persona3, persona4, persona5].map(p => p.fullName).join(' | ')}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
