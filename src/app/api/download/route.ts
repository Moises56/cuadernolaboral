import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  api_key:    process.env.CLOUDINARY_API_KEY ?? '',
  api_secret: process.env.CLOUDINARY_API_SECRET ?? '',
})

const ALLOWED_HOST = 'res.cloudinary.com'

// Extract public_id from Cloudinary URL.
// e.g. https://res.cloudinary.com/{cloud}/raw/upload/v123/{public_id}
function extractPublicId(url: string): string | null {
  try {
    const { pathname } = new URL(url)
    const match = pathname.match(/\/(?:raw|image|video)\/upload\/(?:v\d+\/)?(.+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function getResourceType(url: string): 'raw' | 'image' | 'video' {
  if (url.includes('/raw/'))   return 'raw'
  if (url.includes('/video/')) return 'video'
  return 'image'
}

function sanitizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

export async function GET(request: NextRequest) {
  const url     = request.nextUrl.searchParams.get('url')
  const rawName = request.nextUrl.searchParams.get('name') || 'documento'
  const inline  = request.nextUrl.searchParams.get('inline') === '1'

  if (!url) {
    return new NextResponse('Parámetro url requerido', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('URL inválida', { status: 400 })
  }
  if (parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse('Origen no permitido', { status: 403 })
  }

  const publicId     = extractPublicId(url)
  const resourceType = getResourceType(url)

  // For raw files (PDFs): use private_download_url which routes through
  // api.cloudinary.com with API credentials — bypasses CDN delivery
  // restrictions ("Blocked for delivery", "untrusted customer", etc.)
  let fetchUrl: string
  if (resourceType === 'raw' && publicId) {
    // private_download_url signs the request with api_key + api_secret.
    // Pass empty format string because public_id already includes the extension.
    fetchUrl = cloudinary.utils.private_download_url(publicId, '', {
      resource_type: 'raw',
      type:          'upload',
    })
  } else {
    // For images use signed CDN URL
    fetchUrl = publicId
      ? cloudinary.url(publicId, {
          resource_type: resourceType,
          type:          'upload',
          sign_url:      true,
          secure:        true,
        })
      : url
  }

  let upstream: Response
  try {
    upstream = await fetch(fetchUrl)
  } catch {
    return new NextResponse('No se pudo obtener el archivo', { status: 502 })
  }

  if (!upstream.ok) {
    console.error('[download] upstream failed', upstream.status, upstream.statusText, fetchUrl)
    return new NextResponse('Archivo no disponible', { status: upstream.status })
  }

  const contentType = upstream.headers.get('content-type') || 'application/pdf'
  const ascii       = sanitizeName(rawName)
  const ext         = contentType.includes('pdf') ? 'pdf' : 'bin'
  const filename    = `${ascii}.${ext}`
  const disposition = inline
    ? `inline; filename="${filename}"`
    : `attachment; filename="${filename}"`

  const body = await upstream.arrayBuffer()

  return new NextResponse(body, {
    headers: {
      'Content-Type':        contentType,
      'Content-Disposition': disposition,
      'Cache-Control':       'private, no-store',
    },
  })
}
