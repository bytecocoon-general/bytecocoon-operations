'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Tag } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { FormMessage } from '@/components/ui/form-message'
import { Label }       from '@/components/ui/label'

const CATEGORIES = ['Backend', 'Frontend', 'Mobile', 'Cloud', 'DevOps', 'Data', 'Design', 'Gestão', 'QA', 'Outro']
const LEVEL_LABEL: Record<number, string> = { 1: 'Básico', 2: 'Elementar', 3: 'Intermédio', 4: 'Avançado', 5: 'Expert' }

interface Skill {
  id: string; name: string; category: string
  _count: { employees: number; projects: number }
}

interface EmployeeSkillEntry {
  id: string; level: number
  skill: { id: string; name: string; category: string }
}

interface ProjectSkillEntry {
  id: string; minLevel: number; required: boolean
  skill: { id: string; name: string; category: string }
}

interface Employee { id: string; name: string; department: { name: string } }
interface Project  { id: string; name: string; isActive: boolean }

// ── Skill catalogue management ────────────────────────────────────────────────

function SkillCatalogue() {
  const [skills,  setSkills]  = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ name: '', category: 'Backend' })
  const [adding,  setAdding]  = useState(false)
  const [msg,     setMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/skills')
    setSkills(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 3000)
  }

  async function addSkill() {
    if (!form.name.trim()) return
    const r = await fetch('/api/skills', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { showMsg('success', 'Skill adicionada.'); setAdding(false); setForm({ name: '', category: 'Backend' }); load() }
    else { const e = await r.json(); showMsg('error', e.error?.fieldErrors?.name?.[0] ?? 'Erro ao guardar.') }
  }

  async function deleteSkill(id: string, name: string) {
    if (!confirm(`Remover skill "${name}"? Será removida de todos os colaboradores e projectos.`)) return
    await fetch(`/api/skills/${id}`, { method: 'DELETE' })
    showMsg('success', 'Skill removida.')
    load()
  }

  const grouped = CATEGORIES.reduce<Record<string, Skill[]>>((acc, cat) => {
    const s = skills.filter(sk => sk.category === cat)
    if (s.length) acc[cat] = s
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {msg && <FormMessage type={msg.type}>{msg.text}</FormMessage>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{skills.length} skills no catálogo</p>
        <Button size="sm" variant="outline" onClick={() => setAdding(a => !a)}>
          {adding ? <X size={13} /> : <><Plus size={13} /> Adicionar skill</>}
        </Button>
      </div>

      {adding && (
        <div className="bg-secondary/20 border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1 flex-1 min-w-40">
            <Label className="text-xs">Nome da skill *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: .NET, React, Kubernetes…" className="text-xs" onKeyDown={e => e.key === 'Enter' && addSkill()} />
          </div>
          <div className="space-y-1 w-40">
            <Label className="text-xs">Categoria</Label>
            <SelectNative value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="text-xs">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </SelectNative>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addSkill}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {loading ? <div className="text-muted-foreground text-sm py-4 text-center">A carregar...</div> : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catSkills]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
                <Tag size={10} /> {cat}
              </p>
              <div className="flex flex-wrap gap-2">
                {catSkills.map(sk => (
                  <div key={sk.id} className="group flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2.5 py-1.5">
                    <span className="text-sm text-foreground">{sk.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {sk._count.employees}👤 {sk._count.projects}📁
                    </span>
                    {sk._count.employees === 0 && sk._count.projects === 0 && (
                      <button onClick={() => deleteSkill(sk.id, sk.name)}
                        className="text-muted-foreground/40 hover:text-red-400 transition-colors ml-0.5">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {skills.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-6">
              Nenhuma skill no catálogo ainda. Adiciona a primeira!
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Employee skills editor ────────────────────────────────────────────────────

function EmployeeSkillsPanel({ employee, allSkills }: { employee: Employee; allSkills: Skill[] }) {
  const [skills,  setSkills]  = useState<EmployeeSkillEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ skillId: '', level: 3 })
  const [msg,     setMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/employee-skills/${employee.id}`)
    setSkills(await r.json())
    setLoading(false)
  }, [employee.id])

  useEffect(() => { load() }, [load])

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 3000)
  }

  const existingIds = new Set(skills.map(s => s.skill.id))
  const available   = allSkills.filter(s => !existingIds.has(s.id))

  async function addSkill() {
    if (!form.skillId) return
    const r = await fetch(`/api/employee-skills/${employee.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { showMsg('success', 'Skill adicionada.'); setAdding(false); setForm({ skillId: '', level: 3 }); load() }
    else showMsg('error', 'Erro ao guardar.')
  }

  async function removeSkill(skillId: string) {
    await fetch(`/api/employee-skills/${employee.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId }),
    })
    load()
  }

  if (loading) return <div className="text-muted-foreground text-xs py-2">A carregar...</div>

  return (
    <div className="border-t border-border px-5 py-4 bg-secondary/5 space-y-3">
      {msg && <FormMessage type={msg.type}>{msg.text}</FormMessage>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{skills.length > 0 ? `${skills.length} competências registadas` : 'Sem competências registadas'}</p>
        {!adding && available.length > 0 && (
          <button onClick={() => setAdding(true)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            <Plus size={11} /> Adicionar
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-wrap gap-2 items-end">
          <SelectNative value={form.skillId} onChange={e => setForm(f => ({ ...f, skillId: e.target.value }))} className="text-xs flex-1 min-w-40">
            <option value="">Seleccionar skill…</option>
            {CATEGORIES.map(cat => {
              const catSkills = available.filter(s => s.category === cat)
              if (!catSkills.length) return null
              return (
                <optgroup key={cat} label={cat}>
                  {catSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              )
            })}
          </SelectNative>
          <SelectNative value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))} className="text-xs w-36">
            {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </SelectNative>
          <Button size="sm" onClick={addSkill} disabled={!form.skillId}>Ok</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X size={13} /></Button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {skills.map(s => (
          <div key={s.id} className="group flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2 py-1">
            <span className="text-xs text-foreground">{s.skill.name}</span>
            <span className={`text-[10px] font-medium px-1 rounded ${
              s.level >= 4 ? 'text-emerald-400' : s.level === 3 ? 'text-blue-400' : 'text-muted-foreground'
            }`}>{LEVEL_LABEL[s.level]}</span>
            <button onClick={() => removeSkill(s.skill.id)}
              className="text-muted-foreground/30 hover:text-red-400 transition-colors">
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Project skills editor ─────────────────────────────────────────────────────

function ProjectSkillsPanel({ project, allSkills }: { project: Project; allSkills: Skill[] }) {
  const [skills,  setSkills]  = useState<ProjectSkillEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ skillId: '', minLevel: 3, required: true })
  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/project-skills/${project.id}`)
    setSkills(await r.json())
    setLoading(false)
  }, [project.id])

  useEffect(() => { load() }, [load])

  const existingIds = new Set(skills.map(s => s.skill.id))
  const available   = allSkills.filter(s => !existingIds.has(s.id))

  async function addSkill() {
    if (!form.skillId) return
    await fetch(`/api/project-skills/${project.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setAdding(false); setForm({ skillId: '', minLevel: 3, required: true }); load()
  }

  async function removeSkill(skillId: string) {
    await fetch(`/api/project-skills/${project.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillId }),
    })
    load()
  }

  if (loading) return <div className="text-muted-foreground text-xs py-2">A carregar...</div>

  return (
    <div className="border-t border-border px-5 py-3 bg-blue-950/5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Competências requeridas ({skills.filter(s => s.required).length} obrig. · {skills.filter(s => !s.required).length} valoriz.)
        </p>
        {!adding && available.length > 0 && (
          <button onClick={() => setAdding(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <Plus size={11} /> Adicionar
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-wrap gap-2 items-end">
          <SelectNative value={form.skillId} onChange={e => setForm(f => ({ ...f, skillId: e.target.value }))} className="text-xs flex-1 min-w-40">
            <option value="">Seleccionar skill…</option>
            {CATEGORIES.map(cat => {
              const catSkills = available.filter(s => s.category === cat)
              if (!catSkills.length) return null
              return (
                <optgroup key={cat} label={cat}>
                  {catSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              )
            })}
          </SelectNative>
          <SelectNative value={form.minLevel} onChange={e => setForm(f => ({ ...f, minLevel: Number(e.target.value) }))} className="text-xs w-36">
            {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>Mín. {l}</option>)}
          </SelectNative>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))}
              className="accent-violet-500 w-3.5 h-3.5" />
            Obrigatória
          </label>
          <Button size="sm" onClick={addSkill} disabled={!form.skillId}>Ok</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}><X size={13} /></Button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {skills.map(s => (
          <div key={s.id} className={`group flex items-center gap-1.5 rounded-lg px-2 py-1 border ${
            s.required ? 'bg-blue-950/30 border-blue-800/40' : 'bg-secondary border-border'
          }`}>
            <span className="text-xs text-foreground">{s.skill.name}</span>
            <span className="text-[10px] text-muted-foreground">≥{LEVEL_LABEL[s.minLevel]}</span>
            {!s.required && <span className="text-[10px] text-muted-foreground/50">valoriz.</span>}
            <button onClick={() => removeSkill(s.skill.id)}
              className="text-muted-foreground/30 hover:text-red-400 transition-colors">
              <X size={10} />
            </button>
          </div>
        ))}
        {skills.length === 0 && <p className="text-xs text-muted-foreground/50 italic">Nenhuma competência definida para este projecto.</p>}
      </div>
    </div>
  )
}

// ── SkillsManager — exported component ───────────────────────────────────────

type Tab = 'catalogo' | 'colaboradores' | 'projectos'

export default function SkillsManager() {
  const [tab,       setTab]       = useState<Tab>('catalogo')
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects,  setProjects]  = useState<Project[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/skills').then(r => r.json()),
      fetch('/api/admin/employees').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([skills, emps, projs]) => {
      setAllSkills(skills)
      setEmployees(emps)
      setProjects(projs)
      setLoading(false)
    })
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'catalogo',      label: 'Catálogo de Skills' },
    { id: 'colaboradores', label: 'Por Colaborador'    },
    { id: 'projectos',     label: 'Por Projecto'       },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="py-10 text-center text-muted-foreground">A carregar...</div> : (
        <>
          {tab === 'catalogo' && <SkillCatalogue />}

          {tab === 'colaboradores' && (
            <div className="space-y-2">
              {employees.map(emp => (
                <div key={emp.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department.name}</p>
                    </div>
                  </div>
                  <EmployeeSkillsPanel employee={emp} allSkills={allSkills} />
                </div>
              ))}
            </div>
          )}

          {tab === 'projectos' && (
            <div className="space-y-2">
              {projects.filter((p: { isActive: boolean }) => p.isActive).map((proj: Project) => (
                <div key={proj.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground">{proj.name}</p>
                  </div>
                  <ProjectSkillsPanel project={proj} allSkills={allSkills} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
