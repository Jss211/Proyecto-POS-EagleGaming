import type { Period } from "./dashboard-model"
export interface DashboardFilter { period: Period }
export default function DashboardDateFilter({ filter, onChange }: { filter: DashboardFilter; onChange: (filter: DashboardFilter) => void }) {
  return <div className="eagle-dashboard-filter"><label className="text-xs font-medium text-zinc-600">Período
    <select value={filter.period} onChange={event => onChange({ period: event.target.value as Period })} className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800">
      <option value="week">Semanal</option><option value="month">Mensual</option><option value="year">Anual</option>
    </select></label></div>
}
