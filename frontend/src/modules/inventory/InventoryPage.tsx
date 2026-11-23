import { ArrowLeft, ArrowRight, Boxes, CircleAlert, PackageCheck, PackageX, Plus, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { listenForHidBarcode } from "@/utils/hid-barcode"
import { useRealProductCatalog } from "../products/RealProductCatalog"
import ProductPermissionCheck, { useProductPermission } from "../products/ProductPermissionCheck"
import { fieldClass, primaryButton, secondaryButton } from "../products/ProductDialog"
import { normalize } from "../products/products-demo"
import InventoryEntryDialog from "./InventoryEntryDialog"
import { readInventoryHistory, type InventoryMovement } from "./inventory-service"

const pageSize = 8
const stockLabels = { available: "Disponible", low: "Stock bajo", out: "Sin stock", unknown: "Sin dato" }

function stockStatus(stock: number | null, minimum: number | null): keyof typeof stockLabels {
  if (stock === null) return "unknown"
  if (stock === 0) return "out"
  return minimum !== null && stock <= minimum ? "low" : "available"
}

function Pagination({ page, onPage, hasNext, name }: {
  page: number
  onPage: (page: number) => void
  hasNext: boolean
  name: string
}) {
  return (
    <nav aria-label={name} className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" className={secondaryButton} disabled={page === 0} onClick={() => onPage(page - 1)}><ArrowLeft size={16} aria-hidden="true" />Anterior</button>
      <span className="text-sm text-zinc-600">Página {page + 1}</span>
      <button type="button" className={secondaryButton} disabled={!hasNext} onClick={() => onPage(page + 1)}>Siguiente<ArrowRight size={16} aria-hidden="true" /></button>
    </nav>
  )
}

type HistoryState = { kind: "loading" } | { kind: "error"; message: string } |
  { kind: "ready"; movements: InventoryMovement[]; hasNext: boolean }

function InventoryHistory({ names, latest }: { names: Map<string, string>; latest?: InventoryMovement }) {
  const [state, setState] = useState<HistoryState>({ kind: "loading" })
  const [page, setPage] = useState(0)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState({ kind: "loading" })
    readInventoryHistory(page, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(result => { if (!controller.signal.aborted) setState({ kind: "ready", ...result }) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: "error", message: error instanceof Error ? error.message : "No se pudo consultar el historial." })
      })
    return () => controller.abort()
  }, [page, retry])

  const movements = state.kind === "ready" ? state.movements : page === 0 && latest ? [latest] : []
  return (
    <section aria-labelledby="inventory-history" className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h3 id="inventory-history" className="font-gaming text-lg font-bold">Historial de movimientos</h3>
      {state.kind === "loading" && <p role="status" className="text-sm text-zinc-600">Cargando movimientos…</p>}
      {state.kind === "error" && <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-[#a71037]">{state.message}</p>
        <button type="button" className={secondaryButton} onClick={() => setRetry(value => value + 1)}>Reintentar historial</button>
      </div>}
      {state.kind === "ready" && !movements.length && <p className="text-sm text-zinc-600">No hay movimientos visibles en esta página.</p>}
      {movements.length > 0 && <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-600"><tr>
            {["Fecha", "Producto", "Movimiento", "Cantidad", "Stock anterior", "Stock posterior", "Motivo y observaciones"].map(label =>
              <th key={label} scope="col" className="p-3 font-semibold">{label}</th>)}
          </tr></thead>
          <tbody>{movements.map(item => <tr key={item.id} className="border-t border-zinc-200">
            <td className="p-3 tabular-nums">{new Date(/[zZ]|[+-]\d\d:\d\d$/.test(item.createdAt) ? item.createdAt : `${item.createdAt}Z`).toLocaleString("es-PE", { timeZone: "America/Lima" })}</td>
            <td className="p-3 font-medium">{names.get(item.productId) ?? item.productId}</td>
            <td className="p-3">{item.type.replace(/_/g, " ")}</td>
            <td className="p-3 tabular-nums">{item.quantity}</td>
            <td className="p-3 tabular-nums">{item.stockBefore}</td>
            <td className="p-3 tabular-nums">{item.stockAfter}</td>
            <td className="max-w-xs whitespace-pre-wrap break-words p-3">{item.reason ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {state.kind === "ready" && (page > 0 || state.hasNext) && <Pagination name="Paginación de movimientos" page={page} onPage={setPage} hasNext={state.hasNext} />}
    </section>
  )
}

export default function InventoryPage({ accountEmail }: { accountEmail?: string }) {
  const { permission, retry } = useProductPermission(accountEmail, "entrada de inventario")
  const { catalog, reload } = useRealProductCatalog(accountEmail, false)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)
  const [entry, setEntry] = useState<{ barcode?: string }>()
  const [historyRevision, setHistoryRevision] = useState(0)
  const [latest, setLatest] = useState<InventoryMovement>()
  const allowed = permission.kind === "allowed"
  const products = catalog.kind === "ready" ? catalog.products : []
  const names = new Map(products.map(product => [product.id, product.name || product.barcode]))

  useEffect(() => {
    if (!allowed || entry) return
    return listenForHidBarcode(barcode => setEntry({ barcode }))
  }, [allowed, entry])

  const needle = normalize(search)
  const filtered = products.filter(product =>
    (!status || stockStatus(product.stock, product.minStock) === status) &&
    [product.name, product.sku, product.barcode].some(value => normalize(value ?? "").includes(needle)),
  )
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1)
  const selectedPage = Math.min(page, lastPage)
  const currentRows = filtered.slice(selectedPage * pageSize, (selectedPage + 1) * pageSize)

  const indicators = [
    { label: "Productos visibles", count: products.length, Icon: Boxes },
    { label: "Con stock disponible", count: products.filter(product => (product.stock ?? 0) > 0).length, Icon: PackageCheck },
    { label: "Con stock bajo", count: products.filter(product => stockStatus(product.stock, product.minStock) === "low").length, Icon: CircleAlert },
    { label: "Sin stock", count: products.filter(product => product.stock === 0).length, Icon: PackageX },
  ]

  return (
    <div className="min-w-0 space-y-5 text-zinc-900">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="font-gaming text-2xl font-bold">Inventario</h2>
          <p className="mt-1 text-sm text-zinc-600">Consulta existencias y movimientos de los productos.</p>
        </div>
        <button type="button" className={`${primaryButton} disabled:opacity-50`} disabled={!allowed || catalog.kind !== "ready"} onClick={() => setEntry({})}>
          <Plus size={18} aria-hidden="true" />Registrar entrada
        </button>
      </header>
      {!accountEmail ? <p className="text-sm text-zinc-600">Inicia sesión para consultar el inventario.</p> : <>
        {permission.kind === "denied"
          ? <p className="text-sm text-zinc-600">El registro de entradas y el historial requieren autorización de ADMIN.</p>
          : <ProductPermissionCheck permission={permission} onRetry={retry} />}
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {indicators.map(({ label, count, Icon }) => <div key={label} className="flex min-w-0 flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-[#cf1045]"><Icon size={19} aria-hidden="true" /></span>
            <div><dt className="text-xs font-medium text-zinc-600 sm:text-sm">{label}</dt><dd className="mt-1 font-gaming text-2xl font-bold tabular-nums">{catalog.kind === "ready" ? count : "—"}</dd></div>
          </div>)}
        </dl>
        <p className="text-xs text-zinc-600">Indicadores de los productos visibles para tu sesión. Stock bajo significa que quedan unidades y el stock es igual o inferior al mínimo.</p>

        <section aria-labelledby="inventory-stock" className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <h3 id="inventory-stock" className="font-gaming text-lg font-bold">Existencias</h3>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)]">
            <label className="min-w-0"><span className="mb-1 block text-sm font-medium">Buscar productos</span>
              <span className="relative block"><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-zinc-500" />
                <input type="search" className={`${fieldClass} pl-9`} placeholder="Nombre, SKU o código de barras" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
              </span>
            </label>
            <label><span className="mb-1 block text-sm font-medium">Disponibilidad</span>
              <select className={fieldClass} value={status} onChange={event => { setStatus(event.target.value); setPage(0) }}>
                <option value="">Todas</option>
                {Object.entries(stockLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          </div>
          {catalog.kind === "loading" && <p role="status" className="text-sm text-zinc-600">Cargando existencias…</p>}
          {catalog.kind === "error" && <div className="flex flex-wrap items-center gap-3">
            <p role="alert" className="text-sm text-[#a71037]">{catalog.message}</p>
            <button type="button" className={secondaryButton} onClick={reload}>Reintentar existencias</button>
          </div>}
          {catalog.kind === "ready" && !currentRows.length && <p className="text-sm text-zinc-600">{products.length ? "No hay productos que coincidan con los filtros." : "No hay productos visibles para tu sesión."}</p>}
          {currentRows.length > 0 && <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-600"><tr>
                  {["Producto", "SKU", "Código de barras", "Stock", "Mínimo", "Disponibilidad"].map(label =>
                    <th key={label} scope="col" className="p-3 font-semibold">{label}</th>)}
                </tr></thead>
                <tbody>{currentRows.map(product => {
                  const stock = stockStatus(product.stock, product.minStock)
                  return <tr key={product.id} className="border-t border-zinc-200">
                    <td className="p-3 font-semibold">{product.name || product.barcode}</td>
                    <td className="p-3">{product.sku || "—"}</td>
                    <td className="p-3 tabular-nums">{product.barcode}</td>
                    <td className="p-3 tabular-nums">{product.stock ?? "—"}</td>
                    <td className="p-3 tabular-nums">{product.minStock ?? "—"}</td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stock === "low" || stock === "out" ? "bg-rose-50 text-[#a71037]" : "bg-zinc-100 text-zinc-800"}`}>{stockLabels[stock]}</span></td>
                  </tr>
                })}</tbody>
              </table>
            </div>
            {lastPage > 0 && <Pagination name="Paginación de existencias" page={selectedPage} onPage={setPage} hasNext={selectedPage < lastPage} />}
          </>}
        </section>
        {allowed && <InventoryHistory key={historyRevision} names={names} latest={latest} />}
      </>}
      {entry && <InventoryEntryDialog products={products} initialBarcode={entry.barcode}
        userId={allowed ? permission.userId : undefined} onClose={() => setEntry(undefined)}
        onRecorded={movement => {
          setLatest(movement)
          setHistoryRevision(value => value + 1)
          reload()
        }} />}
    </div>
  )
}
