import { useId } from "react"
import { Search, Plus, Eye, Cpu, MemoryStick, Keyboard, Mouse, Monitor, Headphones, HardDrive, CircuitBoard, PackageSearch } from "lucide-react"
import { salesDemoCategories, type DemoProduct, type ProductCategory } from "./sales-demo"
import { formatSalesMoney, type CartItem } from "./sales-model"

const productIcons = { "Tarjetas gráficas": CircuitBoard, Procesadores: Cpu, "Memorias RAM": MemoryStick, Teclados: Keyboard, Mouse, Monitores: Monitor, Audífonos: Headphones, Almacenamiento: HardDrive } satisfies Record<ProductCategory, typeof Cpu>

interface CatalogProps {
  products: DemoProduct[]
  cart: CartItem[]
  query: string
  category: string
  onQueryChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onAdd: (product: DemoProduct) => void
  onDetails: (product: DemoProduct) => void
}

export default function SalesCatalog({ products, cart, query, category, onQueryChange, onCategoryChange, onAdd, onDetails }: CatalogProps) {
  const id = useId()
  return <section aria-labelledby={`${id}-catalog`} className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h3 id={`${id}-catalog`} className="font-semibold text-zinc-900">Catálogo de productos</h3><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500">DEMO</span></div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
      <label className="block text-xs font-medium text-zinc-600" htmlFor={`${id}-search`}>Buscar producto
        <span className="relative mt-1 block"><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-zinc-400" /><input id={`${id}-search`} type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Nombre, SKU o código de barras" className="sales-input pl-9" /></span>
      </label>
      <label className="block text-xs font-medium text-zinc-600" htmlFor={`${id}-category`}>Categoría<select id={`${id}-category`} value={category} onChange={event => onCategoryChange(event.target.value)} className="sales-input mt-1"><option value="Todas">Todas las categorías</option>{salesDemoCategories.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <p role="status" className="my-4 text-xs text-zinc-500">{products.length} {products.length === 1 ? "producto encontrado" : "productos encontrados"} · Disponibilidad de ejemplo</p>
    {products.length ? <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">{products.map(product => {
      const Icon = productIcons[product.category]
      const quantity = cart.find(item => item.productId === product.id)?.quantity ?? 0
      const atLimit = quantity >= product.available
      return <li key={product.id} className="flex min-w-0 flex-col rounded-xl border border-zinc-200 p-4 transition-colors hover:border-rose-200 motion-reduce:transition-none">
        <div className="mb-4 flex items-center justify-between gap-2"><span className="inline-flex rounded-xl bg-zinc-50 p-3 text-zinc-700"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${product.available ? "bg-rose-50 text-[#cf1045]" : "bg-zinc-100 text-zinc-500"}`}>{product.stockVerified === false ? "Stock no verificable" : product.available ? `${product.available} disponibles` : "Agotado · 0 disponibles"}</span></div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#cf1045]">{product.category}</p><h4 className="mt-1 break-words text-sm font-semibold leading-6 text-zinc-900">{product.name}</h4><p className="mt-1 text-xs leading-5 text-zinc-500">{product.detail}</p>
        <p className="mt-2 break-all text-[10px] text-zinc-400">{product.sku} · {product.barcode}</p>
        <div className="mt-auto pt-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-1"><p className="text-lg font-bold tracking-tight text-zinc-900">{formatSalesMoney(product.priceCents)}</p>{quantity > 0 && <span className="text-[11px] text-zinc-500">{quantity} en carrito</span>}</div>
          <button type="button" disabled={atLimit} onClick={() => onAdd(product)} aria-label={`Agregar ${product.name} al carrito`} className="sales-button sales-button-secondary w-full"><Plus size={16} aria-hidden="true" />{product.stockVerified === false ? "Stock no verificable" : !product.available ? "Sin disponibilidad" : atLimit ? "Límite alcanzado" : "Agregar"}</button>
          <button type="button" onClick={() => onDetails(product)} aria-label={`Ver detalles de ${product.name}`} className="sales-button mt-1 w-full text-xs text-zinc-500 hover:text-[#cf1045]"><Eye size={16} aria-hidden="true" />Ver detalles</button>
        </div>
      </li>
    })}</ul> : <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center"><PackageSearch size={32} className="mx-auto text-zinc-400" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">No encontramos productos</p><p className="mt-2 text-xs text-zinc-500">Prueba otro nombre, SKU, código o categoría.</p><button type="button" className="sales-button sales-button-secondary mt-4" onClick={() => { onQueryChange(""); onCategoryChange("Todas") }}>Limpiar filtros</button></div>}
  </section>
}
