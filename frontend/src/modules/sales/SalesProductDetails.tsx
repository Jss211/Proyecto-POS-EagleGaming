import { Plus } from "lucide-react"
import type { SalesProduct } from "./sales-product"
import { formatSalesMoney } from "./sales-model"
import SalesDialog from "./SalesDialog"

export default function SalesProductDetails({ demo = true, product, quantity, onAdd, onClose }: { demo?: boolean; product: SalesProduct; quantity: number; onAdd: () => void; onClose: () => void }) {
  const specifications = product.specifications ?? product.detail.split(" · ").filter(Boolean)
  return <SalesDialog title={product.name} onClose={onClose} footer={<><button type="button" onClick={onClose} className="sales-button sales-button-secondary">Cerrar</button><button type="button" disabled={quantity >= product.available} onClick={onAdd} className="sales-button sales-button-primary"><Plus size={16} aria-hidden="true" />{product.stockVerified === false ? "Stock no verificable" : !product.available ? "Sin disponibilidad" : quantity >= product.available ? "Límite alcanzado" : demo ? "Agregar al carrito DEMO" : "Agregar al carrito"}</button></>}>
    <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">{[{ label: "SKU", value: product.sku || "Sin SKU" }, { label: "Código de barras", value: product.barcode || "No especificado" }, { label: "Categoría", value: product.category }, { label: "Marca", value: product.brand ?? "No especificado" }, { label: "Estado del producto", value: product.status ?? "No especificado" }, { label: demo ? "Disponibilidad DEMO" : "Stock disponible", value: product.stockVerified === false ? "Stock no verificable: no se pudo leer el historial local." : `${product.available} disponibles${product.available === 0 ? " · Agotado" : ""} · ${quantity} en esta selección` }].map(row => <div key={row.label} className="min-w-0"><dt className="text-xs text-zinc-500">{row.label}</dt><dd className="mt-1 break-words font-medium">{row.value}</dd></div>)}</dl>
    <h4 className="mt-5 text-sm font-semibold">Descripción</h4><p className="mt-2 text-sm leading-6 text-zinc-500">{product.description ?? "No especificado"}</p>
    {demo && <><h4 className="mt-5 text-sm font-semibold">Especificaciones disponibles</h4>{specifications.length ? <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-zinc-500">{specifications.map((specification, index) => <li key={index}>{specification}</li>)}</ul> : <p className="mt-2 text-sm text-zinc-500">No especificado</p>}</>}
    <p className="mt-5 text-xs text-zinc-500">{demo ? "Precio de venta de ejemplo" : "Precio de venta"}</p><p className="mt-1 text-2xl font-bold text-[#cf1045]">{formatSalesMoney(product.priceCents)}</p><p className="mt-4 text-xs leading-6 text-zinc-500">{demo && "Datos del catálogo DEMO. "}Agregar un producto no reserva ni descuenta inventario.</p>
  </SalesDialog>
}
