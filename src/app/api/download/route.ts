import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOST = 'res.cloudinary.com'

export async function GET(request: NextRequest) {
  const url      = request.nextUrl.searchParams.get('url')
  const rawName  = request.nextUrl.searchParams.get('name') || 'documento'

  if (!url) {
    return new NextResponse('Parámetro url requerido', { status: 400 })
  }

  // Only proxy Cloudinary URLs
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('URL inválida', { status: 400 })
  }
  if (parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse('Origen no permitido', { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(url)
  } catch {
    return new NextResponse('No se pudo obtener el archivo', { status: 502 })
  }

  if (!upstream.ok) {
    return new NextResponse('Archivo no disponible', { status: upstream.status })
  }

  const contentType = upstream.headers.get('content-type') || 'application/pdf'

  // Sanitize name: remove accents, keep letters/numbers/spaces, replace spaces with underscores
  const ascii = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-zA-Z0-9\s-]/g, '')  // keep safe chars
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 100)

  const ext      = contentType.includes('pdf') ? 'pdf' : 'bin'
  const filename = `${ascii}.${ext}`

  const body = await upstream.arrayBuffer()

  return new NextResponse(body, {
    headers: {
      'Content-Type':        contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'private, no-store',
    },
  })
}
