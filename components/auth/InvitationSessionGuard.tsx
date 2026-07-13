'use client'

import { useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'

export default function InvitationSessionGuard({ invitedEmail }: { invitedEmail: string }) {
  const { signOut } = useClerk()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function continueRegistration() {
    setBusy(true)
    setFailed(false)

    try {
      const invitationUrl = window.location.href
      await signOut(() => window.location.assign(invitationUrl))
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Existe uma sessão ativa</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Para criar a conta de <strong>{invitedEmail}</strong>, é necessário terminar primeiro a sessão da conta atualmente aberta.
        </p>
        <Button className="mt-6" onClick={continueRegistration} disabled={busy}>
          <LogOut size={15} /> {busy ? 'A terminar sessão…' : 'Terminar sessão e continuar o registo'}
        </Button>
        {failed && <div className="mt-4"><FormMessage type="error">Não foi possível terminar a sessão. Atualize a página e tente novamente.</FormMessage></div>}
      </div>
    </main>
  )
}
