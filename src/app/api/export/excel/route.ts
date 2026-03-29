import { type NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'

// ─── Brand colors ─────────────────────────────────────────────────────────────
const COLOR_PRIMARY    = 'FF6B3FA0'  // #6B3FA0
const COLOR_HEADER_ALT = 'FF7D4FB8'  // slightly lighter
const COLOR_ROW_EVEN   = 'FFF9F6FE'
const COLOR_ROW_ODD    = 'FFFFFFFF'
const COLOR_BORDER     = 'FFE8E2F0'
const COLOR_WHITE      = 'FFFFFFFF'
const COLOR_LINK       = 'FF0563C1'

// ─── Column definitions ───────────────────────────────────────────────────────
const COLS = [
  { key: 'fullName',       header: 'Nombre',              width: 30 },
  { key: 'dni',            header: 'DNI',                 width: 18 },
  { key: 'phone',          header: 'Teléfono',            width: 15 },
  { key: 'email',          header: 'Correo',              width: 28 },
  { key: 'nivelEducativo', header: 'Nivel Educativo',     width: 18 },
  { key: 'cvUrl',          header: 'CV',                  width: 35 },
  { key: 'detallePerfil',  header: 'Detalle del Perfil',  width: 50 },
] as const

type ColKey = (typeof COLS)[number]['key']

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const q       = (sp.get('q')       ?? '').trim()
    const demanda = sp.get('demanda')   ?? 'all'
    const plaza   = sp.get('plaza')     ?? 'all'

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
    }

    const personas = await prisma.person.findMany({
      where,
      select: {
        fullName: true,
        dni:      true,
        phone:    true,
        email:    true,
        cvUrl:    true,
        dynamicValues: {
          include: { field: { select: { fieldKey: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Workbook ──────────────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook()
    wb.creator = 'CuadernoLaboral'
    wb.created = new Date()

    const ws = wb.addWorksheet('Registro Laboral', {
      pageSetup: {
        paperSize:   9,
        orientation: 'landscape',
        fitToPage:   true,
        fitToWidth:  1,
        fitToHeight: 0,
        margins:     { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
    })

    ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }))

    // ── Row 1: title ──────────────────────────────────────────────────────────
    ws.mergeCells(1, 1, 1, COLS.length)
    const titleCell = ws.getCell('A1')
    titleCell.value = `CuadernoLaboral — Registro Laboral  ·  Generado el ${
      new Date().toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' })
    }`
    titleCell.font      = { bold: true, size: 13, color: { argb: COLOR_WHITE }, name: 'Calibri' }
    titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARY } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(1).height = 30

    // ── Row 2: column headers ─────────────────────────────────────────────────
    const headerRow = ws.getRow(2)
    COLS.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value     = col.header
      cell.font      = { bold: true, size: 9.5, color: { argb: COLOR_WHITE }, name: 'Calibri' }
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_ALT } }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      cell.border    = { bottom: { style: 'thin', color: { argb: COLOR_BORDER } } }
    })
    headerRow.height = 22

    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2, activeCell: 'A3' }]

    // ── Data rows ─────────────────────────────────────────────────────────────
    personas.forEach((p, idx) => {
      const dynMap: Record<string, string> = {}
      p.dynamicValues.forEach((dv) => { dynMap[dv.field.fieldKey] = dv.value })

      const row    = ws.addRow({})
      const isEven = idx % 2 === 0
      row.height   = 17

      COLS.forEach((col, i) => {
        const cell   = row.getCell(i + 1)
        const colKey = col.key as ColKey

        // Base style
        cell.font      = { name: 'Calibri', size: 9.5 }
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COLOR_ROW_EVEN : COLOR_ROW_ODD } }
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: colKey === 'detallePerfil' }
        cell.border    = { bottom: { style: 'hair', color: { argb: COLOR_BORDER } } }

        switch (colKey) {
          case 'fullName':
            cell.value = p.fullName
            cell.font  = { ...cell.font as ExcelJS.Font, bold: true }
            break
          case 'dni':
            cell.value  = p.dni
            cell.font   = { ...cell.font as ExcelJS.Font, name: 'Courier New', size: 9 }
            cell.numFmt = '@'
            break
          case 'phone':
            cell.value  = p.phone
            cell.font   = { ...cell.font as ExcelJS.Font, name: 'Courier New', size: 9 }
            cell.numFmt = '@'
            break
          case 'email':
            cell.value = p.email ?? ''
            break
          case 'nivelEducativo':
            cell.value = dynMap['nivelEducativo'] ?? ''
            break
          case 'cvUrl':
            if (p.cvUrl) {
              cell.value = { text: 'Ver CV', hyperlink: p.cvUrl }
              cell.font  = { ...cell.font as ExcelJS.Font, color: { argb: COLOR_LINK }, underline: true }
            } else {
              cell.value = '—'
              cell.font  = { ...cell.font as ExcelJS.Font, color: { argb: 'FF94A3B8' } }
            }
            break
          case 'detallePerfil':
            cell.value = dynMap['detallePerfil'] ?? ''
            if (dynMap['detallePerfil']) row.height = 40
            break
        }
      })
    })

    // ── Output ────────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="CuadernoLaboral-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[export/excel]', error)
    return NextResponse.json({ error: 'Error al generar el archivo Excel' }, { status: 500 })
  }
}
