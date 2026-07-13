'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, MailPlus, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormMessage } from '@/components/ui/form-message'

type Invite = { id: string; email: string; registeredEmail: string | null; validationIssue: string | null; employeeId: string | null; status: string; expiresAt: string; createdAt: string }
type Request = { id: string; name: string; email: string; accessStatus: string; createdAt: string; accessReviewedAt: string | null }

const labels: Record<string, string> = {
  PENDING: 'Pendente', REGISTERED: 'Registado', APPROVED: 'Aprovado', REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado', FAILED: 'Falhou',
  RENEWED: 'Renovado', EMAIL_MISMATCH: 'Email diferente',
}

export default function RegistrationRequestsManager() {
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState<Invite[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/registration-requests')
    const data = await res.json()
    if (res.ok) { setInvites(data.invites); setRequests(data.requests) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function invite(inviteEmail = email, renew = false) {
    setBusy(true); setMessage(null)
    const res = await fetch('/api/admin/registration-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, renew }),
    })
    const data = await res.json()
    if (res.ok) { setEmail(''); setMessage({ type: 'success', text: renew ? 'Convite renovado. O novo link é válido durante uma hora.' : 'Convite enviado. É válido durante uma hora.' }); await load() }
    else setMessage({ type: 'error', text: data.error ?? 'Não foi possível enviar o convite.' })
    setBusy(false)
  }

  async function decide(id: string, action: 'APPROVE' | 'REJECT') {
    setBusy(true); setMessage(null)
    const res = await fetch(`/api/admin/registration-requests/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    if (res.ok) { setMessage({ type: 'success', text: action === 'APPROVE' ? 'Acesso aprovado.' : 'Pedido rejeitado.' }); await load() }
    else setMessage({ type: 'error', text: 'Não foi possível atualizar o pedido.' })
    setBusy(false)
  }

  const pending = requests.filter(r => r.accessStatus === 'PENDING')
  const inviteForEmployee = (employeeId: string) => invites.find(i => i.employeeId === employeeId)
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Enviar convite</h2>
        <p className="mt-1 text-sm text-muted-foreground">O link é enviado pelo Clerk e expira na aplicação ao fim de uma hora.</p>
        <div className="mt-4 flex gap-2">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colaborador@empresa.pt" />
          <Button onClick={() => invite()} disabled={busy || !email}><MailPlus size={15} /> Convidar</Button>
        </div>
        {message && <div className="mt-3"><FormMessage type={message.type}>{message.text}</FormMessage></div>}
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Pedidos por aprovar ({pending.length})</h2></div>
        {pending.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Não existem pedidos pendentes.</p> : pending.map(r => (
          <div key={r.id} className="flex items-center justify-between border-b border-border px-5 py-4 last:border-0">
            <div>
              <p className="font-medium">{r.name}</p><p className="text-sm text-muted-foreground">{r.email}</p>
              {inviteForEmployee(r.id)?.validationIssue && <p className="mt-1 flex items-center gap-1 text-sm text-amber-600"><TriangleAlert size={14} /> {inviteForEmployee(r.id)?.validationIssue} Convidado: {inviteForEmployee(r.id)?.email}</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => decide(r.id, 'APPROVE')} disabled={busy}><Check size={14} /> Aprovar</Button>
              <Button variant="outline" onClick={() => decide(r.id, 'REJECT')} disabled={busy}><X size={14} /> Rejeitar</Button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Histórico</h2></div>
        {loading ? <p className="p-6 text-sm text-muted-foreground">A carregar…</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-5 py-3">Email</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Conta criada</th><th className="px-5 py-3">Data</th><th className="px-5 py-3">Ação</th>
          </tr></thead><tbody>
            {requests.map(r => <tr key={`r-${r.id}`} className="border-b border-border"><td className="px-5 py-3">{r.email}</td><td className="px-5 py-3">Registo</td><td className="px-5 py-3">{labels[r.accessStatus] ?? r.accessStatus}</td><td className="px-5 py-3">Sim</td><td className="px-5 py-3">{new Date(r.createdAt).toLocaleString('pt-PT')}</td><td className="px-5 py-3">—</td></tr>)}
            {invites.map(i => <tr key={`i-${i.id}`} className="border-b border-border"><td className="px-5 py-3"><span>{i.email}</span>{i.registeredEmail && i.registeredEmail !== i.email && <span className="block text-xs text-amber-600">Registado: {i.registeredEmail}</span>}</td><td className="px-5 py-3">Convite</td><td className="px-5 py-3">{labels[i.status] ?? i.status}</td><td className="px-5 py-3">{i.employeeId ? 'Sim' : 'Não'}</td><td className="px-5 py-3">{new Date(i.createdAt).toLocaleString('pt-PT')}</td><td className="px-5 py-3">{(['EXPIRED', 'FAILED', 'RENEWED', 'EMAIL_MISMATCH'].includes(i.status)) ? <Button size="sm" variant="outline" onClick={() => invite(i.email, true)} disabled={busy}><RefreshCw size={13} /> Renovar</Button> : '—'}</td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </div>
  )
}
