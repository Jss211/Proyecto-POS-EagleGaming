import { useEffect, useState } from "react"
import { Plus, Eye, Pencil, Copy, Trash2, FileText } from "lucide-react"
import SalesQuoteEditor from "./SalesQuoteEditor"
import SalesRecordDetail from "./SalesRecordDetail"
import SalesDialog from "./SalesDialog"
import { formatSalesDateTime, formatSalesMoney, normalizeSearch, salesDateInLima } from "./sales-model"
import { quoteStatus, type DemoQuote } from "./sales-records"
import type { OperationResult, QuoteInput } from "./sales-storage"
import type { DemoProduct } from "./sales-demo"

export default function SalesQuotes({ products, quotes, onSave, onDuplicate, onDelete, onNotice }: { products: readonly DemoProduct[]; quotes: DemoQuote[]; onSave: (input: QuoteInput) => OperationResult<DemoQuote>; onDuplicate: (id: string) => OperationResult<DemoQuote>; onDelete: (id: string) => OperationResult<null>; onNotice: (message: string) => void }) {
  const [editor, setEditor] = useState<DemoQuote | "new" | null>(null)
  const [detail, setDetail] = useState<DemoQuote | null>(null)
  const [deleting, setDeleting] = useState<DemoQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [today, setToday] = useState(() => salesDateInLima())
  const [page, setPage] = useState(1)
  useEffect(() => {
    const update = () => setToday(salesDateInLima())
    const timer = window.setInterval(update, 60_000)
    window.addEventListener("focus", update)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update) }
  }, [])
  const filtered = quotes.filter(quote => normalizeSearch(`${quote.number} ${quote.client}`).includes(normalizeSearch(query)) && (!status || quoteStatus(quote, today) === status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const pages = Math.max(1, Math.ceil(filtered.length / 8))
  const currentPage = Math.min(page, pages)
  if (editor) return <SalesQuoteEditor key={editor === "new" ? "new" : editor.id} products={products} quote={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSave={input => {
    const result = onSave(input)
    if (result.ok) { setEditor(null); onNotice(`${result.value.number}: cotización de demostración guardada localmente.`) }
    return result
  }} />
  return <section aria-labelledby="sales-quotes-title" className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="sales-quotes-title" className="font-semibold">Cotizaciones DEMO</h3><p className="mt-1 text-xs leading-6 text-zinc-500">Propuestas locales. No reservan stock ni se convierten automáticamente en ventas.</p></div><button type="button" onClick={() => setEditor("new")} className="sales-button sales-button-primary"><Plus size={17} aria-hidden="true" />Nueva cotización</button></div>
    <div className="my-5 grid gap-3 sm:grid-cols-2"><label className="sales-field">Buscar número o cliente DEMO<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="DEMO-C-000001" className="sales-input mt-1" /></label><label className="sales-field">Estado<select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} className="sales-input mt-1"><option value="">Todos los estados</option>{["Borrador", "Vigente", "Vencida"].map(state => <option key={state}>{state}</option>)}</select></label></div>
    {!filtered.length ? <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center"><FileText size={30} className="mx-auto text-zinc-400" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{quotes.length ? "Sin cotizaciones para estos filtros" : "Aún no hay cotizaciones DEMO"}</p><p className="mt-2 text-xs leading-6 text-zinc-500">Crea una propuesta con productos del catálogo de demostración.</p></div> : <ul className="grid gap-3 lg:grid-cols-2">{filtered.slice((currentPage - 1) * 8, currentPage * 8).map(quote => <li key={quote.id} className="min-w-0 rounded-xl border border-zinc-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">{quote.number}</h4><span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-[#cf1045]">{quoteStatus(quote, today)}</span></div><p className="mt-2 break-words text-sm text-zinc-600">{quote.client}</p><p className="mt-2 text-xs leading-6 text-zinc-500">Editada: {formatSalesDateTime(quote.updatedAt)} · Lima<br />Vence: {quote.expiresOn} · {quote.lines.reduce((sum, line) => sum + line.quantity, 0)} unidades</p><p className="mt-3 text-xl font-bold text-zinc-900">{formatSalesMoney(quote.totalCents)}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setDetail(quote)} aria-label={`Ver detalle de ${quote.number}`} className="sales-button sales-button-secondary text-xs"><Eye size={15} aria-hidden="true" />Detalle</button><button type="button" onClick={() => setEditor(quote)} aria-label={`Editar ${quote.number}`} className="sales-button sales-button-secondary text-xs"><Pencil size={15} aria-hidden="true" />Editar</button><button type="button" onClick={() => { const result = onDuplicate(quote.id); if (result.ok) onNotice(`${result.value.number}: copia DEMO guardada como borrador.`) }} aria-label={`Duplicar ${quote.number}`} className="sales-button sales-button-secondary text-xs"><Copy size={15} aria-hidden="true" />Duplicar</button><button type="button" onClick={() => { setError(null); setDeleting(quote) }} aria-label={`Eliminar ${quote.number}`} className="sales-button sales-button-secondary text-xs"><Trash2 size={15} aria-hidden="true" />Eliminar</button></div></li>)}</ul>}
    {pages > 1 && <nav aria-label="Paginación de cotizaciones" className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="sales-button sales-button-secondary text-xs">Anterior</button><p className="text-xs text-zinc-500">Página {currentPage} de {pages}</p><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="sales-button sales-button-secondary text-xs">Siguiente</button></nav>}
    {detail && <SalesRecordDetail record={detail} onClose={() => setDetail(null)} />}
    {deleting && <SalesDialog title={`¿Eliminar ${deleting.number}?`} onClose={() => setDeleting(null)} footer={<><button type="button" onClick={() => setDeleting(null)} className="sales-button sales-button-secondary">Cancelar</button><button type="button" onClick={() => { const result = onDelete(deleting.id); if (result.ok) { setDeleting(null); onNotice("Cotización de demostración eliminada localmente.") } else setError(result.error) }} className="sales-button sales-button-primary">Eliminar cotización DEMO</button></>}><p className="text-sm leading-6 text-zinc-500">Se eliminará únicamente esta cotización local de demostración. Esta acción no se puede deshacer.</p>{error && <p role="alert" className="mt-3 text-sm text-[#cf1045]">{error} La cotización se conserva.</p>}</SalesDialog>}
  </section>
}
