/* eslint-disable react-hooks/refs -- react-hook-form handleSubmit contains internal ref access not memoizable by React Compiler */
'use client'

import { useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { Briefcase, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { gsap, useGSAP, ANIM } from '@/lib/gsap.config'
import { loginAction } from '@/app/actions/auth.actions'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
  username: z.string().min(1, 'Usuario requerido').max(50),
  password: z.string().min(1, 'Contraseña requerida').max(100),
})

type LoginValues = z.infer<typeof schema>

export function LoginForm() {
  const container    = useRef<HTMLDivElement>(null)
  const cardRef      = useRef<HTMLDivElement>(null)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [showPass, setShowPass]       = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginValues, unknown, LoginValues>({
    resolver:      zodResolver(schema) as Resolver<LoginValues, unknown, LoginValues>,
    defaultValues: { username: '', password: '' },
  })

  // ── Animación de entrada ─────────────────────────────────────────────────────
  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (prefersReduced) return

      gsap.fromTo(
        cardRef.current,
        { y: 24, opacity: 0, scale: 0.97 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: ANIM.duration.normal,
          ease:     ANIM.ease.smooth,
        },
      )

      gsap.fromTo(
        '.login-field',
        { y: 12, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: ANIM.duration.fast,
          stagger:  ANIM.stagger.list,
          ease:     ANIM.ease.enter,
          delay:    0.2,
        },
      )
    },
    { scope: container },
  )

  // ── Shake en error ───────────────────────────────────────────────────────────
  function shakeCard() {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReduced) return

    gsap.fromTo(
      cardRef.current,
      { x: -8 },
      { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' },
    )
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function onSubmit(data: LoginValues) {
    setServerError(null)

    const result = await loginAction(data)

    if (!result.success) {
      setServerError(result.error)
      shakeCard()
      return
    }

    toast.success('Sesión iniciada correctamente')

    const from = searchParams.get('from') ?? '/'
    // Validate: only allow relative paths (prevent open redirect)
    const safePath =
      from.startsWith('/') && !from.startsWith('//') ? from : '/'

    router.push(safePath)
    router.refresh()
  }

  return (
    <div ref={container} className="w-full max-w-sm">
      <div
        ref={cardRef}
        className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-8 space-y-6"
      >
        {/* Logo + título */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Login
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cuadro Laboral
            </p>
          </div>
        </div>

        {/* Formulario */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Usuario */}
            <div className="login-field">
              <FormField
                name="username"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="username"
                        placeholder="Ingrese su usuario"
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPass ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="pr-10"
                          aria-required="true"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showPass
                            ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                            : <Eye    className="w-4 h-4" aria-hidden="true" />
                          }
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Error del servidor */}
            {serverError !== null && (
              <p
                role="alert"
                aria-live="assertive"
                className="text-sm text-destructive text-center bg-destructive/5 rounded-lg py-2 px-3"
              >
                {serverError}
              </p>
            )}

            {/* Submit */}
            <div className="login-field">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Verificando...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
