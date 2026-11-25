import { motion } from "framer-motion"
import { Calendar } from "lucide-react"
import type { Period } from "./dashboard-model"

export interface DashboardFilter { period: Period }

const periods: { id: Period; label: string }[] = [
  { id: "week", label: "Semanal" },
  { id: "month", label: "Mensual" },
  { id: "year", label: "Anual" },
]

export default function DashboardDateFilter({ filter, onChange }: { filter: DashboardFilter; onChange: (filter: DashboardFilter) => void }) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm">
      <span className="flex items-center gap-1.5 pl-2.5 pr-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Calendar size={14} className="text-[#ed1450]" aria-hidden="true" />
        <span className="hidden sm:inline">Período</span>
      </span>
      <div className="flex items-center gap-1" role="tablist" aria-label="Filtro de período del dashboard">
        {periods.map(item => {
          const isActive = filter.period === item.id
          return (
            <motion.button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange({ period: item.id })}
              className={`relative rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                isActive ? "text-white" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activePeriodPill"
                  className="absolute inset-0 rounded-xl bg-[#ed1450] shadow-sm shadow-rose-900/20"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
