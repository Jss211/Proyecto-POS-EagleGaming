import { useEffect, useRef, useState, type FormEvent } from "react"
import { ScanLine } from "lucide-react"
import ProductDialog, { fieldClass, primaryButton, secondaryButton } from "../products/ProductDialog"
import { lookupBarcode, type CatalogListingProduct } from "../products/product-lookup"
import { parseEntryQuantity, recordInventoryEntry, type InventoryEntry, type InventoryMovement } from "./inventory-service"

export default function InventoryEntryDialog({ products, userId, initialBarcode, onClose, onRecorded }: {
  products: CatalogListingProduct[]
  userId?: string
  initialBarcode?: string
  onClose: () => void
  onRecorded: (movement: InventoryMovement) => void
}) {
  const [barcode, setBarcode] = useState(initialBarcode ?? "")
  const [lookup, setLookup] = useState(initialBarcode ? { code: initialBarcode } : undefined)
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [entry, setEntry] = useState<InventoryEntry>()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState<{ stock: number; replayed: boolean }>()
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  const product = products.find(item => item.id === productId)

  useEffect(() => {
    if (!lookup) return
    const controller = new AbortController()
    const timeout = AbortSignal.timeout(10000)
    lookupBarcode(lookup.code, AbortSignal.any([controller.signal, timeout]))
      .then(result => {
        if (controller.signal.aborted) return
        if (result.kind === "found") setProductId(result.product.id)
        else setError(result.kind === "error" ? result.message : "No hay un producto visible con ese código.")
      })
      .catch(() => { if (!controller.signal.aborted) setError("No se pudo consultar el código.") })
      .finally(() => { if (!controller.signal.aborted) setLookup(undefined) })
    return () => controller.abort()
  }, [lookup])

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = parseEntryQuantity(quantity.trim())
    if (!product || amount === null || !reason.trim()) {
      setError("Elige un producto e indica una cantidad entera positiva y un motivo.")
      return
    }
    setError("")
    setEntry({ productId: product.id, quantity: amount, reason: reason.trim(), notes: notes.trim() })
  }

  async function confirm() {
    if (!userId || !entry || !product || inFlight.current || saved) return
    inFlight.current = true
    setSaving(true)
    setError("")
    try {
      const result = await recordInventoryEntry(entry, userId)
      if (!result.ok) setError(result.message)
      else {
        setSaved({ stock: result.stock, replayed: result.replayed })
        onRecorded(result.movement)
      }
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <ProductDialog title="Registrar entrada" onClose={() => { if (!inFlight.current) onClose() }}>
      <div className="space-y-4">
        {saved ? <p role="status" className="rounded-lg bg-zinc-50 p-3 text-sm">
          {saved.replayed ? "La entrada ya estaba registrada." : "Entrada registrada."} Stock después del movimiento: {saved.stock}.
        </p> : entry ? <>
          <dl className="grid gap-3 rounded-xl border border-zinc-200 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-zinc-600">Producto</dt><dd className="font-semibold">{product?.name ?? product?.barcode ?? "Producto ya no visible"}</dd></div>
            <div><dt className="text-zinc-600">Cantidad</dt><dd className="font-semibold">{entry.quantity}</dd></div>
            <div><dt className="text-zinc-600">Motivo</dt><dd className="break-words">{entry.reason}</dd></div>
            {entry.notes && <div><dt className="text-zinc-600">Observaciones</dt><dd className="break-words">{entry.notes}</dd></div>}
          </dl>
          <p className="text-sm text-zinc-600">Confirma la entrada para registrar el movimiento e incrementar el stock.</p>
          {saving && <p role="status" className="text-sm">Registrando entrada…</p>}
          {!userId && <p role="status" className="text-sm">Tu sesión ya no tiene permiso confirmado.</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={secondaryButton} disabled={saving} onClick={() => { setEntry(undefined); setError("") }}>Volver</button>
            <button type="button" className={`${primaryButton} disabled:opacity-50`} disabled={saving || !userId || !product} onClick={() => void confirm()}>Confirmar entrada</button>
          </div>
        </> : <>
          <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
            event.preventDefault()
            if (!/^\S{1,128}$/.test(barcode.trim())) {
              setError("Ingresa un código de barras válido.")
              return
            }
            setError("")
            setProductId("")
            setLookup({ code: barcode.trim() })
          }}>
            <label className="min-w-0 flex-1"><span className="mb-1 block text-sm font-medium">Código de barras</span>
              <input autoFocus className={fieldClass} value={barcode} autoComplete="off" onChange={event => { setBarcode(event.target.value); setLookup(undefined); setError("") }} />
            </label>
            <button type="submit" disabled={!!lookup} className={secondaryButton}><ScanLine size={16} aria-hidden="true" />{lookup ? "Consultando…" : "Buscar código"}</button>
          </form>
          <form onSubmit={review} className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 sm:col-span-2"><span className="mb-1 block text-sm font-medium">Producto</span>
              <select className={fieldClass} value={productId} onChange={event => { setProductId(event.target.value); setLookup(undefined); setError("") }} required>
                <option value="">Selecciona un producto</option>
                {products.map(item => <option key={item.id} value={item.id}>{item.name || item.barcode} · {item.sku || item.barcode}</option>)}
              </select>
              {product && <span className="mt-1 block text-sm text-zinc-600">{product.barcode} · Stock actual: {product.stock ?? "—"}</span>}
            </label>
            <label><span className="mb-1 block text-sm font-medium">Cantidad ingresada</span>
              <input required inputMode="numeric" className={fieldClass} value={quantity} onChange={event => setQuantity(event.target.value)} />
            </label>
            <label><span className="mb-1 block text-sm font-medium">Motivo de entrada</span>
              <input required maxLength={200} className={fieldClass} value={reason} onChange={event => setReason(event.target.value)} />
            </label>
            <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium">Observaciones (opcional)</span>
              <textarea rows={3} maxLength={1000} className={fieldClass} value={notes} onChange={event => setNotes(event.target.value)} />
            </label>
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" disabled={!!lookup || !userId} className={`${primaryButton} disabled:opacity-50`}>Revisar entrada</button>
            </div>
          </form>
        </>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-[#a71037]">{error}</p>}
      </div>
    </ProductDialog>
  )
}
