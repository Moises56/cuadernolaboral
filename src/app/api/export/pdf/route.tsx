import { type NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLOR_PRIMARY    = '#6B3FA0'
const COLOR_HEADER_ALT = '#7D4FB8'
const COLOR_BG         = '#FAFAF9'
const COLOR_ROW_EVEN   = '#F3EEF9'
const COLOR_ROW_ODD    = '#ffffff'
const COLOR_MUTED      = '#6B6880'
const COLOR_BORDER     = '#E8E2F0'
const COLOR_WHITE      = '#ffffff'
const COLOR_LINK       = '#0563C1'

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    backgroundColor: COLOR_BG,
    paddingTop:      30,
    paddingBottom:   44,
    paddingLeft:     24,
    paddingRight:    24,
    fontFamily:      'Helvetica',
    fontSize:        8,
  },
  headerBlock: {
    backgroundColor:   COLOR_PRIMARY,
    borderRadius:      4,
    paddingVertical:   10,
    paddingHorizontal: 14,
    marginBottom:      12,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  headerTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLOR_WHITE },
  headerMeta:  { fontSize: 8,  color: '#C4A8E8' },
  summaryRow:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  summaryChip: {
    backgroundColor:   COLOR_WHITE,
    borderRadius:      3,
    paddingVertical:   3,
    paddingHorizontal: 7,
    borderWidth:       0.5,
    borderColor:       COLOR_BORDER,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
  },
  summaryLabel: { fontSize: 7.5, color: COLOR_MUTED },
  summaryValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLOR_PRIMARY },
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
    minHeight:         16,
  },
  tableRowEven: { backgroundColor: COLOR_ROW_EVEN },
  tableRowOdd:  { backgroundColor: COLOR_ROW_ODD  },
  headerCell: {
    fontFamily:   'Helvetica-Bold',
    fontSize:     7.5,
    color:        COLOR_WHITE,
    paddingRight: 4,
  },
  cell:      { fontSize: 8,   color: '#0f172a',   paddingRight: 4 },
  cellMuted: { fontSize: 7.5, color: COLOR_MUTED,  paddingRight: 4 },
  cellMono:  { fontFamily: 'Courier', fontSize: 7.5, color: COLOR_MUTED, paddingRight: 4 },
  cellBold:  { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#0f172a', paddingRight: 4 },
  cellLink:  { fontSize: 7.5, color: COLOR_LINK,   paddingRight: 4, textDecoration: 'underline' },
  footer: {
    position:        'absolute',
    bottom:          18,
    left:            24,
    right:           24,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    borderTopWidth:  0.5,
    borderTopColor:  COLOR_BORDER,
    paddingTop:      5,
  },
  footerText: { fontSize: 7, color: COLOR_MUTED },
  pageNum:    { fontSize: 7, color: COLOR_MUTED },
})

// ─── Column layout ────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'fullName',      label: 'Nombre',             flex: 16 },
  { key: 'tipo',          label: 'Tipo',               flex: 8  },
  { key: 'dni',           label: 'DNI',                flex: 12 },
  { key: 'phone',         label: 'Teléfono',           flex: 10 },
  { key: 'profession',    label: 'Profesión',          flex: 12 },
  { key: 'cvUrl',         label: 'CV',                 flex: 8  },
  { key: 'hasDemand',     label: 'Demanda',            flex: 10 },
  { key: 'detallePerfil', label: 'Detalle del Perfil', flex: 28 },
] as const

type ColKey = (typeof COLUMNS)[number]['key']

// ─── Data type ────────────────────────────────────────────────────────────────
interface PersonaData {
  id:            string
  fullName:      string
  tipo:          string
  dni:           string
  phone:         string
  profession:    string[]
  hasDemand:     boolean
  cvUrl:         string | null
  detallePerfil: string
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

// ─── PDF Document ─────────────────────────────────────────────────────────────
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

        {/* Header */}
        <View style={styles.headerBlock} fixed>
          <View>
            <Text style={styles.headerTitle}>CuadernoLaboral</Text>
            <Text style={styles.headerMeta}>Registro Laboral — Exportación oficial</Text>
          </View>
          <Text style={styles.headerMeta}>Generado el {generatedAt}</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow} fixed>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{total}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Con demanda</Text>
            <Text style={[styles.summaryValue, { color: '#b45309' }]}>{conDemanda}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Con plaza</Text>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{conPlaza}</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader} fixed>
          {COLUMNS.map((col) => (
            <Text key={col.key} style={[styles.headerCell, { flex: col.flex }]}>
              {col.label}
            </Text>
          ))}
        </View>

        {/* Data rows */}
        {personas.map((p, idx) => (
          <View
            key={p.id}
            style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
            wrap={false}
          >
            {COLUMNS.map((col) => {
              const key = col.key as ColKey

              if (key === 'cvUrl') {
                return p.cvUrl ? (
                  <Link key={key} src={p.cvUrl} style={{ flex: col.flex }}>
                    <Text style={styles.cellLink}>Ver CV</Text>
                  </Link>
                ) : (
                  <Text key={key} style={[styles.cellMuted, { flex: col.flex }]}>—</Text>
                )
              }

              let text = ''
              let cellStyle = styles.cell
              switch (key) {
                case 'fullName':
                  text = p.fullName
                  cellStyle = styles.cellBold
                  break
                case 'tipo': {
                  const tipoLabels: Record<string, string> = {
                    JRV: 'JRV', MESA_APOYO: 'Mesa de Apoyo', OBSERVADORES: 'Observadores',
                    ROBLES: 'Robles', AMOR_VIVIENTE: 'Amor Viviente',
                  }
                  const tipoTextColor: Record<string, string> = {
                    JRV: '#6B3FA0', MESA_APOYO: '#0F766E', OBSERVADORES: '#9A3412',
                    ROBLES: '#047857', AMOR_VIVIENTE: '#BE123C',
                  }
                  text = tipoLabels[p.tipo] ?? p.tipo
                  cellStyle = { ...styles.cell, color: tipoTextColor[p.tipo] ?? '#6B7280', fontFamily: 'Helvetica-Bold' } as typeof styles.cell
                  break
                }
                case 'dni':
                  text = p.dni
                  cellStyle = styles.cellMono
                  break
                case 'phone':
                  text = p.phone
                  cellStyle = styles.cellMono
                  break
                case 'profession':
                  text = p.profession.join(', ') || '—'
                  cellStyle = styles.cellMuted
                  break
                case 'hasDemand':
                  text = p.hasDemand ? 'Con demanda' : 'Sin demanda'
                  cellStyle = p.hasDemand
                    ? { ...styles.cell, color: '#B91C1C', fontFamily: 'Helvetica-Bold' } as typeof styles.cell
                    : { ...styles.cellMuted, color: '#16A34A' } as typeof styles.cellMuted
                  break
                case 'detallePerfil':
                  text = p.detallePerfil ? truncate(p.detallePerfil, 120) : '—'
                  cellStyle = styles.cellMuted
                  break
              }

              return (
                <Text key={key} style={[cellStyle, { flex: col.flex }]}>
                  {text}
                </Text>
              )
            })}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>CuadernoLaboral — Documento de uso oficial</Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
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
    const tipo    = sp.get('tipo')    ?? 'all'

    // Sort params — validated to prevent injection
    // Default: createdAt desc — matchea el default de /personas page (más reciente primero)
    const VALID_SORT = ['fullName', 'dni', 'createdAt'] as const
    const rawOrderBy  = sp.get('orderBy') ?? 'createdAt'
    const rawOrderDir = sp.get('orderDir') ?? 'desc'
    const sortField = VALID_SORT.includes(rawOrderBy as typeof VALID_SORT[number])
      ? rawOrderBy : 'createdAt'
    const sortDir = rawOrderDir === 'asc' ? 'asc' : 'desc'

    const where = {
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' as const } },
          { dni:      { contains: q } },
        ],
      }),
      ...(demanda === 'con' && { hasDemand: true  }),
      ...(demanda === 'sin' && { hasDemand: false }),
      ...(plaza === 'asignada'  && { workPlace: { not: null } }),
      ...(plaza === 'pendiente' && { workPlace: null }),
      ...(tipo !== 'all' && { tipo: tipo as 'JRV' | 'MESA_APOYO' | 'OBSERVADORES' | 'ROBLES' | 'AMOR_VIVIENTE' }),
    }

    const [rows, total, conDemanda, conPlaza] = await Promise.all([
      prisma.person.findMany({
        where,
        select: {
          id:         true,
          fullName:   true,
          tipo:       true,
          dni:        true,
          phone:      true,
          profession: true,
          hasDemand:  true,
          cvUrl:      true,
          dynamicValues: {
            include: { field: { select: { fieldKey: true } } },
          },
        },
        orderBy: { [sortField]: sortDir },
      }),
      prisma.person.count({ where }),
      prisma.person.count({ where: { hasDemand: true } }),
      prisma.person.count({ where: { workPlace: { not: null } } }),
    ])

    // Spanish-aware sort para fullName: maneja tildes (á,é,í,ó,ú) y ñ
    // que la collation por defecto de Postgres/Neon ordena incorrectamente.
    if (sortField === 'fullName') {
      const collator = new Intl.Collator('es', {
        sensitivity:       'base',
        ignorePunctuation: true,
      })
      rows.sort((a, b) =>
        sortDir === 'asc'
          ? collator.compare(a.fullName, b.fullName)
          : collator.compare(b.fullName, a.fullName),
      )
    }

    const personas: PersonaData[] = rows.map((p) => {
      const dyn: Record<string, string> = {}
      p.dynamicValues.forEach((dv) => { dyn[dv.field.fieldKey] = dv.value })
      return {
        id:            p.id,
        fullName:      p.fullName,
        tipo:          p.tipo,
        dni:           p.dni,
        phone:         p.phone,
        profession:    p.profession,
        hasDemand:     p.hasDemand,
        cvUrl:         p.cvUrl,
        detallePerfil: dyn['detallePerfil'] ?? '',
      }
    })

    const generatedAt = new Date().toLocaleDateString('es-HN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })

    const pdfElement = React.createElement(CuadernoLaboralPDF, {
      personas, total, conDemanda, conPlaza, generatedAt,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as any)

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="CuadernoLaboral-${new Date().toISOString().slice(0, 10)}.pdf"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[export/pdf]', error)
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 })
  }
}
