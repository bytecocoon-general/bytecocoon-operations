'use client'

import { useState } from 'react'
import { Car, Globe2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'

export interface TravelPeriodInput { startDate: string; endDate: string; country: string; projectId: string | null; description: string }
export interface MileageEntryInput { date: string; origin: string; destination: string; kilometres: number; projectId: string | null; purpose: string; vehiclePlate: string }

interface Project { id: string; name: string }

export default function TravelCompensationEditor({ projects, travelPeriods, mileageEntries, onTravelChange, onMileageChange, locked, month, year }: {
  projects: Project[]; travelPeriods: TravelPeriodInput[]; mileageEntries: MileageEntryInput[]
  onTravelChange: (value: TravelPeriodInput[]) => void; onMileageChange: (value: MileageEntryInput[]) => void
  locked: boolean; month: number; year: number
}) {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  const [travel, setTravel] = useState<TravelPeriodInput>({ startDate: firstDay, endDate: firstDay, country: '', projectId: null, description: '' })
  const [mileage, setMileage] = useState<MileageEntryInput>({ date: firstDay, origin: '', destination: '', kilometres: 0, projectId: null, purpose: '', vehiclePlate: '' })

  function addTravel() {
    if (!travel.country || !travel.startDate || !travel.endDate) return
    onTravelChange([...travelPeriods, travel]); setTravel({ ...travel, country: '', description: '' })
  }
  function addMileage() {
    if (!mileage.origin || !mileage.destination || mileage.kilometres <= 0) return
    onMileageChange([...mileageEntries, mileage]); setMileage({ ...mileage, origin: '', destination: '', kilometres: 0, purpose: '', vehiclePlate: '' })
  }

  return <div className="grid gap-4 xl:grid-cols-2">
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold text-zinc-200"><Globe2 size={16} /> Deslocações internacionais</h3>
      <p className="mt-1 text-xs text-zinc-500">O período inclui fins de semana e dias de viagem.</p>
      {!locked && <div className="mt-3 grid grid-cols-2 gap-2">
        <Input type="date" min={firstDay} max={lastDay} value={travel.startDate} onChange={e => setTravel(v => ({ ...v, startDate: e.target.value }))} />
        <Input type="date" min={firstDay} max={lastDay} value={travel.endDate} onChange={e => setTravel(v => ({ ...v, endDate: e.target.value }))} />
        <Input placeholder="País" value={travel.country} onChange={e => setTravel(v => ({ ...v, country: e.target.value }))} />
        <SelectNative value={travel.projectId ?? ''} onChange={e => setTravel(v => ({ ...v, projectId: e.target.value || null }))}><option value="">Sem projeto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectNative>
        <Input className="col-span-2" placeholder="Descrição (opcional)" value={travel.description} onChange={e => setTravel(v => ({ ...v, description: e.target.value }))} />
        <Button className="col-span-2" variant="outline" onClick={addTravel}><Plus size={14} /> Adicionar período</Button>
      </div>}
      <div className="mt-3 space-y-2">{travelPeriods.map((p, i) => <div key={`${p.startDate}-${i}`} className="flex items-center justify-between rounded border border-border p-2 text-xs"><span><strong>{p.country}</strong> · {p.startDate} → {p.endDate}{p.description ? ` · ${p.description}` : ''}</span>{!locked && <Button variant="ghost" size="icon" onClick={() => onTravelChange(travelPeriods.filter((_, n) => n !== i))}><Trash2 size={13} /></Button>}</div>)}</div>
    </section>

    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold text-zinc-200"><Car size={16} /> Quilometragem</h3>
      <p className="mt-1 text-xs text-zinc-500">Registe os quilómetros reais; a compensação depende do contrato.</p>
      {!locked && <div className="mt-3 grid grid-cols-2 gap-2">
        <Input type="date" min={firstDay} max={lastDay} value={mileage.date} onChange={e => setMileage(v => ({ ...v, date: e.target.value }))} />
        <SelectNative value={mileage.projectId ?? ''} onChange={e => setMileage(v => ({ ...v, projectId: e.target.value || null }))}><option value="">Sem projeto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectNative>
        <Input placeholder="Origem" value={mileage.origin} onChange={e => setMileage(v => ({ ...v, origin: e.target.value }))} />
        <Input placeholder="Destino" value={mileage.destination} onChange={e => setMileage(v => ({ ...v, destination: e.target.value }))} />
        <Input type="number" min="0" step="0.1" placeholder="Quilómetros" value={mileage.kilometres || ''} onChange={e => setMileage(v => ({ ...v, kilometres: Number(e.target.value) }))} />
        <Input placeholder="Matrícula (opcional)" value={mileage.vehiclePlate} onChange={e => setMileage(v => ({ ...v, vehiclePlate: e.target.value }))} />
        <Input className="col-span-2" placeholder="Motivo (opcional)" value={mileage.purpose} onChange={e => setMileage(v => ({ ...v, purpose: e.target.value }))} />
        <Button className="col-span-2" variant="outline" onClick={addMileage}><Plus size={14} /> Adicionar trajeto</Button>
      </div>}
      <div className="mt-3 space-y-2">{mileageEntries.map((m, i) => <div key={`${m.date}-${i}`} className="flex items-center justify-between rounded border border-border p-2 text-xs"><span><strong>{m.date}</strong> · {m.origin} → {m.destination} · {m.kilometres} km</span>{!locked && <Button variant="ghost" size="icon" onClick={() => onMileageChange(mileageEntries.filter((_, n) => n !== i))}><Trash2 size={13} /></Button>}</div>)}</div>
    </section>
  </div>
}
