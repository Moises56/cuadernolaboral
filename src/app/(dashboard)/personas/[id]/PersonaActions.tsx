'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2, MapPin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { deletePersonaAction } from '@/app/actions/persona.actions'
import { AssignPlazaDialog } from '@/components/personas/AssignPlazaDialog'
import type { AssignPlazaPerson } from '@/components/personas/AssignPlazaDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface PersonaActionsProps {
  person:   AssignPlazaPerson
  hasPlaza: boolean
}

export function PersonaActions({ person, hasPlaza }: PersonaActionsProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [plazaOpen, setPlazaOpen]   = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deletePersonaAction(person.id)
    setDeleting(false)

    if (!result.success) {
      toast.error(result.error ?? 'Error al eliminar el registro')
      setDeleteOpen(false)
      return
    }

    toast.success('Registro eliminado correctamente')
    router.push('/personas')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/personas/${person.id}/editar`} />}
        >
          <Pencil className="size-3.5" />
          Editar
        </Button>

        <Button variant="outline" size="sm" onClick={() => setPlazaOpen(true)}>
          <MapPin className="size-3.5" />
          {hasPlaza ? 'Cambiar plaza' : 'Asignar plaza'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Eliminar
        </Button>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar registro?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará permanentemente el registro de{' '}
            <strong className="text-foreground">{person.fullName}</strong>.{' '}
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign plaza */}
      <AssignPlazaDialog
        person={person}
        open={plazaOpen}
        onOpenChange={setPlazaOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
