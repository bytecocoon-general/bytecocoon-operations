'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { FormMessage }  from '@/components/ui/form-message'
import { Label }        from '@/components/ui/label'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  id:         string
  name:       string
  email:      string
  hourlyRate: number
  department: { name: string }
}

interface ProjectMember {
  id:         string
  projectId:  string
  employeeId: string
  employee:   Employee
  role:                       string | null
  startDate:                  string | null
  endDate:                    string | null
  clientRate:                 number
  overtimeAllowed:            boolean
  overtimeWeekdayMultiplier:  number
  overtimeWeekendMultiplier:  number
  onCallAllowed:              boolean
  onCallWeeklyRate:           number
  expensesAllowed:            boolean
  expensesMonthlyLimit:       number | null
}

interface Project {
  id:      string
  name:    string
  isActive: boolean
  client?: { name: string } | null
  members: ProjectMember[]
}

// ── Empty form ────────────────────────────────────────────────────────────────

function emptyForm(employeeId = '') {
  return {
    employeeId,
    role:                      '',
    startDate:                 '',
    endDate:                   '',
    clientRate:                0,
    overtimeAllowed:           false,
    overtimeWeekdayMultiplier: 1.5,
    overtimeWeekendMultiplier: 2.0,
    onCallAllowed:             false,
    onCallWeeklyRate:          0,
    expensesAllowed:           false,
    expensesMonthlyLimit:      '' as number | '',
  }
}

type FormState = ReturnType<typeof emptyForm>

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffingManager() {
  const [projects,       setProjects]       = useState<Project[]>([])
  const [employees,      setEmployees]      = useState<Employee[]>([])
  const [loading,        setLoading]        = useState(true)
  const [openProject,    setOpenProject]    = useState<string | null>(null)
  const [addingTo,       setAddingTo]       = useState<string | null>(null)   // projectId opening add form
  const [editingMember,  setEditingMember]  = useState<string | null>(null)   // memberId being edited
  const [form,           setForm]           = useState<FormState>(emptyForm())
  const [saving,         setSaving]         = useState(false)
  const [message,        setMessage]        = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Data ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const [projRes, empRes] = await Promise.all([
      fetch('/api/projects?includeMembers=true'),
      fetch('/api/admin/employees'),
    ])
    const [projData, empData] = await Promise.all([projRes.json(), empRes.json()])
    setProjects(projData)
    setEmployees(empData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 3500)
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  function startAdd(projectId: string) {
    setAddingTo(projectId)
    setEditingMember(null)
    setForm(emptyForm())
  }

  function startEdit(member: ProjectMember) {
    setEditingMember(member.id)
    setAddingTo(member.projectId)
    setForm({
      employeeId:                member.employeeId,
      role:                      member.role ?? '',
      startDate:                 member.startDate ? member.startDate.substring(0, 10) : '',
      endDate:                   member.endDate   ? member.endDate.substring(0, 10)   : '',
      clientRate:                Number(member.clientRate),
      overtimeAllowed:           member.overtimeAllowed,
      overtimeWeekdayMultiplier: Number(member.overtimeWeekdayMultiplier),
      overtimeWeekendMultiplier: Number(member.overtimeWeekendMultiplier),
      onCallAllowed:             member.onCallAllowed,
      onCallWeeklyRate:          Number(member.onCallWeeklyRate),
      expensesAllowed:           member.expensesAllowed,
      expensesMonthlyLimit:      member.expensesMonthlyLimit != null ? Number(member.expensesMonthlyLimit) : '',
    })
  }

  function cancelForm() { setAddingTo(null); setEditingMember(null) }

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function saveMember(projectId: string) {
    setSaving(true)
    try {
      const payload = {
        ...form,
        clientRate:           Number(form.clientRate) || 0,
        onCallWeeklyRate:     Number(form.onCallWeeklyRate) || 0,
        expensesMonthlyLimit: form.expensesMonthlyLimit !== '' ? Number(form.expensesMonthlyLimit) : null,
        startDate:            form.startDate || null,
        endDate:              form.endDate   || null,
        role:                 form.role      || null,
      }

      const url    = editingMember
        ? `/api/projects/${projectId}/members/${editingMember}`
        : `/api/projects/${projectId}/members`
      const method = editingMember ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao guardar')
      }

      showMsg('success', editingMember ? 'Membro actualizado.' : 'Membro adicionado.')
      cancelForm()
      await load()
    } catch (e) {
      showMsg('error', e instanceof Error ? e.message : 'Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember(projectId: string, memberId: string, name: string) {
    if (!confirm(`Remover ${name} do projecto?`)) return
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showMsg('success', 'Membro removido.')
      await load()
    } catch { showMsg('error', 'Erro ao remover.') }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeProjects = projects.filter(p => p.isActive)

  // Employees not yet on a given project
  function available(projectId: string) {
    const existing = projects.find(p => p.id === projectId)?.members.map(m => m.employeeId) ?? []
    return employees.filter(e => !existing.includes(e.id) || editingMember)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-center py-20 text-zinc-600">A carregar...</div>

  return (
    <div className="space-y-3">
      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {activeProjects.length === 0 && (
        <div className="text-center py-16 text-zinc-600">Nenhum projecto activo encontrado.</div>
      )}

      {activeProjects.map(project => {
        const isOpen = openProject === project.id

        return (
          <div key={project.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Project header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors text-left"
              onClick={() => setOpenProject(isOpen ? null : project.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Users size={14} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{project.name}</p>
                  {project.client && <p className="text-xs text-zinc-500">{project.client.name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
                  {project.members.length} {project.members.length === 1 ? 'membro' : 'membros'}
                </span>
                {isOpen ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border">
                {/* Members list */}
                {project.members.length > 0 && (
                  <div>
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_120px_80px_72px_72px_72px_72px_80px] gap-3 px-5 py-2 border-b border-border bg-secondary/10">
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Colaborador</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Função</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Taxa cliente</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest text-center">OT</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Sem.</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest text-center">On-call</span>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest text-center">Desp.</span>
                      <span />
                    </div>
                    {project.members.map(member => (
                      <div key={member.id} className="grid grid-cols-[1fr_120px_80px_72px_72px_72px_72px_80px] gap-3 items-center px-5 py-3 border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
                        <div>
                          <p className="text-sm text-zinc-200 font-medium">{member.employee.name}</p>
                          <p className="text-xs text-zinc-500">{member.employee.department.name}</p>
                        </div>
                        <span className="text-xs text-zinc-400 truncate">{member.role ?? '—'}</span>
                        <span className="text-xs text-zinc-300 text-right font-medium">
                          {Number(member.clientRate).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/h
                        </span>
                        {/* OT allowed */}
                        <div className="text-center">
                          {member.overtimeAllowed ? (
                            <span className="text-xs text-emerald-400 font-medium">
                              {Number(member.overtimeWeekdayMultiplier) * 100}%
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-700">—</span>
                          )}
                        </div>
                        {/* Weekend */}
                        <div className="text-center">
                          {member.overtimeAllowed ? (
                            <span className="text-xs text-blue-400 font-medium">
                              {Number(member.overtimeWeekendMultiplier) * 100}%
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-700">—</span>
                          )}
                        </div>
                        {/* On-call */}
                        <div className="text-center">
                          {member.onCallAllowed ? (
                            <span className="text-xs text-violet-400 font-medium">
                              {Number(member.onCallWeeklyRate).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-700">—</span>
                          )}
                        </div>
                        {/* Expenses */}
                        <div className="text-center">
                          {member.expensesAllowed ? (
                            <span className="text-xs text-orange-400">✓{member.expensesMonthlyLimit ? ` ${Number(member.expensesMonthlyLimit)}€` : ''}</span>
                          ) : (
                            <span className="text-xs text-zinc-700">—</span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => { setOpenProject(project.id); startEdit(member) }}>
                            <Pencil size={13} className="text-zinc-500 hover:text-zinc-200" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMember(project.id, member.id, member.employee.name)}>
                            <Trash2 size={13} className="text-zinc-500 hover:text-red-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add member form */}
                {addingTo === project.id ? (
                  <MemberForm
                    projectId={project.id}
                    employees={editingMember ? employees : available(project.id)}
                    form={form}
                    setF={setF}
                    saving={saving}
                    isEdit={!!editingMember}
                    onSave={() => saveMember(project.id)}
                    onCancel={cancelForm}
                  />
                ) : (
                  <div className="px-5 py-3">
                    <button
                      onClick={() => startAdd(project.id)}
                      className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-300 transition-colors"
                    >
                      <Plus size={13} /> Adicionar colaborador
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── MemberForm ────────────────────────────────────────────────────────────────

function MemberForm({
  employees, form, setF, saving, isEdit, onSave, onCancel,
}: {
  projectId: string
  employees: Employee[]
  form: FormState
  setF: <K extends keyof FormState>(k: K, v: FormState[K]) => void
  saving: boolean
  isEdit: boolean
  onSave: () => void
  onCancel: () => void
}) {
  const inp = 'text-xs rounded px-2 py-1.5 focus:ring-1'

  return (
    <div className="border-t border-border bg-secondary/5 px-5 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-200">{isEdit ? 'Editar configuração' : 'Adicionar colaborador'}</p>
        <button onClick={onCancel} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X size={15} /></button>
      </div>

      {/* Row 1: collaborator + role + period + client rate */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Colaborador *</Label>
          {isEdit ? (
            <p className="text-sm text-zinc-300">{employees.find(e => e.id === form.employeeId)?.name ?? '—'}</p>
          ) : (
            <SelectNative value={form.employeeId} onChange={e => setF('employeeId', e.target.value)} className={inp}>
              <option value="">Seleccionar…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.department.name})</option>
              ))}
            </SelectNative>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Função no projecto</Label>
          <Input value={form.role} onChange={e => setF('role', e.target.value)} placeholder="ex: Tech Lead" className={inp} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Início</Label>
          <Input type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)} className={inp} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fim (opcional)</Label>
          <Input type="date" value={form.endDate} onChange={e => setF('endDate', e.target.value)} className={inp} />
        </div>
      </div>

      {/* Row 2: client rate */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Taxa faturada ao cliente (€/h)</Label>
          <Input type="number" min="0" step="0.5" value={form.clientRate} onChange={e => setF('clientRate', parseFloat(e.target.value) || 0)} className={`${inp} w-full`} />
        </div>
      </div>

      {/* Section: Overtime */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Horas Extra</p>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.overtimeAllowed} onChange={e => setF('overtimeAllowed', e.target.checked)} className="accent-violet-500 w-4 h-4" />
          <span className="text-sm text-zinc-300">Autorizado a introduzir horas extra neste projecto</span>
        </label>
        {form.overtimeAllowed && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-1">
              <Label className="text-xs">Multiplicador semana (ex: 1.5 = 150%)</Label>
              <Input type="number" min="1" max="5" step="0.1" value={form.overtimeWeekdayMultiplier} onChange={e => setF('overtimeWeekdayMultiplier', parseFloat(e.target.value) || 1.5)} className={`${inp} w-full`} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Multiplicador fim de semana / feriado (ex: 2.0 = 200%)</Label>
              <Input type="number" min="1" max="5" step="0.1" value={form.overtimeWeekendMultiplier} onChange={e => setF('overtimeWeekendMultiplier', parseFloat(e.target.value) || 2.0)} className={`${inp} w-full`} />
            </div>
          </div>
        )}
      </div>

      {/* Section: On-call */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">On-Call</p>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.onCallAllowed} onChange={e => setF('onCallAllowed', e.target.checked)} className="accent-violet-500 w-4 h-4" />
          <span className="text-sm text-zinc-300">Pode ficar de on-call neste projecto</span>
        </label>
        {form.onCallAllowed && (
          <div className="pl-6">
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">Taxa semanal de on-call (€/semana)</Label>
              <Input type="number" min="0" step="10" value={form.onCallWeeklyRate} onChange={e => setF('onCallWeeklyRate', parseFloat(e.target.value) || 0)} className={`${inp} w-full`} />
            </div>
          </div>
        )}
      </div>

      {/* Section: Expenses */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Despesas</p>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.expensesAllowed} onChange={e => setF('expensesAllowed', e.target.checked)} className="accent-violet-500 w-4 h-4" />
          <span className="text-sm text-zinc-300">Pode registar despesas associadas a este projecto</span>
        </label>
        {form.expensesAllowed && (
          <div className="pl-6">
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">Limite mensal de despesas (€, opcional)</Label>
              <Input type="number" min="0" step="10" value={form.expensesMonthlyLimit} onChange={e => setF('expensesMonthlyLimit', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="Sem limite" className={`${inp} w-full`} />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button onClick={onSave} disabled={saving || (!isEdit && !form.employeeId)}>
          {saving ? 'A guardar...' : isEdit ? 'Actualizar' : 'Adicionar'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}
