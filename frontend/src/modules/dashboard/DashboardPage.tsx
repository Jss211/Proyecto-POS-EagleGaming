import { useState } from "react"
import { Banknote, ShoppingCart, Package, TriangleAlert, ArrowRight, Users } from "lucide-react"
import Panel, { EmptyDashboardState } from "./DashboardPanel"
import DashboardDateFilter, { type DashboardFilter } from "./DashboardDateFilter"
import { SalesChart, PaymentsChart } from "./DashboardCharts"
import { TopProducts, Profitability, CashStatus, AfterSales, RecentActivity } from "./DashboardSections"
import { demoLowStock } from "./dashboard-demo"
import { formatDateTime, money, periodRange, saleTotal, shiftDate, summarizeDashboard, todayInLima, validRange, type DashboardSummary } from "./dashboard-model"

function DashboardContent({ summary, rangeLabel }: { summary: DashboardSummary; rangeLabel: string }) {
  const metrics = [
    { label: "Ventas netas", value: money(summary.revenueCents), detail: "Ingresos netos del período", icon: Banknote },
    { label: "Transacciones", value: String(summary.sales.length), detail: "Ventas del período", icon: ShoppingCart },
    { label: "Productos vendidos", value: String(summary.units), detail: "Unidades vendidas en el período", icon: Package },
    { label: "Clientes nuevos", value: String(summary.newCustomers), detail: "Registros nuevos del período", icon: Users },
  ]
  return <>
    <section aria-label="Indicadores del período, datos de demostración" className="eagle-dashboard-kpis">
      {metrics.map(({ label, value, detail, icon: Icon }) => <article key={label} className="eagle-dashboard-card min-w-0 rounded-2xl border border-zinc-200 bg-white p-5">
        <span className="inline-flex rounded-xl bg-rose-50 p-3 text-[#ed1450]"><Icon size={20} aria-hidden="true" /></span>
        <h3 className="mt-4 text-sm font-medium text-zinc-500">{label}</h3><p className="mt-2 break-words text-2xl font-bold tracking-tight text-zinc-900">{value}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
      </article>)}
    </section>
    <div className="eagle-dashboard-grid">
      <div className="eagle-dashboard-wide"><SalesChart summary={summary} rangeLabel={rangeLabel} /></div>
      <section className="eagle-dashboard-card relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-zinc-900 p-6 text-white sm:p-7">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#ed1450]/10" />
        <div className="relative flex flex-1 flex-col items-start">
          <span className="rounded-xl border border-rose-400/20 bg-[#ed1450]/15 p-3 text-rose-300"><TriangleAlert size={24} aria-hidden="true" /></span>
          <h3 className="mt-5 text-lg font-semibold">Atención al inventario</h3>
          <p className="mt-3 flex items-baseline gap-3"><span className="text-5xl font-bold tracking-tight">{demoLowStock.length}</span><span className="text-sm text-zinc-300">productos con stock bajo</span></p>
          <p className="mt-4 text-sm leading-6 text-zinc-400">Estado actual de ejemplo, independiente del período de ventas.</p>
          <ul className="my-5 space-y-2 text-xs text-zinc-300">{demoLowStock.map(name => <li key={name} className="flex items-center gap-2"><span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-rose-300" />{name}</li>)}</ul>
          <a href="#/inventario" className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ed1450] px-4 py-3 text-sm font-semibold text-white hover:bg-[#d01046]">Revisar inventario <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </section>
      <div className="eagle-dashboard-wide">
        <Panel title="Transacciones recientes" subtitle="Últimas 5 ventas del período seleccionado">
          {summary.sales.length === 0 ? <EmptyDashboardState /> : <div className="min-w-0 w-full overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <caption className="sr-only">Transacciones de demostración del período seleccionado</caption>
              <thead className="border-y border-zinc-100 bg-zinc-50 text-xs text-zinc-500"><tr>{["Cliente", "N.º de venta", "Método de pago", "Total", "Fecha y hora"].map(label => <th key={label} scope="col" className={`px-3 py-3 font-medium ${label === "Total" ? "text-right" : ""}`}>{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-100">{summary.sales.slice(0, 5).map(sale => <tr key={sale.id} className="hover:bg-zinc-50">
                <th scope="row" className="px-3 py-4 font-medium text-zinc-800">{sale.customer}</th><td className="px-3 py-4 text-xs text-zinc-500">{sale.id}</td><td className="px-3 py-4 text-xs text-zinc-600">{sale.method}</td><td className="whitespace-nowrap px-3 py-4 text-right font-semibold tabular-nums text-zinc-900">{money(saleTotal(sale))}</td><td className="px-3 py-4 text-xs tabular-nums text-zinc-500"><time dateTime={sale.occurredAt}>{formatDateTime(sale.occurredAt)}</time></td>
              </tr>)}</tbody>
            </table>
          </div>}
        </Panel>
      </div>
      <PaymentsChart summary={summary} />
      <div className="eagle-dashboard-wide"><TopProducts products={summary.topProducts} /></div>
      <Profitability summary={summary} />
    </div>
    <div className="eagle-dashboard-pair"><CashStatus /><AfterSales /></div>
    <RecentActivity activities={summary.activities} />
  </>
}

export default function DashboardPage() {
  const today = todayInLima()
  const [filter, setFilter] = useState<DashboardFilter>(() => ({ period: "week", custom: { start: shiftDate(today, -6), end: today } }))
  const range = periodRange(filter.period, today, filter.custom)
  const valid = validRange(range) && range.end <= today
  const dateFormat = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeZone: "UTC" })
  const formatDate = (date: string) => dateFormat.format(new Date(`${date}T12:00:00Z`))
  const rangeLabel = valid ? `${formatDate(range.start)} al ${formatDate(range.end)}` : "Rango no válido"
  const summary = valid ? summarizeDashboard(range) : null

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-gaming text-2xl font-bold text-zinc-900">Resumen del negocio</h2><p className="mt-1 text-sm text-zinc-500">Un vistazo al rendimiento de tu tienda gaming.</p><span className="mt-3 inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-[#cf1045]">DEMO · Registros de ejemplo, sin conexión a Supabase</span></div>
      <DashboardDateFilter filter={filter} today={today} invalid={!valid} onChange={setFilter} />
    </div>
    <p aria-live="polite" className="text-xs text-zinc-500">Período seleccionado: {rangeLabel} · Hora de Lima. Datos disponibles: 18/10/2026 al 16/11/2026.</p>
    {!valid && <p id="dashboard-range-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Selecciona ambas fechas válidas, con inicio anterior o igual al final y sin fechas futuras.</p>}
    {summary && <DashboardContent summary={summary} rangeLabel={rangeLabel} />}
    <p className="text-xs leading-5 text-zinc-500">Todos los importes, clientes, horarios, cantidades, productos y movimientos son de demostración. No se consultan ni registran operaciones en Supabase.</p>
  </div>
}
