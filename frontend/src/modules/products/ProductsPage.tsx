import { AlertTriangle, ArrowLeft, ArrowRight, ClipboardList, Eye, Package, PackageCheck, PackageSearch, Pencil, Plus, ScanLine, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { listenForHidBarcode } from "@/utils/hid-barcode"
import CatalogScan from "./CatalogScan"
import ProductPermissionCheck from "./ProductPermissionCheck"
import { fieldClass, primaryButton, secondaryButton } from "./ProductDialog"
import { ProductDetails, ProductForm, ProductScan } from "./ProductModals"
import { demoProducts, formatPrice, isLowStock, normalize, type Product, type ProductFields } from "./products-demo"

type Modal = { kind: "scan" | "demo-scan"; barcode?: string } | { kind: "details" | "edit"; product: Product } | { kind: "register" | "draft"; barcode?: string }
const pageSize = 6
const columnNames = ["Producto", "SKU", "Código de barras", "Categoría", "Precio", "Stock", "Estado", "Acciones"]

function ProductRow({ product, onDetails, onEdit }: { product: Product; onDetails: () => void; onEdit: () => void }) {
  const name = product.name || "Producto pendiente"
  const cells = [
    <div><p className="break-words font-semibold text-zinc-900">{name}</p>{product.description && <p className="mt-1 break-words text-xs text-zinc-600">{product.description}</p>}</div>,
    product.sku || "—",
    <span className="break-all tabular-nums">{product.barcode}</span>,
    product.category || "—",
    <span className="font-semibold tabular-nums">{formatPrice(product.price)}</span>,
    <span className={isLowStock(product) ? "font-semibold text-[#a71037]" : undefined}>{product.stock || "—"}{isLowStock(product) && <span className="block text-xs">Stock bajo</span>}</span>,
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === "Activo" ? "bg-zinc-900 text-white" : product.status === "Pendiente" ? "bg-rose-50 text-[#a71037]" : "bg-zinc-100 text-zinc-700"}`}>{product.status}</span>,
    <div className="flex flex-wrap gap-1">
      <button type="button" onClick={onDetails} aria-label={`Ver detalles de ${name}, ${product.barcode}`} title="Ver detalles" className={`${secondaryButton} w-11 px-0`}><Eye size={17} aria-hidden="true" /></button>
      <button type="button" onClick={onEdit} aria-label={`${product.status === "Pendiente" ? "Completar datos pendientes" : "Editar producto"} de ${name}, ${product.barcode}`} title={product.status === "Pendiente" ? "Completar datos pendientes" : "Editar producto"} className={product.status === "Pendiente" ? secondaryButton : `${secondaryButton} w-11 px-0`}>
        {product.status === "Pendiente" ? <><ClipboardList size={17} aria-hidden="true" />Completar</> : <Pencil size={17} aria-hidden="true" />}
      </button>
    </div>,
  ]

  return (
    <tr className="block rounded-xl border border-zinc-200 bg-white p-4 lg:table-row lg:rounded-none lg:border-x-0 lg:border-b-0 lg:p-0 lg:hover:bg-zinc-50">
      {cells.map((cell, index) => (
        <td key={columnNames[index]} className="grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-2 break-words py-2 align-top text-sm text-zinc-700 first:block first:border-b first:border-zinc-100 first:pb-3 lg:table-cell lg:px-3 lg:py-4 lg:first:table-cell lg:first:w-[22%] lg:first:border-0 lg:first:py-4">
          {index > 0 && <span aria-hidden="true" className="font-medium text-zinc-500 lg:hidden">{columnNames[index]}</span>}
          {cell}
        </td>
      ))}
    </tr>
  )
}

export default function ProductsPage({ permissionCheckEmail }: { permissionCheckEmail?: string }) {
  const [products, setProducts] = useState(demoProducts)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<Modal>()
  const [notice, setNotice] = useState("")

  useEffect(() => {
    if (modal) return
    return listenForHidBarcode(barcode => setModal({ kind: "scan", barcode }))
  }, [modal])

  const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"))
  const needle = normalize(query)
  const filtered = products.filter(product =>
    (!category || product.category === category) && (!status || product.status === status) &&
    [product.name, product.sku, product.barcode].some(value => normalize(value).includes(needle))
  )
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const offset = (currentPage - 1) * pageSize
  const indicators = [
    { label: "Total de productos", value: products.length, Icon: Package },
    { label: "Productos activos", value: products.filter(product => product.status === "Activo").length, Icon: PackageCheck },
    { label: "Productos con stock bajo", value: products.filter(isLowStock).length, Icon: AlertTriangle },
    { label: "Pendientes de completar", value: products.filter(product => product.status === "Pendiente").length, Icon: ClipboardList },
  ]
  const close = () => setModal(undefined)

  function clearFilters() {
    setQuery("")
    setCategory("")
    setStatus("")
    setPage(1)
  }

  function save(fields: ProductFields, existing?: Product) {
    if (/\s/.test(fields.barcode)) return "El código de barras no puede contener espacios internos."
    const others = products.filter(product => product.id !== existing?.id)
    if (others.some(product => normalize(product.barcode) === normalize(fields.barcode))) return "Ya existe un producto DEMO con ese código de barras."
    if (fields.sku && others.some(product => normalize(product.sku) === normalize(fields.sku))) return "Ya existe un producto DEMO con ese SKU."
    const product: Product = {
      ...fields,
      id: existing?.id ?? crypto.randomUUID(),
      minStock: existing?.minStock ?? 5,
      status: existing?.status === "Inactivo" ? "Inactivo" : "Activo",
    }
    setProducts(existing ? products.map(item => item.id === existing.id ? product : item) : [product, ...products])
    clearFilters()
    setNotice(existing ? `${product.name} se actualizó en el catálogo DEMO.` : `${product.name} se agregó al catálogo DEMO.`)
    close()
  }

  return (
    <div className="min-w-0 space-y-5 text-zinc-900">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-gaming text-2xl font-bold">Productos</h2>
          <p className="mt-1 text-sm text-zinc-600">Administra el catálogo, los precios y la disponibilidad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setModal({ kind: "scan" })} className={secondaryButton}><ScanLine size={18} aria-hidden="true" />Escanear código</button>
          <button type="button" onClick={() => setModal({ kind: "register" })} className={primaryButton}><Plus size={18} aria-hidden="true" />Registrar producto</button>
        </div>
      </header>
      <p className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-[#a71037]"><strong>Datos de demostración.</strong> Los cambios se reinician al salir del módulo o recargar la página.</p>
      {permissionCheckEmail && <ProductPermissionCheck key={permissionCheckEmail} email={permissionCheckEmail} />}
      {notice && <p role="status" className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">{notice}</p>}

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {indicators.map(({ label, value, Icon }) => (
          <div key={label} className="relative flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-[#cf1045]"><Icon size={19} aria-hidden="true" /></span>
            <div><dt className="text-xs font-medium text-zinc-600 sm:text-sm">{label}</dt><dd className="mt-1 font-gaming text-2xl font-bold tabular-nums">{value}</dd></div>
          </div>
        ))}
      </dl>

      <section aria-labelledby="products-catalog" className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-5">
        <h3 id="products-catalog" className="font-gaming text-lg font-bold">Catálogo de productos</h3>
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
          <label className="min-w-0 sm:col-span-2 2xl:col-span-1">
            <span className="mb-1 block text-sm font-medium">Buscar productos</span>
            <span className="relative block"><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-zinc-500" />
              <input type="search" className={`${fieldClass} pl-9`} placeholder="Nombre, SKU o código de barras" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} />
            </span>
          </label>
          <label className="min-w-0"><span className="mb-1 block text-sm font-medium">Categoría</span>
            <select className={fieldClass} value={category} onChange={event => { setCategory(event.target.value); setPage(1) }}>
              <option value="">Todas las categorías</option>
              {categories.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label><span className="mb-1 block text-sm font-medium">Estado</span>
            <select className={fieldClass} value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
              <option value="">Todos los estados</option><option>Activo</option><option>Inactivo</option><option>Pendiente</option>
            </select>
          </label>
          <button type="button" onClick={clearFilters} disabled={!query && !category && !status} className={secondaryButton}>Limpiar filtros</button>
        </div>
        <p role="status" className="my-4 text-sm text-zinc-600">{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</p>

        {filtered.length > 0 ? (
          <>
            <div className="min-w-0 lg:overflow-x-auto">
              <table aria-label="Productos del catálogo DEMO" className="block w-full lg:table lg:min-w-[800px]">
                <thead className="sr-only lg:not-sr-only lg:table-header-group">
                  <tr>{columnNames.map(name => <th key={name} scope="col" className="bg-zinc-50 px-3 py-3 text-left text-xs font-semibold text-zinc-600">{name}</th>)}</tr>
                </thead>
                <tbody className="grid gap-3 lg:table-row-group">
                  {filtered.slice(offset, offset + pageSize).map(product => (
                    <ProductRow key={product.id} product={product} onDetails={() => setModal({ kind: "details", product })} onEdit={() => setModal({ kind: "edit", product })} />
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label="Paginación de productos" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
              <p className="text-sm text-zinc-600">{offset + 1}–{Math.min(offset + pageSize, filtered.length)} de {filtered.length}</p>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Página anterior" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className={`${secondaryButton} w-11 px-0`}><ArrowLeft size={17} aria-hidden="true" /></button>
                <span className="text-sm tabular-nums">Página {currentPage} de {pages}</span>
                <button type="button" aria-label="Página siguiente" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pages} className={`${secondaryButton} w-11 px-0`}><ArrowRight size={17} aria-hidden="true" /></button>
              </div>
            </nav>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center">
            <PackageSearch size={32} aria-hidden="true" className="mx-auto text-zinc-500" />
            <p className="mt-3 font-semibold">{products.length ? "No encontramos productos" : "El catálogo está vacío"}</p>
            <p className="mt-1 text-sm text-zinc-600">{products.length ? "Prueba otro término o limpia los filtros." : "Registra un producto para comenzar."}</p>
          </div>
        )}
      </section>

      {modal?.kind === "scan" && <CatalogScan initialBarcode={modal.barcode} onClose={close} onDemo={() => setModal({ kind: "demo-scan" })} onNew={barcode => setModal({ kind: "draft", barcode })} />}
      {modal?.kind === "demo-scan" && <ProductScan products={products} onClose={close} onFound={product => setModal({ kind: "details", product })} onNew={barcode => setModal({ kind: "register", barcode })} />}
      {modal?.kind === "details" && <ProductDetails product={modal.product} onClose={close} />}
      {modal?.kind === "edit" && <ProductForm product={modal.product} onClose={close} onSave={fields => save(fields, modal.product)} />}
      {modal?.kind === "register" && <ProductForm barcode={modal.barcode} onClose={close} onSave={save} />}
      {modal?.kind === "draft" && <ProductForm mode="real" barcode={modal.barcode} onClose={close} />}
    </div>
  )
}
