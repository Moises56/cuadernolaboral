import { type NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'

// ─── Brand colors ────────────────────────────────────────────────────────────
const COLOR_PRIMARY      = 'FF1E3A5F'  // #1e3a5f
const COLOR_HEADER_ALT   = 'FF2D4F7C'  // slightly lighter for column headers
const COLOR_ROW_EVEN     = 'FFF8FAFC'  // #f8fafc
const COLOR_ROW_ODD      = 'FFFFFFFF'  // white
const COLOR_BORDER       = 'FFE2E8F0'  // #e2e8f0
const COLOR_DEMAND_TEXT  = 'FFB45309'  // amber-700
const COLOR_WHITE        = 'FFFFFFFF'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    const q       = (sp.get('q')       ?? '').trim()
    const demanda = sp.get('demanda')   ?? 'all'
    const plaza   = sp.get('plaza')     ?? 'all'

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

    // ── Parallel fetch ──────────────────────────────────────────────────────
    const [personas, activeFields] = await Promise.all([
      prisma.person.findMany({
        where,
        include: {
          relatedPerson: { select: { fullName: true, dni: true, relationship: true } },
          dynamicValues: {
            include: { field: { select: { fieldKey: true, label: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.formFieldConfig.findMany({
        where:   { active: true },
        orderBy: { order: 'asc' },
        select:  { fieldKey: true, label: true },
      }),
    ])

    // ── Workbook setup ─────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook()
    wb.creator  = 'CuadernoLaboral'
    wb.created  = new Date()

    const ws = wb.addWorksheet('Registro Laboral', {
      pageSetup: {
        paperSize:   9, // A4
        orientation: 'landscape',
        fitToPage:   true,
        fitToWidth:  1,
        fitToHeight: 0,
        margins:     { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
    })

    // ── Column definitions ─────────────────────────────────────────────────
    const FIXED_COLS = [
      { key: 'fullName',     header: 'Nombre completo',  width: 32 },
      { key: 'dni',          header: 'DNI',              width: 16 },
      { key: 'phone',        header: 'Teléfono',         width: 15 },
      { key: 'email',        header: 'Correo electrónico', width: 28 },
      { key: 'age',          header: 'Edad',             width: 8  },
      { key: 'profession',   header: 'Profesión',        width: 22 },
      { key: 'hasDemand',    header: 'Demanda',          width: 12 },
      { key: 'workPlace',    header: 'Plaza / Institución', width: 26 },
      { key: 'contractType', header: 'Tipo de contrato', width: 16 },
    ]
    const DYN_COLS = activeFields.map((f) => ({
      key:    f.fieldKey,
      header: f.label,
      width:  18,
    }))
    const ALL_COLS = [...FIXED_COLS, ...DYN_COLS]
    const TOTAL_COLS = ALL_COLS.length

    ws.columns = ALL_COLS.map((c) => ({ key: c.key, width: c.width }))

    // ── Row 1: Branding title ──────────────────────────────────────────────
    ws.mergeCells(1, 1, 1, TOTAL_COLS)
    const titleCell = ws.getCell('A1')
    titleCell.value = `CuadernoLaboral — Registro Laboral  ·  Generado el ${
      new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    }`
    titleCell.font      = { bold: true, size: 13, color: { argb: COLOR_WHITE }, name: 'Calibri' }
    titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARY } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(1).height = 30

    // ── Row 2: Column headers ──────────────────────────────────────────────
    const headerRow = ws.getRow(2)
    ALL_COLS.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value     = col.header
      cell.font      = { bold: true, size: 9.5, color: { argb: COLOR_WHITE }, name: 'Calibri' }
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_ALT } }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: false }
      cell.border    = { bottom: { style: 'thin', color: { argb: COLOR_BORDER } } }
    })
    headerRow.height = 22

    // Freeze rows 1 + 2
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2, activeCell: 'A3' }]

    // ── Data rows ──────────────────────────────────────────────────────────
    personas.forEach((p, idx) => {
      const dynMap: Record<string, string> = {}
      p.dynamicValues.forEach((dv) => {
        dynMap[dv.field.fieldKey] = dv.value
      })

      const rowValues: Record<string, string | number> = {
        fullName:     p.fullName,
        dni:          p.dni,
        phone:        p.phone,
        email:        p.email        ?? '',
        age:          p.age          ?? '',
        profession:   p.profession   ?? '',
        hasDemand:    p.hasDemand ? 'Sí' : 'No',
        workPlace:    p.workPlace    ?? '',
        contractType: p.contractType === 'ACUERDO'
          ? 'Acuerdo'
          : p.contractType === 'CONTRATO'
            ? 'Contrato'
            : '',
      }
      activeFields.forEach((f) => {
        rowValues[f.fieldKey] = dynMap[f.fieldKey] ?? ''
      })

      const row    = ws.addRow(rowValues)
      const isEven = idx % 2 === 0
      row.height   = 17

      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const colKey = ALL_COLS[colNum - 1]?.key ?? ''

        cell.font = {
          name: 'Calibri',
          size: 9.5,
          ...(colKey === 'hasDemand' && p.hasDemand
            ? { color: { argb: COLOR_DEMAND_TEXT }, bold: true }
            : {}),
        }
        cell.fill      = {
          type:    'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? COLOR_ROW_EVEN : COLOR_ROW_ODD },
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        cell.border    = {
          bottom: { style: 'hair', color: { argb: COLOR_BORDER } },
        }

        // Mono font for DNI
        if (colKey === 'dni') {
          cell.font = { ...cell.font as ExcelJS.Font, name: 'Courier New', size: 9 }
          cell.numFmt = '@' // force text format
        }
        if (colKey === 'age' && p.age) {
          cell.numFmt = '0'
          cell.alignment = { ...cell.alignment, horizontal: 'center' }
        }
      })
    })

    // ── Output ─────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="CuadernoLaboral-${
          new Date().toISOString().slice(0, 10)
        }.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[export/excel]', error)
    return NextResponse.json(
      { error: 'Error al generar el archivo Excel' },
      { status: 500 },
    )
  }
}
