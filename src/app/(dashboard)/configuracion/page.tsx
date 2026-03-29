import { Settings } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { initCoreFieldsAction } from '@/app/actions/form-config.actions'
import { FieldList } from '@/components/configuracion/FieldList'

export const metadata = {
  title: 'Configuración — CuadernoLaboral',
}

export default async function ConfiguracionPage() {
  await requireAdmin()

  // Siembra campos base la primera vez (idempotente)
  await initCoreFieldsAction()

  // Carga TODOS los campos: core + personalizados
  const fields = await prisma.formFieldConfig.findMany({
    orderBy: { order: 'asc' },
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
          <Settings className="w-[18px] h-[18px]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Campos del formulario
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reordena, activa y configura si cada campo es obligatorio o no
          </p>
        </div>
      </div>

      <FieldList initialFields={fields} />
    </div>
  )
}
