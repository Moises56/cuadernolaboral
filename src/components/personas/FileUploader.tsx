'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, FileCheck2, AlertCircle, RefreshCw, FileText, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { gsap, ANIM } from '@/lib/gsap.config'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface FileUploaderProps {
  accept:      string
  folder:      'cvs' | 'fotos'
  label:       string
  onUpload:    (url: string, publicId: string) => void
  currentUrl?: string | undefined
  maxSizeMB?:  number
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error'

interface UploadResult {
  url:      string
  publicId: string
  fileName: string
}

// ─── XHR upload with progress ──────────────────────────────────────────────
function uploadWithProgress(
  formData: FormData,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.timeout = 30_000

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as unknown
        const obj = data as Record<string, unknown>
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as UploadResult)
        } else {
          reject(new Error((obj['error'] as string | undefined) ?? 'Error al subir'))
        }
      } catch {
        reject(new Error('Respuesta inválida del servidor'))
      }
    }

    xhr.onerror   = () => reject(new Error('Error de red. Verifique su conexión.'))
    xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado. Intente nuevamente.'))

    signal.addEventListener('abort', () => {
      xhr.abort()
      reject(new Error('Carga cancelada'))
    })

    xhr.send(formData)
  })
}

// ─── Component ──────────────────────────────────────────────────────────────
export function FileUploader({
  accept,
  folder,
  label,
  onUpload,
  currentUrl,
  maxSizeMB = 10,
}: FileUploaderProps) {
  const [state,    setState]    = useState<UploadState>(currentUrl ? 'success' : 'idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview,  setPreview]  = useState<string | null>(currentUrl ?? null)

  const dropZoneRef    = useRef<HTMLDivElement>(null)
  const draggingTween  = useRef<gsap.core.Tween | null>(null)
  const abortCtrlRef   = useRef<AbortController | null>(null)

  // Cleanup tween & abort on unmount
  useEffect(() => {
    return () => {
      draggingTween.current?.kill()
      abortCtrlRef.current?.abort()
    }
  }, [])

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const isImage = folder === 'fotos'

  const processFile = useCallback(async (file: File) => {
    setErrorMsg(null)
    setFileName(file.name)

    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      setState('error')
      setErrorMsg(`El archivo excede ${maxSizeMB} MB`)
      return
    }

    if (isImage && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    setState('uploading')
    setProgress(0)

    const ctrl = new AbortController()
    abortCtrlRef.current = ctrl

    const fd = new FormData()
    fd.append('file',   file)
    fd.append('folder', folder)

    try {
      const result = await uploadWithProgress(fd, setProgress, ctrl.signal)
      setState('success')
      setProgress(100)
      setFileName(result.fileName)
      if (result.url) setPreview(result.url)
      onUpload(result.url, result.publicId)

      // Success animation
      if (dropZoneRef.current) {
        gsap.fromTo(
          dropZoneRef.current,
          { scale: 0.98, opacity: 0.7 },
          { scale: 1, opacity: 1, duration: ANIM.duration.fast, ease: ANIM.ease.enter }
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      if (msg === 'Carga cancelada') return
      setState('error')
      setErrorMsg(msg)
      toast.error('Error al subir archivo', { description: msg })

      if (dropZoneRef.current) {
        gsap.fromTo(
          dropZoneRef.current,
          { x: -6 },
          { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }
        )
      }
    }
  }, [folder, isImage, maxSizeMB, onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    draggingTween.current?.kill()
    setState('idle')

    const file = e.dataTransfer.files[0]
    if (!file) return

    // Drop confirmation animation
    if (dropZoneRef.current) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!prefersReduced) {
        gsap.fromTo(
          dropZoneRef.current,
          { scale: 0.96 },
          { scale: 1, duration: ANIM.duration.fast, ease: ANIM.ease.spring }
        )
      }
    }

    void processFile(file)
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (state !== 'dragging') {
      setState('dragging')
      if (dropZoneRef.current) {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReduced) {
          draggingTween.current?.kill()
          draggingTween.current = gsap.to(dropZoneRef.current, {
            scale:    1.02,
            duration: 0.5,
            yoyo:     true,
            repeat:   -1,
            ease:     'power2.inOut',
          })
        }
      }
    }
  }, [state])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      draggingTween.current?.kill()
      gsap.to(dropZoneRef.current, { scale: 1, duration: 0.25 })
      setState('idle')
    }
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }, [processFile])

  const handleRetry = useCallback(() => {
    setState('idle')
    setErrorMsg(null)
    setFileName(null)
    setPreview(currentUrl ?? null)
    setProgress(0)
  }, [currentUrl])

  const inputId = React.useId()

  // ─── Render states ────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-1.5">
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex min-h-[120px] flex-col items-center justify-center gap-2',
          'rounded-lg border-2 border-dashed transition-colors',
          'cursor-pointer text-sm select-none',
          state === 'idle'      && 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50',
          state === 'dragging'  && 'border-accent bg-accent/5',
          state === 'uploading' && 'border-primary/40 bg-primary/3 cursor-not-allowed',
          state === 'success'   && 'border-primary/30 bg-primary/3',
          state === 'error'     && 'border-destructive/50 bg-destructive/3',
        )}
      >
        <label htmlFor={inputId} className={cn(
          'absolute inset-0 cursor-pointer',
          (state === 'uploading' || state === 'success') && 'pointer-events-none'
        )} />

        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={state === 'uploading'}
          className="sr-only"
        />

        {/* ── Idle ── */}
        {state === 'idle' && (
          <>
            <Upload className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Arrastre aquí o haga clic · Máx. {maxSizeMB} MB
              </p>
            </div>
          </>
        )}

        {/* ── Dragging ── */}
        {state === 'dragging' && (
          <>
            <Upload className="size-8 text-accent" strokeWidth={2} />
            <p className="text-sm font-semibold text-accent">Suelte para subir</p>
          </>
        )}

        {/* ── Uploading ── */}
        {state === 'uploading' && (
          <div className="w-full space-y-3 px-6 py-2">
            <div className="flex items-center gap-2 text-primary">
              <RefreshCw className="size-4 animate-spin" />
              <span className="text-sm font-medium">Subiendo {fileName ?? 'archivo'}…</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
          </div>
        )}

        {/* ── Success ── */}
        {state === 'success' && (
          <div className="flex items-center gap-3 px-4">
            {isImage && preview ? (
              <Image
                src={preview}
                alt="Vista previa"
                width={56}
                height={56}
                unoptimized
                className="rounded-md object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                {folder === 'cvs'
                  ? <FileText className="size-6 text-primary" />
                  : <ImageIcon className="size-6 text-primary" />
                }
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <FileCheck2 className="size-4 text-primary flex-shrink-0" />
                <p className="text-sm font-medium text-primary truncate">
                  {fileName ?? 'Archivo subido'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRetry() }}
                className="mt-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Cambiar archivo
              </button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <AlertCircle className="size-8 text-destructive" strokeWidth={1.5} />
            <p className="text-sm font-medium text-destructive">{errorMsg ?? 'Error al subir'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleRetry() }}
              className="gap-1.5 h-7 text-xs"
            >
              <RefreshCw className="size-3" />
              Reintentar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
