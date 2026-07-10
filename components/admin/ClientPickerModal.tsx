'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, ArrowLeft, Check, X, AlertCircle, Building2 } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import { FormMessage } from '@/components/ui/form-message'

export interface PickedClient {
  id:   string
  name: string
}

interface Client {
  id:        string
  name:      string
  email:     string | null
  phone:     string | null
  vatNumber: string | null
  country:   string | null
  isActive:  boolean
}

interface Props {
  onSelect: (client: PickedClient) => void
  onClose:  () => void
}

const emptyForm = { name: '', email: '', phone: '', address: '', vatNumber: '', country: 'Portugal' }

export default function ClientPickerModal({ onSelect, onClose }: Props) {
  const [mode,    setMode]    = useState<'pick' | 'create'>('pick')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [form,    setForm]    = useState(emptyForm)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => r.json())
      .then((data: Client[]) => { setClients(data.filter(c => c.isActive)); setLoading(false) })
  }, [])

  useEffect(() => {
    if (mode === 'pick') searchRef.current?.focus()
  }, [mode])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email     ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.vatNumber ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function validateForm() {
    if (!form.name.trim()) return 'O nome do cliente é obrigatório.'
    if (!form.email.trim() && !form.phone.trim() && !form.address.trim()) {
      return 'Indique pelo menos um meio de contacto: email, telefone ou morada.'
    }
    return null
  }

  async function handleCreate() {
    const err = validateForm()
    if (err) { setError(err); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, address: form.address.trim() || null, vatNumber: form.vatNumber.trim() || null, country: form.country.trim() || null, isActive: true }),
      })
      if (!res.ok) { const data = await res.json(); setError(data.error ?? 'Erro ao criar cliente.'); return }
      const created: Client = await res.json()
      setClients(prev => [...prev, created])
      onSelect({ id: created.id, name: created.name })
    } catch {
      setError('Erro ao criar cliente.')
    } finally {
      setSaving(false)
    }
  }

  function switchToCreate() { setForm({ ...emptyForm, name: search }); setError(null); setMode('create') }

  const f = (k: keyof typeof emptyForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          {mode === 'create' ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setMode('pick'); setError(null) }}>
                <ArrowLeft size={18} />
              </Button>
              <h2 className="text-base font-semibold text-zinc-100">Novo Cliente</h2>
            </div>
          ) : (
            <h2 className="text-base font-semibold text-zinc-100">Seleccionar Cliente</h2>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* Modo: Pick */}
        {mode === 'pick' && (
          <>
            <div className="px-6 py-3 border-b border-border">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar por nome, email ou NIF…"
                  className="pl-9 pr-4"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="py-12 text-center text-sm text-zinc-600">A carregar…</div>
              ) : filtered.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-secondary/30 sticky top-0">
                    <tr>
                      <th className="text-left px-6 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wide">Nome</th>
                      <th className="text-left px-3 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wide">Email</th>
                      <th className="text-left px-3 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wide">Telefone</th>
                      <th className="text-left px-3 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wide">NIF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(c => (
                      <tr key={c.id}
                        onClick={() => onSelect({ id: c.id, name: c.name })}
                        className="hover:bg-violet-600/10 cursor-pointer transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-zinc-600 shrink-0" />
                            <span className="font-medium text-zinc-200">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-zinc-500">{c.email ?? '—'}</td>
                        <td className="px-3 py-3 text-zinc-500">{c.phone ?? '—'}</td>
                        <td className="px-3 py-3 text-zinc-500">{c.vatNumber ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-zinc-500 mb-3">
                    {search ? <>Nenhum cliente encontrado para &quot;{search}&quot;.</> : 'Sem clientes registados.'}
                  </p>
                  <Button onClick={switchToCreate}>
                    <Plus size={14} /> Criar &quot;{search || 'novo cliente'}&quot;
                  </Button>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-border flex justify-between items-center bg-secondary/20">
              <span className="text-xs text-zinc-600">{filtered.length} cliente(s)</span>
              <Button variant="ghost" size="sm" onClick={switchToCreate} className="text-primary hover:text-primary/80">
                <Plus size={14} /> Novo Cliente
              </Button>
            </div>
          </>
        )}

        {/* Modo: Create */}
        {mode === 'create' && (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {error && (
              <FormMessage type="error" className="flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </FormMessage>
            )}

            <div>
              <Label>Nome *</Label>
              <Input className="mt-1" value={form.name} onChange={e => f('name', e.target.value)} autoFocus placeholder="Nome da empresa ou entidade" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input className="mt-1" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="geral@empresa.pt" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input className="mt-1" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+351 210 000 000" />
              </div>
            </div>

            <div>
              <Label>Morada</Label>
              <Input className="mt-1" value={form.address} onChange={e => f('address', e.target.value)} placeholder="Rua, Número, Código Postal, Localidade" />
            </div>

            <p className="text-xs text-zinc-600">* Email, telefone ou morada — pelo menos um é obrigatório.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>NIF</Label>
                <Input className="mt-1" value={form.vatNumber} onChange={e => f('vatNumber', e.target.value)} placeholder="500000000" />
              </div>
              <div>
                <Label>País</Label>
                <Input className="mt-1" value={form.country} onChange={e => f('country', e.target.value)} placeholder="Portugal" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button disabled={saving} onClick={handleCreate}>
                <Check size={14} /> {saving ? 'A criar…' : 'Criar Cliente'}
              </Button>
              <Button variant="outline" onClick={() => { setMode('pick'); setError(null) }}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
