'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Check, X, ToggleLeft, ToggleRight, FolderKanban, Building2 } from 'lucide-react'
import ClientPickerModal, { type PickedClient } from './ClientPickerModal'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Label }        from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'
import { FormMessage }  from '@/components/ui/form-message'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { cn }           from '@/lib/utils'

interface Project {
  id: string; name: string; clientId: string | null; clientName: string | null
  client: { id: string; name: string } | null
  budget: number | null; isActive: boolean; isBillable: boolean
  contractType: string | null; contractStatus: string | null
  startDate: string | null; endDate: string | null
  currency: string; description: string | null
  _count: { timesheetLines: number }
}

type ProjectType = 'internal' | 'client'

const emptyForm = {
  projectType:    'client' as ProjectType,
  name:           '',
  clientId:       '',
  clientLabel:    '',
  budget:         '',
  isActive:       true,
  isBillable:     true,
  contractType:   '',
  contractStatus: '',
  startDate:      '',
  endDate:        '',
  currency:       'EUR',
  description:    '',
}

const typeLabel:   Record<string, string> = { FIXED: 'Preço Fixo', TIME_AND_MATERIALS: 'T&M', RETAINER: 'Retainer' }
const statusLabel: Record<string, string> = { DRAFT: 'Rascunho', ACTIVE: 'Activo', EXPIRED: 'Expirado', TERMINATED: 'Terminado' }

export default function ProjectsManager() {
  const [projects,         setProjects]         = useState<Project[]>([])
  const [loading,          setLoading]          = useState(true)
  const [showForm,         setShowForm]         = useState(false)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [editing,          setEditing]          = useState<Project | null>(null)
  const [form,             setForm]             = useState(emptyForm)
  const [saving,           setSaving]           = useState(false)
  const [message,          setMessage]          = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMsg(type: 'success' | 'error', text: string) { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }

  useEffect(() => {
    fetch('/api/admin/projects').then(r => r.json()).then(data => { setProjects(data); setLoading(false) })
  }, [])

  function startEdit(p: Project) {
    setEditing(p)
    setForm({
      projectType:    p.clientId ? 'client' : 'internal',
      name:           p.name,
      clientId:       p.client?.id ?? '',
      clientLabel:    p.client?.name ?? p.clientName ?? '',
      budget:         p.budget?.toString() ?? '',
      isActive:       p.isActive,
      isBillable:     p.isBillable,
      contractType:   p.contractType ?? '',
      contractStatus: p.contractStatus ?? '',
      startDate:      p.startDate ? p.startDate.slice(0, 10) : '',
      endDate:        p.endDate   ? p.endDate.slice(0, 10)   : '',
      currency:       p.currency ?? 'EUR',
      description:    p.description ?? '',
    })
    setShowForm(true)
  }
  function startNew() { setEditing(null); setForm(emptyForm); setShowForm(true) }

  function handleClientPicked(c: PickedClient) { setForm(f => ({ ...f, clientId: c.id, clientLabel: c.name })); setShowClientPicker(false) }
  function clearClient() { setForm(f => ({ ...f, clientId: '', clientLabel: '' })) }
  function setProjectType(t: ProjectType) { setForm(f => ({ ...f, projectType: t, clientId: '', clientLabel: '' })) }

  async function handleSubmit() {
    if (!form.name.trim()) { showMsg('error', 'O nome do projecto é obrigatório.'); return }
    setSaving(true)
    try {
      const body = {
        ...(editing ? { id: editing.id } : {}),
        name:           form.name.trim(),
        clientId:       form.projectType === 'client' ? (form.clientId || null) : null,
        budget:         form.budget ? parseFloat(form.budget) : null,
        isActive:       form.isActive,
        isBillable:     form.isBillable,
        contractType:   form.projectType === 'client' ? (form.contractType   || null) : null,
        contractStatus: form.projectType === 'client' ? (form.contractStatus || null) : null,
        startDate:      form.projectType === 'client' ? (form.startDate      || null) : null,
        endDate:        form.projectType === 'client' ? (form.endDate        || null) : null,
        currency:       form.currency || 'EUR',
        description:    form.description || null,
      }
      const res = await fetch('/api/admin/projects', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      if (editing) setProjects(prev => prev.map(p => p.id === saved.id ? { ...saved, _count: p._count } : p))
      else setProjects(prev => [...prev, { ...saved, _count: { timesheetLines: 0 } }])
      setShowForm(false); showMsg('success', editing ? 'Projecto actualizado!' : 'Projecto criado!')
    } catch { showMsg('error', 'Erro ao guardar.') } finally { setSaving(false) }
  }

  async function toggleActive(p: Project) {
    const res = await fetch('/api/admin/projects', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, name: p.name, clientId: p.client?.id ?? null, budget: p.budget, isActive: !p.isActive, isBillable: p.isBillable, contractType: p.contractType, contractStatus: p.contractStatus, startDate: p.startDate ? p.startDate.slice(0, 10) : null, endDate: p.endDate ? p.endDate.slice(0, 10) : null, currency: p.currency, description: p.description }),
    })
    if (res.ok) { const saved = await res.json(); setProjects(prev => prev.map(x => x.id === saved.id ? { ...saved, _count: p._count } : x)) }
  }

  const isInternal = (p: Project) => !p.clientId

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{projects.length} projecto(s)</p>
        <Button onClick={startNew}><Plus size={15} /> Novo Projecto</Button>
      </div>

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {showForm && (
        <div className="bg-secondary/30 border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-zinc-200">{editing ? 'Editar Projecto' : 'Novo Projecto'}</h3>

          {/* Tipo */}
          <div>
            <Label className="block mb-2">Tipo de Projecto</Label>
            <div className="flex gap-2">
              {(['internal', 'client'] as ProjectType[]).map(t => (
                <button key={t} type="button" onClick={() => setProjectType(t)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                    form.projectType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-zinc-400 border-border hover:bg-secondary/80 hover:text-zinc-200'
                  )}>
                  {t === 'internal' ? <><FolderKanban size={15} /> Interno</> : <><Building2 size={15} /> Cliente</>}
                </button>
              ))}
            </div>
            {form.projectType === 'internal' && <p className="text-xs text-zinc-600 mt-1.5">Projecto interno — não associado a nenhum cliente.</p>}
          </div>

          {/* Basic info */}
          <div className={`grid gap-3 ${form.projectType === 'client' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <Label>Nome *</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do projecto" />
            </div>
            {form.projectType === 'client' && (
              <div>
                <Label>Cliente</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input readOnly value={form.clientLabel} placeholder="— Pesquisar cliente —" className="flex-1 w-auto cursor-default" />
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setShowClientPicker(true)}><Building2 size={15} /></Button>
                  {form.clientId && <Button type="button" variant="outline" size="icon" className="shrink-0 hover:text-red-400" onClick={clearClient}><X size={15} /></Button>}
                </div>
              </div>
            )}
            <div>
              <Label>Orçamento (€)</Label>
              <Input className="mt-1" type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>

          {/* Contrato (client projects only) */}
          {form.projectType === 'client' && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Contrato</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Contrato</Label>
                  <SelectNative className="mt-1" value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}>
                    <option value="">— Nenhum —</option>
                    <option value="TIME_AND_MATERIALS">T&M</option>
                    <option value="FIXED">Preço Fixo</option>
                    <option value="RETAINER">Retainer</option>
                  </SelectNative>
                </div>
                <div>
                  <Label>Estado</Label>
                  <SelectNative className="mt-1" value={form.contractStatus} onChange={e => setForm(f => ({ ...f, contractStatus: e.target.value }))}>
                    <option value="">— Nenhum —</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="ACTIVE">Activo</option>
                    <option value="EXPIRED">Expirado</option>
                    <option value="TERMINATED">Rescindido</option>
                  </SelectNative>
                </div>
                <div>
                  <Label>Data Início</Label>
                  <Input className="mt-1" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input className="mt-1" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Moeda</Label>
                  <Input className="mt-1" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="EUR" maxLength={3} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Label>Activo</Label>
              <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                {form.isActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-zinc-600" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Label>Faturável</Label>
              <button onClick={() => setForm(f => ({ ...f, isBillable: !f.isBillable }))}>
                {form.isBillable ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-zinc-600" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button disabled={saving} onClick={handleSubmit}><Check size={14} /> {saving ? 'A guardar...' : 'Guardar'}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}><X size={14} /> Cancelar</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">A carregar...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {['Nome','Tipo','Cliente','Contrato','Estado','Orçamento','Registos','Estado Proj.',''].map((h, i) => (
                  <th key={i} className={`${[6,7].includes(i) ? 'text-center' : i === 8 ? '' : 'text-left'} ${i === 0 || i === 8 ? 'px-5' : 'px-3'} py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map(p => (
                <tr key={p.id} className={`hover:bg-secondary/30 transition-colors ${!p.isActive ? 'opacity-40' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FolderKanban size={14} className="text-zinc-600 shrink-0" />
                      <span className="font-medium text-zinc-200">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {isInternal(p)
                      ? <Badge variant="default">Interno</Badge>
                      : <Badge variant="blue">Cliente</Badge>}
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{p.client?.name ?? p.clientName ?? '—'}</td>
                  <td className="px-3 py-3">
                    {p.contractType
                      ? <Badge variant="violet">{typeLabel[p.contractType] ?? p.contractType}</Badge>
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {p.contractStatus
                      ? <StatusBadge status={p.contractStatus} label={statusLabel[p.contractStatus]} />
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{p.budget ? `€${Number(p.budget).toLocaleString('pt-PT')}` : '—'}</td>
                  <td className="px-3 py-3 text-center text-zinc-400">{p._count.timesheetLines}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => toggleActive(p)}>
                      {p.isActive ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-zinc-600" />}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">Sem projectos. Cria o primeiro!</div>}
        </div>
      )}

      {showClientPicker && <ClientPickerModal onSelect={handleClientPicked} onClose={() => setShowClientPicker(false)} />}
    </div>
  )
}
