import { useEffect, useState } from "react"
import { ScanLine, X } from "lucide-react"
import SalesCatalog from "./SalesCatalog"
import SalesCart from "./SalesCart"
import SalesProductDetails from "./SalesProductDetails"
import { filterSalesProducts } from "./sales-model"
import type { SalesProduct } from "./sales-product"
import type useSalesCart from "./useSalesCart"

export default function SalesWorkspace({ draft, onSubmit, cartId, actionLabel, actionNote, demo = true }: { draft: ReturnType<typeof useSalesCart>; onSubmit?: () => void; cartId?: string; actionLabel?: string; actionNote?: string; demo?: boolean }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const categories = [...new Set(draft.products.map(item => item.category))].sort((a, b) => a.localeCompare(b, "es"))
  const selectedCategory = categories.includes(category) ? category : ""
  const [productId, setProductId] = useState<string | null>(null)
  const product = draft.products.find(product => product.id === productId)
  const showDetails = (product: SalesProduct) => setProductId(product.id)
  const [message, setMessage] = useState("")
  const [scanNotice, setScanNotice] = useState<{ name: string; barcode: string } | null>(null)

  const add = (product: SalesProduct) => {
    const quantity = draft.items.find(item => item.productId === product.id)?.quantity ?? 0
    if (quantity >= product.available) return
    draft.action({ type: "add", productId: product.id })
    setMessage(`${product.name}: ${quantity + 1} unidades en el carrito.`)
  }

  const handleBarcodeScan = (rawCode: string) => {
    const clean = rawCode.trim().toLowerCase()
    if (!clean) return false
    const match = draft.products.find(
      p => p.barcode.toLowerCase() === clean || p.sku.toLowerCase() === clean
    )
    if (match) {
      add(match)
      setCategory("")
      setQuery("")
      setScanNotice({ name: match.name, barcode: match.barcode })
      window.setTimeout(() => setScanNotice(null), 3500)
      return true
    }
    return false
  }

  // Global barcode listener for USB scanner guns
  useEffect(() => {
    if (!demo) return
    let buffer = ""
    let lastKeyTime = Date.now()

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs other than the sales search
      const target = e.target as HTMLElement
      if (target && target.tagName === "INPUT" && target.id !== "sales-search-input") {
        return
      }
      if (productId || document.querySelector("dialog[open]")) return

      const now = Date.now()
      if (now - lastKeyTime > 120) {
        buffer = ""
      }
      lastKeyTime = now

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          const success = handleBarcodeScan(buffer)
          if (success) {
            e.preventDefault()
          }
        }
        buffer = ""
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [demo, draft.products, draft.items, productId])

  return <>
    <p role="status" className="sr-only">{message}</p>
    {scanNotice && (
      <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
            <ScanLine size={15} aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold text-emerald-950">¡Código escaneado! {scanNotice.barcode}</p>
            <p className="text-[11px] font-normal text-emerald-700">{scanNotice.name} agregado al carrito.</p>
          </div>
        </div>
        <button type="button" onClick={() => setScanNotice(null)} className="rounded p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Cerrar aviso">
          <X size={15} />
        </button>
      </div>
    )}
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <SalesCatalog demo={demo} categories={categories} products={filterSalesProducts(query, selectedCategory, draft.products)} cart={draft.items} query={query} category={selectedCategory} onQueryChange={setQuery} onCategoryChange={setCategory} onAdd={add} onDetails={showDetails} onBarcodeScan={demo ? handleBarcodeScan : undefined} />
      <SalesCart demo={demo} summary={draft.summary} discount={draft.discount} onDiscountChange={draft.setDiscount} onAction={draft.action} onClear={draft.clear} onCheckout={onSubmit} onDetails={showDetails} canClear={draft.items.length > 0} cartId={cartId} actionLabel={actionLabel} actionNote={actionNote} />
    </div>
    {product && <SalesProductDetails demo={demo} product={product} quantity={draft.items.find(item => item.productId === product.id)?.quantity ?? 0} onAdd={() => add(product)} onClose={() => setProductId(null)} />}
  </>
}
