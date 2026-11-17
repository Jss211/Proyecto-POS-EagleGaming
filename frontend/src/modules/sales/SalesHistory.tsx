import { useState } from "react"
import { Eye, History } from "lucide-react"
import { formatSalesDateTime, formatSalesMoney, paymentMethods, validSalesDate } from "./sales-model"
import { filterSaleHistory, type DemoSale, type HistoryFilters } from "./sales-records"
import SalesRecordDetail from "./SalesRecordDetail"

const defaultFilters: HistoryFilters = { query: "", from: "", to: "", method: "", status: "", order: "newest" }
const pageSize = 8

export default function SalesHistory({ sales }: { sales: DemoSale[] }) {
  const [filters, setFilters] = useState(defaultFilters)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<DemoSale | null>(null)
  const update = (value: Partial<HistoryFilters>) => { setFilters(previous => ({ ...previous, ...value })); setPage(1) }
  const dateError = (filters.from && !validSalesDate(filters.from)) || (filters.to && !validSalesDate(filters.to)) || (filters.from && filters.to && filters.from > filters.to) ? "Revisa las fechas: el inicio debe ser anterior o igual al final." : null
  const filtered = dateError ? [] : filterSaleHistory(sales, filters)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  return <section aria-labelledby="sales-history-title" className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="sales-history-title" className="font-semibold">Historial de ventas DEMO</h3><p className="mt-1 text-xs leading-6 text-zinc-500">Solo ventas guardadas en este navegador. Precios conservados al confirmar cada venta.</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-[#cf1045]">{sales.length} registros locales</span></div>
    <div className="my-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <label className="sales-field">Número de venta<input type="search" value={filters.query} onChange={event => update({ query: event.target.value })} placeholder="DEMO-V-000001" className="sales-input mt-1" /></label>
      <label className="sales-field">Desde · Lima<input type="date" value={filters.from} onChange={event => update({ from: event.target.value })} aria-invalid={!!dateError} aria-describedby={dateError ? "sales-history-date-error" : undefined} className="sales-input mt-1" /></label>
      <label className="sales-field">Hasta · Lima<input type="date" value={filters.to} onChange={event => update({ to: event.target.value })} aria-invalid={!!dateError} aria-describedby={dateError ? "sales-history-date-error" : undefined} className="sales-input mt-1" /></label>
      <label className="sales-field">Método de pago<select value={filters.method} onChange={event => update({ method: event.target.value })} className="sales-input mt-1"><option value="">Todos los métodos</option>{paymentMethods.map(method => <option key={method}>{method}</option>)}</select></label>
      <label className="sales-field">Estado<select value={filters.status} onChange={event => update({ status: event.target.value })} className="sales-input mt-1"><option value="">Todos los estados</option><option>Registrada DEMO</option></select></label>
      <label className="sales-field">Orden de fecha<select value={filters.order} onChange={event => update({ order: event.target.value as HistoryFilters["order"] })} className="sales-input mt-1"><option value="newest">Más recientes primero</option><option value="oldest">Más antiguas primero</option></select></label>
    </div>
    {dateError && <p id="sales-history-date-error" role="alert" className="mb-3 text-xs text-[#cf1045]">{dateError}</p>}
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-xs text-zinc-500">{filtered.length} ventas coinciden</p><button type="button" onClick={() => { setFilters(defaultFilters); setPage(1) }} className="sales-button sales-button-secondary text-xs">Limpiar filtros</button></div>
    {!rows.length ? <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center"><History size={30} className="mx-auto text-zinc-400" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{sales.length ? "Sin resultados para estos filtros" : "Aún no hay ventas de demostración"}</p><p className="mt-2 text-xs leading-6 text-zinc-500">{sales.length ? "Ajusta las fechas o limpia los filtros." : "Confirma un cobro DEMO desde Punto de venta para verlo aquí."}</p></div> : <div className="w-full overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><caption className="sr-only">Ventas locales de demostración</caption><thead className="border-y border-zinc-100 bg-zinc-50 text-zinc-500"><tr>{["Número", "Fecha y hora · Lima", "Cliente", "Artículos", "Método", "Total", "Estado", "Acciones"].map(title => <th key={title} scope="col" className="px-3 py-3 font-medium">{title}</th>)}</tr></thead><tbody className="divide-y divide-zinc-100">{rows.map(sale => <tr key={sale.id} className="hover:bg-zinc-50"><th scope="row" className="whitespace-nowrap px-3 py-4 font-semibold">{sale.number}</th><td className="px-3 py-4"><time dateTime={sale.createdAt}>{formatSalesDateTime(sale.createdAt)}</time></td><td className="px-3 py-4">{sale.client}</td><td className="px-3 py-4 tabular-nums">{sale.lines.reduce((sum, line) => sum + line.quantity, 0)}</td><td className="px-3 py-4">{sale.paymentMethod}</td><td className="whitespace-nowrap px-3 py-4 font-semibold tabular-nums">{formatSalesMoney(sale.totalCents)}</td><td className="px-3 py-4"><span className="whitespace-nowrap rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-[#cf1045]">{sale.status}</span></td><td className="px-3 py-3"><button type="button" onClick={() => setDetail(sale)} aria-label={`Ver detalle de ${sale.number}`} className="sales-button sales-button-secondary whitespace-nowrap text-xs"><Eye size={15} aria-hidden="true" />Ver detalle</button></td></tr>)}</tbody></table></div>}
    {pages > 1 && <nav aria-label="Paginación del historial" className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="sales-button sales-button-secondary text-xs">Anterior</button><p className="text-xs text-zinc-500">Página {currentPage} de {pages}</p><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="sales-button sales-button-secondary text-xs">Siguiente</button></nav>}
    {detail && <SalesRecordDetail record={detail} onClose={() => setDetail(null)} />}
  </section>
}
