import { Plus } from "lucide-react"
import type { DemoProduct } from "./sales-demo"
import { formatSalesMoney } from "./sales-model"
import SalesDialog from "./SalesDialog"

export default function SalesProductDetails({ product, quantity, onAdd, onClose }: { product: DemoProduct; quantity: number; onAdd: () => void; onClose: () => void }) {
  const specifications = product.specifications ?? product.detail.split(" · ").filter(Boolean)
  return <SalesDialog title={product.name} onClose={onClose} footer={<><button type="button" onClick={onClose} className="sales-button sales-button-secondary">Cerrar</button><button type="button" disabled={quantity >= product.available} onClick={onAdd} className="sales-button sales-button-primary"><Plus size={16} aria-hidden="true" />{product.stockVerified === false ? "Stock no verificable" : !product.available ? "Sin disponibilidad" : quantity >= product.available ? "Límite alcanzado" : "Agregar al carrito DEMO"}</button></>}>
    <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">{[{ label: "SKU", value: product.sku }, { label: "Código de barras", value: product.barcode || "No especificado" }, { label: "Categoría", value: product.category }, { label: "Marca", value: product.brand ?? "No especificado" }, { label: "Estado del producto", value: product.status ?? "No especificado" }, { label: "Disponibilidad DEMO", value: product.stockVerified === false ? "Stock no verificable: no se pudo leer el historial local." : `${product.available} disponibles${product.available === 0 ? " · Agotado" : ""} · ${quantity} en esta selección` }].map(row => <div key={row.label} className="min-w-0"><dt className="text-xs text-zinc-500">{row.label}</dt><dd className="mt-1 break-words font-medium">{row.value}</dd></div>)}</dl>
    <h4 className="mt-5 text-sm font-semibold">Descripción</h4><p className="mt-2 text-sm leading-6 text-zinc-500">{product.description ?? "No especificado"}</p>
    <h4 className="mt-5 text-sm font-semibold">Especificaciones disponibles</h4>{specifications.length ? <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-zinc-500">{specifications.map((specification, index) => <li key={index}>{specification}</li>)}</ul> : <p className="mt-2 text-sm text-zinc-500">No especificado</p>}
    <p className="mt-5 text-xs text-zinc-500">Precio de venta de ejemplo</p><p className="mt-1 text-2xl font-bold text-[#cf1045]">{formatSalesMoney(product.priceCents)}</p><p className="mt-4 text-xs leading-6 text-zinc-500">Datos del catálogo DEMO. Agregar un producto no reserva ni descuenta inventario real.</p>
  </SalesDialog>
}
