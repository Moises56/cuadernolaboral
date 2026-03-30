import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  api_key:    process.env.CLOUDINARY_API_KEY ?? '',
  api_secret: process.env.CLOUDINARY_API_SECRET ?? '',
})

const ALLOWED_FOLDERS = new Set(['cvs', 'fotos'])

/**
 * Generates a Cloudinary signature for direct client-side upload.
 * This avoids Vercel's 4.5 MB body limit on serverless functions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const folder       = body.folder as string | undefined
    const fileName     = body.fileName as string | undefined
    const resourceType = body.resourceType as string | undefined

    if (!folder || !ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Carpeta no permitida' }, { status: 400 })
    }

    const timestamp = Math.round(Date.now() / 1000)

    // Build the params that Cloudinary will sign
    const params: Record<string, string | number | boolean> = {
      timestamp,
    }

    if (resourceType === 'raw' && fileName) {
      // For CVs: include extension in public_id so Cloudinary serves correct Content-Type
      const extMatch = fileName.match(/\.([^.]+)$/)
      const ext = extMatch?.[1]?.toLowerCase() ?? 'pdf'
      const base = fileName
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-]/g, '_')
        .toLowerCase()
        .slice(0, 50)
      const uid = Date.now().toString(36)
      params.public_id = `cuadernolaboral/${folder}/${base}_${uid}.${ext}`
    } else {
      params.folder = `cuadernolaboral/${folder}`
      params.use_filename = true
      params.unique_filename = true
    }

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET ?? ''
    )

    return NextResponse.json({
      signature,
      timestamp,
      apiKey:    process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      params,
    })
  } catch (error) {
    console.error('[upload/sign]', error)
    return NextResponse.json(
      { error: 'Error al generar firma de upload' },
      { status: 500 }
    )
  }
}
