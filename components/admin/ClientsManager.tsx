'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Check, X, Building2 } from 'lucide-react'
import { Button }        from '@/components/ui/button'
import { Input }         from '@/components/ui/input'
import { SelectNative }  from '@/components/ui/select-native'
import { Label }         from '@/components/ui/label'
import { FormMessage }   from '@/components/ui/form-message'

interface Client {
  id: string; name: string; email: string | null; phone: string | null
  address: string | null; vatNumber: string | null; country: string | null
  isActive: boolean; _count: { projects: number; invoices: number }
}

const emptyForm = { name: '', email: '', phone: '', address: '', vatNumber: '', country: 'Portugal', isActive: true }

export default function ClientsManager() {
  const [clients,  setClients]  = useState<Client[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<Client | null>(null)
  const [creating, setCreating] = useState(false)
  const [form,     setForm]     = useState(emptyForm)
  const [saving,   setSaving]   = useState(false)
  const [message,  setMessage]  = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 3000)
  }

  useEffect(() => {
    fetch('/api/admin/clients').then(r => r.json()).then(data => { setClients(data); setLoading(false) })
  }, [])

  function startCreate() { setEditing(null); setForm(emptyForm); setCreating(true) }
  function startEdit(c: Client) {
    setCreating(false); setEditing(c)
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', vatNumber: c.vatNumber ?? '', country: c.country ?? 'Portugal', isActive: c.isActive })
  }
  function cancel() { setEditing(null); setCreating(false) }

  async function handleSubmit() {
    setSaving(true)
    try {
      const payload = { ...form, email: form.email || null, phone: form.phone || null, address: form.address || null, vatNumber: form.vatNumber || null, country: form.country || null, ...(editing ? { id: editing.id } : {}) }
      const res = await fetch('/api/admin/clients', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      if (editing) setClients(prev => prev.map(c => c.id === saved.id ? { ...saved, _count: c._count } : c))
      else setClients(prev => [...prev, { ...saved, _count: { projects: 0, invoices: 0 } }])
      cancel(); showMsg('success', editing ? 'Cliente actualizado!' : 'Cliente criado!')
    } catch { showMsg('error', 'Erro ao guardar.') } finally { setSaving(false) }
  }

  const f = (k: keyof typeof emptyForm, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{clients.filter(c => c.isActive).length} cliente(s) activo(s)</p>
        <Button onClick={startCreate}><Plus size={15} /> Novo Cliente</Button>
      </div>

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {creating && (
        <div className="bg-secondary/30 border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Novo Cliente</h3>
          <ClientForm form={form} onChange={f} onSubmit={handleSubmit} onCancel={cancel} saving={saving} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">A carregar...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {['Nome','Email','NIF','País','Projectos','Faturas',''].map((h, i) => (
                  <th key={i} className={`${[4,5].includes(i) ? 'text-center' : i === 0 || i === 6 ? 'text-left px-5' : 'text-left'} px-3 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map(client => (
                <>
                  <tr key={client.id} className={`hover:bg-secondary/30 transition-colors ${!client.isActive ? 'opacity-40' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-zinc-600 shrink-0" />
                        <span className="font-medium text-zinc-200">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{client.email ?? '—'}</td>
                    <td className="px-3 py-3 text-zinc-400">{client.vatNumber ?? '—'}</td>
                    <td className="px-3 py-3 text-zinc-400">{client.country ?? '—'}</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{client._count.projects}</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{client._count.invoices}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(client)}>
                        <Pencil size={14} />
                      </Button>
                    </td>
                  </tr>
                  {editing?.id === client.id && (
                    <tr key={`edit-${client.id}`} className="bg-secondary/30">
                      <td colSpan={7} className="px-5 py-4">
                        <ClientForm form={form} onChange={f} onSubmit={handleSubmit} onCancel={cancel} saving={saving} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">Sem clientes registados.</div>}
        </div>
      )}
    </div>
  )
}

function ClientForm({ form, onChange, onSubmit, onCancel, saving }: {
  form: typeof emptyForm; onChange: (k: keyof typeof emptyForm, v: string | boolean) => void
  onSubmit: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {([['name','Nome *','Empresa Lda.','text'],['email','Email','geral@empresa.pt','email'],['phone','Telefone','+351 210 000 000','text'],['vatNumber','NIF','500000000','text'],['country','País','Portugal','text']] as [keyof typeof form, string, string, string][]).map(([k, lbl, ph, type]) => (
          <div key={k}>
            <Label>{lbl}</Label>
            <Input type={type} className="mt-1" value={form[k] as string} onChange={e => onChange(k, e.target.value)} placeholder={ph} />
          </div>
        ))}
        <div>
          <Label>Activo</Label>
          <SelectNative className="mt-1" value={form.isActive ? 'true' : 'false'} onChange={e => onChange('isActive', e.target.value === 'true')}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </SelectNative>
        </div>
      </div>
      <div className="mb-3">
        <Label>Morada</Label>
        <Input className="mt-1" value={form.address} onChange={e => onChange('address', e.target.value)} placeholder="Rua, Número, Código Postal, Localidade" />
      </div>
      <div className="flex gap-2">
        <Button disabled={saving} onClick={onSubmit}><Check size={14} /> {saving ? 'A guardar...' : 'Guardar'}</Button>
        <Button variant="outline" onClick={onCancel}><X size={14} /> Cancelar</Button>
      </div>
    </>
  )
}
