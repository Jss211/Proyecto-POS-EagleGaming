import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { ScanLine, ShoppingCart } from "lucide-react"
import { useRealProductCatalog } from "../products/RealProductCatalog"
import { listenForHidBarcode } from "@/utils/hid-barcode"
import { lookupBarcode, type StockCatalogProduct } from "../products/product-lookup"
import SalesWorkspace from "./SalesWorkspace"
import { parseMoneyCents } from "./sales-model"
import type { SalesProduct } from "./sales-product"
import useSalesCart from "./useSalesCart"

function toSalesProduct(product: StockCatalogProduct): SalesProduct | null {
  const priceCents = parseMoneyCents(String(product.price))
  if (product.isActive !== true || !product.stock || product.stock <= 0 || priceCents === null) return null
  return {
    id: product.id,
    name: product.name?.trim() || "Producto sin nombre",
    category: product.category?.trim() || "Sin categoría",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    priceCents,
    available: product.stock,
    description: product.description?.trim() || undefined,
    detail: product.description?.trim() || "Sin descripción",
    status: "Activo",
  }
}

export default function RealSalesPage({ accountEmail, sessionIdentity }: { accountEmail?: string; sessionIdentity?: string }) {
  const { catalog, reload } = useRealProductCatalog(accountEmail, false, true, sessionIdentity)
  const [scannedProducts, setScannedProducts] = useState(() => new Map<string, SalesProduct | null>())
  const catalogProducts = useMemo(() => catalog.kind === "ready"
    ? catalog.products.map(toSalesProduct).filter(product => product !== null)
    : [], [catalog])
  const ready = catalog.kind === "ready"
  const products = useMemo(() => {
    if (!ready) return []
    const current = new Map<string, SalesProduct | null>(catalogProducts.map(product => [product.id, product]))
    for (const [id, product] of scannedProducts) current.set(id, product)
    return [...current.values()].filter(product => product !== null)
  }, [ready, catalogProducts, scannedProducts])
  const draft = useSalesCart(products)
  const { dispatch } = draft

  useEffect(() => {
    if (ready) dispatch({ type: "refresh", products: catalogProducts })
  }, [ready, catalogProducts, dispatch])

  useLayoutEffect(() => {
    if (!ready || !sessionIdentity) return
    const scope = new AbortController()
    let pending = Promise.resolve()

    async function scan(barcode: string) {
      if (scope.signal.aborted) return
      try {
        const result = await lookupBarcode(barcode, AbortSignal.any([scope.signal, AbortSignal.timeout(10000)]), sessionIdentity)
        if (scope.signal.aborted) return
        if (result.kind === "error") {
          dispatch({ type: "scan-error", message: result.message })
          return
        }
        if (result.kind === "missing") {
          dispatch({ type: "scan-error", message: `No se encontró un producto visible para el código ${barcode}.` })
          return
        }

        const row = result.product
        const product = toSalesProduct(row)
        setScannedProducts(previous => new Map(previous).set(row.id, product))
        if (product) {
          dispatch({ type: "scan", product })
          return
        }
        dispatch({ type: "remove", productId: row.id })
        const name = row.name?.trim() || barcode
        const reason = row.isActive !== true ? "producto inactivo" : row.stock === null ? "stock no disponible"
          : row.stock <= 0 ? "sin stock disponible" : "precio no válido"
        dispatch({ type: "scan-error", message: `${name}: ${reason}.` })
      } catch {
        if (!scope.signal.aborted) {
          dispatch({ type: "scan-error", message: "No se pudo consultar el código. Revisa tu conexión e inténtalo de nuevo." })
        }
      }
    }

    const stopListening = listenForHidBarcode(barcode => {
      // Preserve every complete scan, including consecutive reads of the same product.
      pending = pending.then(() => scan(barcode))
    })
    return () => {
      stopListening()
      scope.abort()
    }
  }, [ready, sessionIdentity, dispatch])

  function refreshCatalog() {
    dispatch({ type: "reset-scan" })
    setScannedProducts(new Map())
    reload()
  }

  return <div className="eagle-sales space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="font-gaming text-2xl font-bold text-zinc-900">Ventas</h2>
        <p className="mt-1 text-sm text-zinc-500">Punto de venta</p>
      </div>
      {accountEmail && <div className="flex flex-wrap gap-2">
        <button type="button" onClick={refreshCatalog} disabled={catalog.kind === "loading"} className="sales-button sales-button-secondary">Actualizar catálogo</button>
        {catalog.kind === "ready" && <button type="button" className="sales-button sales-button-primary" onClick={() => {
          const cart = document.getElementById("sales-cart")
          cart?.focus({ preventScroll: true })
          cart?.scrollIntoView({ block: "start" })
        }}><ShoppingCart size={17} aria-hidden="true" />Ver carrito ({draft.summary.units})</button>}
      </div>}
    </header>
    {!accountEmail ? <p role="alert" className="rounded-xl border border-zinc-200 bg-white p-5 text-sm">Inicia sesión para consultar los productos disponibles.</p>
      : catalog.kind === "loading" ? <p role="status" className="rounded-xl border border-zinc-200 bg-white p-5 text-sm">Cargando productos disponibles…</p>
      : catalog.kind === "error" ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-[#a71037]">{catalog.message}</p>
      : null}
    {ready && sessionIdentity && <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
        <ScanLine size={14} aria-hidden="true" /> Lector LOPEN activo en Ventas
      </span>
      {draft.scanNotice && <p role={draft.scanNotice.kind === "error" ? "alert" : "status"} className={draft.scanNotice.kind === "error" ? "text-sm font-medium text-[#a71037]" : "text-sm font-medium text-emerald-800"}>{draft.scanNotice.message}</p>}
    </div>}
    <div hidden={!ready}>
      <SalesWorkspace draft={draft} demo={false} actionLabel="Confirmar venta" actionNote="El cobro estará disponible cuando se habilite el registro transaccional de ventas." />
    </div>
  </div>
}
