import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  api_key:    process.env.CLOUDINARY_API_KEY ?? '',
  api_secret: process.env.CLOUDINARY_API_SECRET ?? '',
})

interface CloudinaryResult {
  secure_url:        string
  public_id:         string
  original_filename: string
  bytes:             number
  format:            string
}

const ALLOWED_FOLDERS = new Set(['cvs', 'fotos'])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file   = formData.get('file') as File | null
    const folder = (formData.get('folder') as string | null) ?? 'general'

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Carpeta no permitida' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de 10 MB` },
        { status: 413 }
      )
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // PDFs must be 'raw'; photos are 'image'.
    const resourceType = folder === 'cvs' ? 'raw' : 'image'

    // For raw uploads (CVs), Cloudinary only serves the correct Content-Type
    // (application/pdf) when the public_id includes the file extension.
    // Without it, it serves application/octet-stream → browser can't open.
    const buildUploadOptions = () => {
      if (resourceType === 'raw') {
        const originalName = file.name || 'file'
        const extMatch = originalName.match(/\.([^.]+)$/)
        const ext = extMatch?.[1]?.toLowerCase() ?? 'pdf'
        const base = originalName
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9-]/g, '_')
          .toLowerCase()
          .slice(0, 50)
        const uid = Date.now().toString(36)
        return {
          public_id:     `cuadernolaboral/${folder}/${base}_${uid}.${ext}`,
          resource_type: 'raw' as const,
        }
      }
      return {
        folder:          `cuadernolaboral/${folder}`,
        resource_type:   'image' as const,
        use_filename:    true,
        unique_filename: true,
      }
    }

    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        buildUploadOptions(),
        (error, res) => {
          if (error || !res) reject(error ?? new Error('Sin respuesta de Cloudinary'))
          else resolve(res as CloudinaryResult)
        }
      )
      stream.end(buffer)
    })

    console.log('[upload] resultado Cloudinary:', {
      public_id:  result.public_id,
      secure_url: result.secure_url,
      format:     result.format,
      bytes:      result.bytes,
    })

    return NextResponse.json({
      url:      result.secure_url,
      publicId: result.public_id,
      fileName: result.original_filename,
    })
  } catch (error) {
    console.error('[upload/route]', error)
    return NextResponse.json(
      { error: 'Error al subir el archivo. Intente nuevamente.' },
      { status: 500 }
    )
  }
}
