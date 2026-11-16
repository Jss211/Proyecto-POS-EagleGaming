import type { ReactNode } from "react"

export default function DashboardPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="eagle-dashboard-card flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
    <div className="mb-5"><h3 className="font-semibold text-zinc-900">{title}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p></div>
    {children}
  </section>
}

export function EmptyDashboardState({ children = "No hay registros de ejemplo para el período seleccionado." }: { children?: ReactNode }) {
  return <p role="status" className="rounded-xl bg-zinc-50 p-5 text-sm leading-6 text-zinc-500">{children}</p>
}
