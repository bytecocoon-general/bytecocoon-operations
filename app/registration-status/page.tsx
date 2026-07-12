import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export default async function RegistrationStatusPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (employee?.accessStatus === 'APPROVED') redirect('/dashboard')

  const rejected = employee?.accessStatus === 'REJECTED'
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-lg rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">{rejected ? 'Registo não aprovado' : 'Registo a aguardar aprovação'}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {rejected
            ? 'O seu pedido de acesso foi rejeitado. Contacte um administrador se considerar que existe um erro.'
            : 'A sua conta foi criada, mas ainda não tem acesso à aplicação. Um administrador precisa de aprovar o pedido.'}
        </p>
      </div>
    </main>
  )
}
