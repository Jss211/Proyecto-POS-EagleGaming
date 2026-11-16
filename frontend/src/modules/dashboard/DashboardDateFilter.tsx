import type { DateRange, Period } from "./dashboard-model"

export interface DashboardFilter { period: Period; custom: DateRange }
export default function DashboardDateFilter({ filter, today, invalid, onChange }: { filter: DashboardFilter; today: string; invalid: boolean; onChange: (filter: DashboardFilter) => void }) {
  return <div className="eagle-dashboard-filter">
    <label className="text-xs font-medium text-zinc-600">Período
      <select value={filter.period} onChange={event => onChange({ ...filter, period: event.target.value as Period })} className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800">
        <option value="today">Hoy</option><option value="week">Últimos 7 días</option><option value="month">Últimos 30 días</option><option value="custom">Rango personalizado</option>
      </select>
    </label>
    {filter.period === "custom" && <>
      <label className="text-xs font-medium text-zinc-600">Desde<input type="date" value={filter.custom.start} max={today} required aria-invalid={invalid} aria-describedby={invalid ? "dashboard-range-error" : undefined} onChange={event => onChange({ ...filter, custom: { ...filter.custom, start: event.target.value } })} className="mt-1 block w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800" /></label>
      <label className="text-xs font-medium text-zinc-600">Hasta<input type="date" value={filter.custom.end} max={today} required aria-invalid={invalid} aria-describedby={invalid ? "dashboard-range-error" : undefined} onChange={event => onChange({ ...filter, custom: { ...filter.custom, end: event.target.value } })} className="mt-1 block w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800" /></label>
    </>}
  </div>
}
