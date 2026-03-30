import { type NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  titleBg:      'FF3D1F6B',
  subtitleBg:   'FF6B3FA0',
  accentStrip:  'FF31827C',
  headerBg:     'FF4A2B7A',
  headerBorder: 'FF31827C',
  rowEven:      'FFFAF7FF',
  rowOdd:       'FFFFFFFF',
  footerBg:     'FFF0EBF8',
  borderMain:   'FFD4C8E8',
  borderLight:  'FFE8E2F0',
  white:        'FFFFFFFF',
  whiteAlpha:   'FFD4B8F0',
  nameColor:    'FF2E1454',
  monoColor:    'FF4A3570',
  mutedColor:   'FF7B6F8C',
  cvBg:         'FFDBEAFE',
  cvText:       'FF1D4ED8',
  noCvBg:       'FFF8F8F8',
  noCvText:     'FFB0A8C0',
  demandaBg:    'FFFFF0F0',  // light red for con demanda
  demandaText:  'FFB91C1C',
  sinDemBg:     'FFF0FFF4',  // light green for sin demanda
  sinDemText:   'FF16A34A',
  footerText:   'FF5B3D8A',
}

// ─── Columns ─────────────────────────────────────────────────────────────────
const COLS = [
  { key: 'rowNum',        header: 'N°',                 width: 5,  center: true  },
  { key: 'fullName',      header: 'Nombre Completo',    width: 28, center: false },
  { key: 'dni',           header: 'DNI',                width: 17, center: true  },
  { key: 'phone',         header: 'Teléfono',           width: 14, center: true  },
  { key: 'profession',    header: 'Profesión / Oficio', width: 24, center: false },
  { key: 'cvUrl',         header: 'Currículum Vitae',   width: 14, center: true  },
  { key: 'hasDemand',     header: 'Demanda',            width: 14, center: true  },
  { key: 'detallePerfil', header: 'Detalle del Perfil', width: 46, center: false },
] as const

type ColKey = (typeof COLS)[number]['key']
const N = COLS.length

function borderFull(color: string, style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Borders> {
  const s = { style, color: { argb: color } }
  return { top: s, left: s, bottom: s, right: s }
}
function borderBottom(color: string, style: ExcelJS.BorderStyle = 'thin'): Partial<ExcelJS.Borders> {
  return { bottom: { style, color: { argb: color } } }
}

export async function GET(req: NextRequest) {
  try {
    const sp      = req.nextUrl.searchParams
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
        fullName:  true,
        dni:       true,
        phone:     true,
        profession: true,
        hasDemand: true,
        cvUrl:     true,
        dynamicValues: {
          include: { field: { select: { fieldKey: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const total   = personas.length
    const dateStr = new Date().toLocaleDateString('es-HN', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

    // ── Workbook ──────────────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook()
    wb.creator  = 'CuadernoLaboral'
    wb.created  = new Date()
    wb.modified = new Date()

    const ws = wb.addWorksheet('Registro Laboral', {
      pageSetup: {
        paperSize:      9,
        orientation:    'landscape',
        fitToPage:      true,
        fitToWidth:     1,
        fitToHeight:    0,
        printTitlesRow: '4:4',
        margins:        { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
      },
      headerFooter: {
        oddFooter: '&L&8CuadernoLaboral — Uso oficial&R&8Página &P de &N',
      },
    })

    ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }))

    // ── Row 1: title ──────────────────────────────────────────────────────────
    ws.mergeCells(1, 1, 1, N)
    ws.getRow(1).height = 42
    const t1 = ws.getCell('A1')
    t1.value     = 'CUADERNO LABORAL'
    t1.font      = { name: 'Calibri', bold: true, size: 18, color: { argb: C.white } }
    t1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } }
    t1.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

    // ── Row 2: subtitle ───────────────────────────────────────────────────────
    ws.mergeCells(2, 1, 2, N)
    ws.getRow(2).height = 20
    const t2 = ws.getCell('A2')
    t2.value     = `Registro de Personal   ·   Exportado: ${dateStr}   ·   ${total} registros`
    t2.font      = { name: 'Calibri', size: 9, color: { argb: C.whiteAlpha }, italic: true }
    t2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subtitleBg } }
    t2.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

    // ── Row 3: teal strip ─────────────────────────────────────────────────────
    ws.mergeCells(3, 1, 3, N)
    ws.getRow(3).height = 5
    ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.accentStrip } }

    // ── Row 4: column headers ─────────────────────────────────────────────────
    const r4 = ws.getRow(4)
    r4.height = 26
    COLS.forEach((col, i) => {
      const cell = r4.getCell(i + 1)
      cell.value     = col.header.toUpperCase()
      cell.font      = { name: 'Calibri', bold: true, size: 9, color: { argb: C.white } }
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } }
      cell.alignment = { vertical: 'middle', horizontal: col.center ? 'center' : 'left', indent: col.center ? 0 : 1 }
      cell.border    = {
        top:    { style: 'thin',   color: { argb: C.headerBg    } },
        left:   { style: 'thin',   color: { argb: C.titleBg     } },
        right:  { style: 'thin',   color: { argb: C.titleBg     } },
        bottom: { style: 'medium', color: { argb: C.accentStrip } },
      }
    })

    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: N } }
    ws.views      = [{ state: 'frozen', xSplit: 0, ySplit: 4, activeCell: 'A5' }]

    // ── Data rows ─────────────────────────────────────────────────────────────
    personas.forEach((p, idx) => {
      const dynMap: Record<string, string> = {}
      p.dynamicValues.forEach((dv) => { dynMap[dv.field.fieldKey] = dv.value })

      const hasCv      = Boolean(p.cvUrl)
      const detalle    = dynMap['detallePerfil'] ?? ''
      const hasDetalle = detalle.length > 0
      const isEven     = idx % 2 === 0
      const rowBg      = isEven ? C.rowEven : C.rowOdd

      const row  = ws.addRow({})
      row.height = hasDetalle ? 48 : 18

      COLS.forEach((col, i) => {
        const cell   = row.getCell(i + 1)
        const colKey = col.key as ColKey

        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        cell.alignment = {
          vertical:  'middle',
          horizontal: col.center ? 'center' : 'left',
          indent:    col.center ? 0 : 1,
          wrapText:  colKey === 'detallePerfil',
        }
        cell.border = {
          top:    { style: 'hair', color: { argb: C.borderLight } },
          left:   { style: 'hair', color: { argb: C.borderMain  } },
          bottom: { style: 'hair', color: { argb: C.borderLight } },
          right:  { style: 'hair', color: { argb: C.borderMain  } },
        }

        switch (colKey) {
          case 'rowNum':
            cell.value  = idx + 1
            cell.font   = { name: 'Calibri', size: 8, color: { argb: C.mutedColor } }
            cell.numFmt = '0'
            cell.border = { ...cell.border, right: { style: 'thin', color: { argb: C.borderMain } } }
            break

          case 'fullName':
            cell.value  = p.fullName
            cell.font   = { name: 'Calibri', bold: true, size: 10, color: { argb: C.nameColor } }
            cell.border = { ...cell.border, left: { style: 'medium', color: { argb: C.subtitleBg } } }
            break

          case 'dni':
            cell.value  = p.dni
            cell.font   = { name: 'Courier New', size: 9, color: { argb: C.monoColor } }
            cell.numFmt = '@'
            break

          case 'phone':
            cell.value  = p.phone
            cell.font   = { name: 'Courier New', size: 9, color: { argb: C.monoColor } }
            cell.numFmt = '@'
            break

          case 'profession': {
            const prof = p.profession.join(', ')
            cell.value = prof || '—'
            cell.font  = { name: 'Calibri', size: 9, color: { argb: prof ? C.nameColor : C.mutedColor }, italic: !prof }
            break
          }

          case 'cvUrl':
            if (hasCv) {
              cell.value  = { text: 'Ver CV  →', hyperlink: p.cvUrl! }
              cell.font   = { name: 'Calibri', bold: true, size: 9, color: { argb: C.cvText }, underline: true }
              cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.cvBg } }
              cell.border = borderFull(C.cvBg, 'hair')
            } else {
              cell.value = 'Sin CV'
              cell.font  = { name: 'Calibri', size: 9, color: { argb: C.noCvText }, italic: true }
              cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.noCvBg } }
            }
            break

          case 'hasDemand':
            if (p.hasDemand) {
              cell.value  = 'Con demanda'
              cell.font   = { name: 'Calibri', bold: true, size: 9, color: { argb: C.demandaText } }
              cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.demandaBg } }
              cell.border = borderFull(C.demandaBg, 'hair')
            } else {
              cell.value  = 'Sin demanda'
              cell.font   = { name: 'Calibri', size: 9, color: { argb: C.sinDemText } }
              cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sinDemBg } }
              cell.border = borderFull(C.sinDemBg, 'hair')
            }
            break

          case 'detallePerfil':
            cell.value  = detalle
            cell.font   = { name: 'Calibri', size: 9, color: { argb: C.mutedColor }, italic: hasDetalle }
            cell.border = { ...cell.border, right: { style: 'thin', color: { argb: C.borderMain } } }
            break
        }
      })
    })

    // ── Footer ────────────────────────────────────────────────────────────────
    const sepIdx = ws.rowCount + 1
    ws.mergeCells(sepIdx, 1, sepIdx, N)
    ws.getRow(sepIdx).height = 4
    ws.getCell(sepIdx, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.accentStrip } }

    const fIdx = sepIdx + 1
    ws.mergeCells(fIdx, 1, fIdx, N)
    ws.getRow(fIdx).height = 20
    const fc = ws.getCell(fIdx, 1)
    fc.value     = `Total: ${total} registro${total !== 1 ? 's' : ''}   ·   CuadernoLaboral — Exportación oficial`
    fc.font      = { name: 'Calibri', size: 9, bold: true, color: { argb: C.footerText } }
    fc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.footerBg } }
    fc.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
    fc.border    = borderBottom(C.subtitleBg, 'medium')

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
