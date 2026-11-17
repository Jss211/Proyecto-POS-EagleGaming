import { useMemo, useState } from "react"
import { ShoppingCart, Store, History, FileText, CheckCircle2, RefreshCw } from "lucide-react"
import SalesWorkspace from "./SalesWorkspace"
import SalesCheckout from "./SalesCheckout"
import SalesHistory from "./SalesHistory"
import SalesQuotes from "./SalesQuotes"
import SalesRecordDetail from "./SalesRecordDetail"
import useSalesCart from "./useSalesCart"
import useDemoRecords from "./useDemoRecords"
import { deleteDemoQuote, duplicateDemoQuote, registerDemoSale, saveDemoQuote } from "./sales-storage"
import type { DemoSale } from "./sales-records"
import { deriveDemoStock } from "./sales-stock"

const views = [{ id: "pos", title: "Punto de venta", icon: Store }, { id: "history", title: "Historial de ventas", icon: History }, { id: "quotes", title: "Cotizaciones", icon: FileText }] as const
type SalesView = typeof views[number]["id"]

export default function SalesPage() {
  const [view, setView] = useState<SalesView>("pos")
  const records = useDemoRecords()
  const stock = useMemo(() => deriveDemoStock(records.data.sales), [records.data.sales])
  const products = useMemo(() => records.loaded ? stock.products : stock.products.map(product => ({ ...product, available: 0, stockVerified: false })), [records.loaded, stock.products])
  const draft = useSalesCart(products)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [notice, setNotice] = useState("")
  const [receipt, setReceipt] = useState<DemoSale | null>(null)
  const [detail, setDetail] = useState<DemoSale | null>(null)
  const showCart = () => {
    const element = document.getElementById("sales-cart")
    element?.focus({ preventScroll: true })
    element?.scrollIntoView({ block: "start" })
  }
  const showNotice = (message: string) => { setNotice(message); setReceipt(null) }

  return <div className="eagle-sales space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-gaming text-2xl font-bold text-zinc-900">Ventas</h2><p className="mt-1 text-sm text-zinc-500">Gestiona las ventas de tu tienda gaming.</p><span className="mt-3 inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-[#cf1045]">DEMO · Operaciones locales sin pagos reales</span></div>{view === "pos" && <button type="button" onClick={showCart} className="sales-button sales-button-primary"><ShoppingCart size={17} aria-hidden="true" />Ver carrito ({draft.summary.units})</button>}</div>
    <nav aria-label="Secciones de Ventas" className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1.5">{views.map(({ id, title, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => setView(id)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold sm:flex-none sm:text-sm ${view === id ? "bg-[#ed1450] text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}><Icon size={16} className="shrink-0" aria-hidden="true" />{title}</button>)}</nav>
    <p className="text-xs leading-6 text-zinc-500">Ventas y cotizaciones guardadas permanecen en este navegador. Las selecciones sin guardar se conservan entre pestañas de Ventas; se descartan al salir del módulo. No hay sincronización entre dispositivos.</p>
    {records.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-[#cf1045]"><p>{records.error}</p><p className="mt-1 text-xs">No se confirma ningún guardado fallido. Se conservan el carrito y los cambios de la cotización.</p><button type="button" onClick={records.reload} className="sales-button sales-button-secondary mt-3 text-xs"><RefreshCw size={15} aria-hidden="true" />Reintentar lectura local</button></div>}
    {!records.loaded && <p role="status" className="text-xs leading-6 text-[#cf1045]">Stock DEMO no verificable: la selección de productos está bloqueada hasta poder leer el historial local. No se reiniciaron las existencias ni se borraron registros.</p>}
    {stock.warnings.length > 0 && <div role="status" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-6 text-[#cf1045]"><p className="font-semibold">Inconsistencias en el historial de stock DEMO</p><ul className="mt-2 list-inside list-disc">{stock.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
    {notice && <div role="status" className="rounded-xl border border-zinc-200 bg-white p-4"><p className="flex items-start gap-2 text-sm font-semibold"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#cf1045]" aria-hidden="true" />{notice}</p><p className="mt-2 text-xs leading-6 text-zinc-500">Solo demostración en este navegador. No representa una transacción financiera real.</p>{receipt && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setDetail(receipt)} className="sales-button sales-button-secondary text-xs">Ver {receipt.number}</button><button type="button" onClick={() => setView("history")} className="sales-button sales-button-secondary text-xs">Ir al historial</button></div>}</div>}
    <div hidden={view !== "pos"}><SalesWorkspace draft={draft} onSubmit={() => { if (draft.summary.lines.length && !draft.summary.discountError && !draft.summary.cartError) setCheckoutOpen(true) }} /></div>
    <div hidden={view !== "history"}><SalesHistory sales={records.data.sales} /></div>
    <div hidden={view !== "quotes"}><SalesQuotes products={products} quotes={records.data.quotes} onSave={input => records.commit(data => saveDemoQuote(data, input))} onDuplicate={id => records.commit(data => duplicateDemoQuote(data, id))} onDelete={id => records.commit(data => deleteDemoQuote(data, id))} onNotice={showNotice} /></div>
    <SalesCheckout open={checkoutOpen} summary={draft.summary} onClose={() => setCheckoutOpen(false)} onConfirm={(method, received) => {
      const result = records.commit(data => registerDemoSale(data, draft.summary, method, received))
      if (result.ok) {
        setReceipt(result.value)
        setNotice(`Venta de demostración registrada · ${result.value.number}`)
        draft.clear()
      }
      return result
    }} />
    {detail && <SalesRecordDetail record={detail} onClose={() => setDetail(null)} />}
  </div>
}
