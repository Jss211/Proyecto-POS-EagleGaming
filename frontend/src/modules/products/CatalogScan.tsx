import { ScanLine } from "lucide-react"
import { useEffect, useState } from "react"
import ProductDialog, { fieldClass, primaryButton } from "./ProductDialog"
import { lookupBarcode, type BarcodeResult, type CatalogProduct } from "./product-lookup"
import { formatPrice } from "./products-demo"

export function CatalogDetails({ product }: { product: CatalogProduct & { stock?: number | null; minStock?: number | null } }) {
  const fields = [
    ["Nombre", product.name],
    ["SKU", product.sku],
    ["Código de barras", product.barcode],
    ["Categoría", product.category],
    ["Precio", product.price === null ? null : formatPrice(String(product.price))],
    ...("stock" in product ? [["Stock", product.stock], ["Stock mínimo", product.minStock]] as const : []),
    ["Estado", product.isActive === null ? null : product.isActive ? "Activo" : "Inactivo"],
    ["Descripción", product.description],
  ] as const

  return (
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-zinc-600">{label}</dt>
          <dd className="break-words text-sm font-medium">{value === "" ? "—" : value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function CatalogScan({ initialBarcode, onClose, onNew }: {
  initialBarcode?: string
  onClose: () => void
  onNew: (barcode: string) => void
}) {
  const [code, setCode] = useState(initialBarcode ?? "")
  const [request, setRequest] = useState(initialBarcode ? { barcode: initialBarcode, fromHid: true } : undefined)
  const [result, setResult] = useState<BarcodeResult>()
  const checking = !!request && !result

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort()
      setResult({ kind: "error", message: "La consulta tardó demasiado. Intenta nuevamente." })
    }, 10000)

    lookupBarcode(request.barcode, controller.signal)
      .then(response => {
        if (!controller.signal.aborted) setResult(response)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ kind: "error", message: "No se pudo completar la consulta. Revisa tu conexión e inténtalo de nuevo." })
        }
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [request])

  useEffect(() => {
    if (result?.kind === "missing" && request) onNew(request.barcode)
  }, [result, request, onNew])

  return (
    <ProductDialog title="Escanear código" onClose={onClose}>
      <p className="mb-4 text-sm text-zinc-600">Lee un código con el escáner o escríbelo para buscarlo en Supabase.</p>
      <form onSubmit={event => {
        event.preventDefault()
        if (checking) return
        const barcode = code.trim()
        setResult(undefined)
        if (!/^\S{1,128}$/.test(barcode)) {
          setRequest(undefined)
          setResult({ kind: "error", message: "Ingresa un código de hasta 128 caracteres sin espacios internos." })
          return
        }
        setRequest({ barcode, fromHid: false })
      }} className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-sm font-medium">Código de barras</span>
          <input autoFocus autoComplete="off" className={fieldClass} value={code} onChange={event => {
            setCode(event.target.value)
            setRequest(undefined)
            setResult(undefined)
          }} />
        </label>
        <button type="submit" disabled={checking} className={`${primaryButton} disabled:opacity-50`}><ScanLine size={17} aria-hidden="true" />Consultar código</button>
      </form>

      {checking && <p role="status" className="mt-4 text-sm text-zinc-600">{request.fromHid ? "Código leído. " : ""}Consultando Supabase…</p>}
      {result?.kind === "error" && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-[#a71037]">{result.message}</p>}
      {result?.kind === "found" && (
        <div className="mt-4 rounded-xl bg-zinc-50 p-4">
          <p role="status" className="font-semibold">Producto encontrado en Supabase</p>
          <CatalogDetails product={result.product} />
        </div>
      )}
    </ProductDialog>
  )
}
