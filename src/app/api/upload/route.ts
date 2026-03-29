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

    // PDFs must be 'raw'; photos are 'image'. 'auto' can assign 'raw' to PDFs
    // but may result in 401 on delivery — be explicit per folder.
    const resourceType = folder === 'cvs' ? 'raw' : 'image'

    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:          `cuadernolaboral/${folder}`,
          resource_type:   resourceType,
          access_mode:     'public',
          use_filename:    true,
          unique_filename: true,
        },
        (error, res) => {
          if (error || !res) reject(error ?? new Error('Sin respuesta de Cloudinary'))
          else resolve(res as CloudinaryResult)
        }
      )
      stream.end(buffer)
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
