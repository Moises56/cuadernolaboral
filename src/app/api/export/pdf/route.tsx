import { type NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLOR_PRIMARY    = '#1e3a5f'
const COLOR_HEADER_ALT = '#2d4f7c'
const COLOR_BG         = '#f8fafc'
const COLOR_ROW_EVEN   = '#f1f5f9'
const COLOR_ROW_ODD    = '#ffffff'
const COLOR_MUTED      = '#64748b'
const COLOR_DEMAND     = '#b45309'
const COLOR_BORDER     = '#e2e8f0'
const COLOR_WHITE      = '#ffffff'

// ─── PDF styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    backgroundColor: COLOR_BG,
    paddingTop:      32,
    paddingBottom:   44,
    paddingLeft:     28,
    paddingRight:    28,
    fontFamily:      'Helvetica',
    fontSize:        8,
  },
  // Header
  headerBlock: {
    backgroundColor: COLOR_PRIMARY,
    borderRadius:    4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom:    14,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
  },
  headerTitle: {
    fontSize:   13,
    fontFamily: 'Helvetica-Bold',
    color:      COLOR_WHITE,
  },
  headerMeta: {
    fontSize: 8,
    color:    '#93c5fd',
  },
  // Summary row
  summaryRow: {
    flexDirection:   'row',
    gap:             8,
    marginBottom:    10,
  },
  summaryChip: {
    backgroundColor: COLOR_WHITE,
    borderRadius:    3,
    paddingVertical:  3,
    paddingHorizontal: 7,
    borderWidth:     0.5,
    borderColor:     COLOR_BORDER,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             3,
  },
  summaryLabel: {
    fontSize: 7.5,
    color:    COLOR_MUTED,
  },
  summaryValue: {
    fontSize:   8.5,
    fontFamily: 'Helvetica-Bold',
    color:      COLOR_PRIMARY,
  },
  // Table
  tableHeader: {
    flexDirection:     'row',
    backgroundColor:   COLOR_HEADER_ALT,
    borderRadius:      3,
    paddingVertical:   5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection:     'row',
    paddingVertical:   4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  tableRowEven: {
    backgroundColor: COLOR_ROW_EVEN,
  },
  tableRowOdd: {
    backgroundColor: COLOR_ROW_ODD,
  },
  headerCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize:   7.5,
    color:      COLOR_WHITE,
    paddingRight: 4,
  },
  cell: {
    fontSize:    8,
    color:       '#0f172a',
    paddingRight: 4,
  },
  cellMuted: {
    fontSize:    8,
    color:       COLOR_MUTED,
    paddingRight: 4,
  },
  cellMono: {
    fontFamily:  'Courier',
    fontSize:    7.5,
    color:       COLOR_MUTED,
    paddingRight: 4,
  },
  cellDemand: {
    fontSize:   7.5,
    color:      COLOR_DEMAND,
    fontFamily: 'Helvetica-Bold',
  },
  // Footer
  footer: {
    position:   'absolute',
    bottom:     18,
    left:       28,
    right:      28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    paddingTop:  5,
  },
  footerText: {
    fontSize: 7,
    color:    COLOR_MUTED,
  },
  pageNum: {
    fontSize: 7,
    color:    COLOR_MUTED,
  },
})

// ─── Column definitions (max 8) ───────────────────────────────────────────────
const COLUMNS = [
  { key: 'fullName',     label: 'Nombre completo',  flex: 20, style: styles.cell },
  { key: 'dni',          label: 'DNI',               flex: 11, style: styles.cellMono },
  { key: 'phone',        label: 'Teléfono',          flex: 11, style: styles.cellMono },
  { key: 'profession',   label: 'Profesión',         flex: 14, style: styles.cellMuted },
  { key: 'hasDemand',    label: 'Demanda',            flex: 9,  style: styles.cell },
  { key: 'workPlace',    label: 'Plaza',              flex: 18, style: styles.cellMuted },
  { key: 'contractType', label: 'Contrato',           flex: 10, style: styles.cellMuted },
  { key: 'createdAt',    label: 'Registrado',         flex: 10, style: styles.cellMuted },
] as const

type ColKey = (typeof COLUMNS)[number]['key']

interface PersonaData {
  id:           string
  fullName:     string
  dni:          string
  phone:        string
  profession:   string | null
  hasDemand:    boolean
  workPlace:    string | null
  contractType: string | null
  createdAt:    Date
}

function getCellValue(persona: PersonaData, key: ColKey): string {
  switch (key) {
    case 'fullName':
      return persona.fullName
    case 'dni':
      return persona.dni
    case 'phone':
      return persona.phone
    case 'profession':
      return persona.profession ?? '—'
    case 'hasDemand':
      return persona.hasDemand ? 'Sí' : 'No'
    case 'workPlace':
      return persona.workPlace ?? 'Pendiente'
    case 'contractType':
      return persona.contractType === 'ACUERDO'
        ? 'Acuerdo'
        : persona.contractType === 'CONTRATO'
          ? 'Contrato'
          : '—'
    case 'createdAt':
      return new Date(persona.createdAt).toLocaleDateString('es-AR', {
        day:   '2-digit',
        month: '2-digit',
        year:  'numeric',
      })
  }
}

// ─── PDF Document ────────────────────────────────────────────────────────────
function CuadernoLaboralPDF({
  personas,
  total,
  conDemanda,
  conPlaza,
  generatedAt,
}: {
  personas:    PersonaData[]
  total:       number
  conDemanda:  number
  conPlaza:    number
  generatedAt: string
}) {
  return (
    <Document
      title="CuadernoLaboral — Registro Laboral"
      author="CuadernoLaboral"
      subject="Exportación de registro laboral"
    >
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.headerBlock} fixed>
          <View>
            <Text style={styles.headerTitle}>CuadernoLaboral</Text>
            <Text style={styles.headerMeta}>Registro Laboral — Exportación oficial</Text>
          </View>
          <View>
            <Text style={styles.headerMeta}>Generado el {generatedAt}</Text>
          </View>
        </View>

        {/* ── Summary chips ───────────────────────────────────────────────── */}
        <View style={styles.summaryRow} fixed>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{total}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Con demanda</Text>
            <Text style={[styles.summaryValue, { color: COLOR_DEMAND }]}>{conDemanda}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Con plaza</Text>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{conPlaza}</Text>
          </View>
        </View>

        {/* ── Table header ─────────────────────────────────────────────────── */}
        <View style={styles.tableHeader} fixed>
          {COLUMNS.map((col) => (
            <Text key={col.key} style={[styles.headerCell, { flex: col.flex }]}>
              {col.label}
            </Text>
          ))}
        </View>

        {/* ── Data rows ────────────────────────────────────────────────────── */}
        {personas.map((persona, idx) => (
          <View
            key={persona.id}
            style={[
              styles.tableRow,
              idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
            ]}
            wrap={false}
          >
            {COLUMNS.map((col) => {
              const value  = getCellValue(persona, col.key)
              const isName = col.key === 'fullName'
              const isDemand = col.key === 'hasDemand' && persona.hasDemand
              return (
                <Text
                  key={col.key}
                  style={[
                    col.style,
                    { flex: col.flex },
                    ...(isName   ? [{ fontFamily: 'Helvetica-Bold', color: '#0f172a' }] : []),
                    ...(isDemand ? [styles.cellDemand] : []),
                  ]}
                >
                  {value}
                </Text>
              )
            })}
          </View>
        ))}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>CuadernoLaboral — Documento de uso oficial</Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    const q       = (sp.get('q')     ?? '').trim()
    const demanda = sp.get('demanda') ?? 'all'
    const plaza   = sp.get('plaza')   ?? 'all'

    const where = {
      ...(q && {
        OR: [
          { fullName:   { contains: q, mode: 'insensitive' as const } },
          { dni:        { contains: q } },
          { profession: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
      ...(demanda === 'con' && { hasDemand: true }),
      ...(demanda === 'sin' && { hasDemand: false }),
      ...(plaza === 'asignada'  && { workPlace: { not: null } }),
      ...(plaza === 'pendiente' && { workPlace: null }),
    }

    const [personas, total, conDemanda, conPlaza] = await Promise.all([
      prisma.person.findMany({
        where,
        select: {
          id:           true,
          fullName:     true,
          dni:          true,
          phone:        true,
          profession:   true,
          hasDemand:    true,
          workPlace:    true,
          contractType: true,
          createdAt:    true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.person.count({ where }),
      prisma.person.count({ where: { hasDemand: true } }),
      prisma.person.count({ where: { workPlace: { not: null } } }),
    ])

    const generatedAt = new Date().toLocaleDateString('es-AR', {
      weekday: 'long',
      day:     '2-digit',
      month:   'long',
      year:    'numeric',
    })

    const pdfElement = React.createElement(CuadernoLaboralPDF, {
      personas:    personas as PersonaData[],
      total,
      conDemanda,
      conPlaza,
      generatedAt,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- renderToBuffer types don't accept ReactElement<unknown>
    const buffer = await renderToBuffer(pdfElement as any)

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="CuadernoLaboral-${
          new Date().toISOString().slice(0, 10)
        }.pdf"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[export/pdf]', error)
    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 },
    )
  }
}
