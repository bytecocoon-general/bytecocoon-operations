import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import RegistrationRequestsManager from '@/components/admin/RegistrationRequestsManager'

export default async function RegistrationsPage() {
  if (!await requireAdmin()) redirect('/dashboard')
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Registos e convites</h1><p className="mt-1 text-sm text-muted-foreground">Convide utilizadores e decida os pedidos de acesso.</p></div>
      <RegistrationRequestsManager />
    </div>
  )
}
