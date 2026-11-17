import { useState } from "react"
import SalesCatalog from "./SalesCatalog"
import SalesCart from "./SalesCart"
import SalesProductDetails from "./SalesProductDetails"
import { filterSalesProducts } from "./sales-model"
import type { DemoProduct } from "./sales-demo"
import type useSalesCart from "./useSalesCart"

export default function SalesWorkspace({ draft, onSubmit, cartId, actionLabel, actionNote }: { draft: ReturnType<typeof useSalesCart>; onSubmit: () => void; cartId?: string; actionLabel?: string; actionNote?: string }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Todas")
  const [productId, setProductId] = useState<string | null>(null)
  const product = draft.products.find(product => product.id === productId)
  const showDetails = (product: DemoProduct) => setProductId(product.id)
  const [message, setMessage] = useState("")
  const add = (product: DemoProduct) => {
    const quantity = draft.items.find(item => item.productId === product.id)?.quantity ?? 0
    if (quantity >= product.available) return
    draft.action({ type: "add", productId: product.id })
    setMessage(`${product.name}: ${quantity + 1} unidades en la selección DEMO.`)
  }
  return <>
    <p role="status" className="sr-only">{message}</p>
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <SalesCatalog products={filterSalesProducts(query, category, draft.products)} cart={draft.items} query={query} category={category} onQueryChange={setQuery} onCategoryChange={setCategory} onAdd={add} onDetails={showDetails} />
      <SalesCart summary={draft.summary} discount={draft.discount} onDiscountChange={draft.setDiscount} onAction={draft.action} onClear={draft.clear} onCheckout={onSubmit} onDetails={showDetails} canClear={draft.items.length > 0} cartId={cartId} actionLabel={actionLabel} actionNote={actionNote} />
    </div>
    {product && <SalesProductDetails product={product} quantity={draft.items.find(item => item.productId === product.id)?.quantity ?? 0} onAdd={() => add(product)} onClose={() => setProductId(null)} />}
  </>
}
