'use client'

import { useState, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Button }        from '@/components/ui/button'
import { Input }         from '@/components/ui/input'
import { SelectNative }  from '@/components/ui/select-native'
import { Label }         from '@/components/ui/label'
import { FormMessage }   from '@/components/ui/form-message'
import { StatusBadge }   from '@/components/ui/badge'

interface Department { id: string; name: string }
interface Employee {
  id: string; name: string; email: string; hourlyRate: number
  employmentType: string; monthlySalary: number; perDiemRate: number; travelDayRate: number
  role: string; isActive: boolean; department: Department; departmentId: string
  managerId: string | null
}

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: 'Colaborador', MANAGER: 'Gestor', ADMIN: 'Administrador',
}

export default function EmployeesManager() {
  const [employees,   setEmployees]   = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState<Employee | null>(null)
  const [form,        setForm]        = useState({ name: '', hourlyRate: '', role: 'EMPLOYEE', departmentId: '', isActive: true, managerId: '', employmentType: 'INTERNAL', monthlySalary: '0', perDiemRate: '0', travelDayRate: '0' })
  const [saving,      setSaving]      = useState(false)
  const [message,     setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMsg(type: 'success' | 'error', text: string) { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/employees').then(r => r.json()),
      fetch('/api/admin/departments').then(r => r.json()),
    ]).then(([emps, depts]) => { setEmployees(emps); setDepartments(depts); setLoading(false) })
  }, [])

  function startEdit(e: Employee) {
    setEditing(e)
    setForm({ name: e.name, hourlyRate: e.hourlyRate.toString(), role: e.role, departmentId: e.departmentId, isActive: e.isActive, managerId: e.managerId ?? '', employmentType: e.employmentType, monthlySalary: Number(e.monthlySalary).toString(), perDiemRate: Number(e.perDiemRate).toString(), travelDayRate: Number(e.travelDayRate).toString() })
  }

  async function handleSubmit() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, name: form.name, email: editing.email, hourlyRate: parseFloat(form.hourlyRate) || 0, role: form.role, departmentId: form.departmentId, managerId: form.managerId || null, employmentType: form.employmentType, monthlySalary: parseFloat(form.monthlySalary) || 0, perDiemRate: parseFloat(form.perDiemRate) || 0, travelDayRate: parseFloat(form.travelDayRate) || 0 }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        const fieldErrors = payload?.error?.fieldErrors as Record<string, string[] | undefined> | undefined
        const fieldLabels: Record<string, string> = {
          name: 'Nome', email: 'Email', hourlyRate: 'Valor/Hora', departmentId: 'Departamento',
          role: 'Role', managerId: 'Gestor', employmentType: 'Tipo de contrato',
          monthlySalary: 'Salário mensal', perDiemRate: 'Per diem diário', travelDayRate: 'Compensação por dia',
        }
        const invalidField = fieldErrors
          ? Object.entries(fieldErrors).find(([, messages]) => messages?.length)
          : null
        const validationMessage = invalidField
          ? `${fieldLabels[invalidField[0]] ?? invalidField[0]}: ${invalidField[1]?.[0]}`
          : null
        throw new Error(
          validationMessage
          ?? (typeof payload?.error === 'string' ? payload.error : null)
          ?? 'Erro ao guardar.',
        )
      }
      const saved = await res.json()
      setEmployees(prev => prev.map(e => e.id === saved.id ? saved : e))
      setEditing(null); showMsg('success', 'Funcionário actualizado!')
    } catch (error) {
      showMsg('error', error instanceof Error ? error.message : 'Erro ao guardar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{employees.length} funcionário(s)</p>
      </div>

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">A carregar...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {['Nome','Email','Departamento','Valor/Hora','Role',''].map((h, i) => (
                  <th key={i} className={`${i === 5 ? 'px-5' : i === 0 ? 'text-left px-5 py-3' : 'text-left px-3 py-3'} py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map(emp => (
                <>
                  <tr key={emp.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-zinc-200">{emp.name}</td>
                    <td className="px-3 py-3 text-zinc-400">{emp.email}</td>
                    <td className="px-3 py-3 text-zinc-400">{emp.department.name}</td>
                    <td className="px-3 py-3 text-zinc-400">€{Number(emp.hourlyRate).toFixed(2)}/h</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={emp.role} label={ROLE_LABEL[emp.role]} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(emp)}>
                        <Pencil size={14} />
                      </Button>
                    </td>
                  </tr>
                  {editing?.id === emp.id && (
                    <tr key={`edit-${emp.id}`} className="bg-secondary/30">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="grid grid-cols-5 gap-3">
                          <div>
                            <Label>Nome</Label>
                            <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Departamento</Label>
                            <SelectNative className="mt-1" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </SelectNative>
                          </div>
                          <div>
                            <Label>Valor/Hora (€)</Label>
                            <Input className="mt-1" type="number" step="0.01" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Role</Label>
                            <SelectNative className="mt-1" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                              <option value="EMPLOYEE">Colaborador</option>
                              <option value="MANAGER">Gestor</option>
                              <option value="ADMIN">Administrador</option>
                            </SelectNative>
                          </div>
                          <div>
                            <Label>Gestor</Label>
                            <SelectNative className="mt-1" value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}>
                              <option value="">Sem gestor</option>
                              {employees.filter(e => e.id !== editing.id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </SelectNative>
                          </div>
                          <div><Label>Tipo de contrato</Label><SelectNative className="mt-1" value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}><option value="INTERNAL">Interno</option><option value="EXTERNAL">Externo</option></SelectNative></div>
                          <div><Label>Salário mensal (€)</Label><Input className="mt-1" type="number" step="0.01" value={form.monthlySalary} onChange={e => setForm(f => ({ ...f, monthlySalary: e.target.value }))} /></div>
                          <div><Label>Per diem diário (€)</Label><Input className="mt-1" type="number" step="0.01" value={form.perDiemRate} onChange={e => setForm(f => ({ ...f, perDiemRate: e.target.value }))} /></div>
                          <div><Label>Compensação por dia trabalhado (€)</Label><Input className="mt-1" type="number" step="0.01" value={form.travelDayRate} onChange={e => setForm(f => ({ ...f, travelDayRate: e.target.value }))} /></div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button disabled={saving} onClick={handleSubmit}>
                            <Check size={14} /> {saving ? 'A guardar...' : 'Guardar'}
                          </Button>
                          <Button variant="outline" onClick={() => setEditing(null)}>
                            <X size={14} /> Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">Sem funcionários registados.</div>}
        </div>
      )}
    </div>
  )
}
