import { useRef, useState } from "react"
import ProductDialog, { primaryButton, secondaryButton } from "./ProductDialog"
import type { CatalogListingProduct } from "./product-lookup"
import { setProductActive } from "./product-status"

type StatusState = { kind: "idle" | "saving" } | { kind: "error" | "saved"; message: string }

export default function ProductStatusDialog({ product, userId, onClose, onSaved }: {
  product: CatalogListingProduct
  userId?: string
  onClose: () => void
  onSaved: (id: string) => Promise<void>
}) {
  const [state, setState] = useState<StatusState>({ kind: "idle" })
  const inFlight = useRef(false)
  const active = product.isActive !== true
  const action = active ? "Activar" : "Desactivar"
  const saved = state.kind === "saved"
  const saving = state.kind === "saving"

  async function confirm() {
    if (!userId || inFlight.current || saved) return
    inFlight.current = true
    setState({ kind: "saving" })
    try {
      const result = await setProductActive(product.id, product.updatedAt, active, userId)
      if (!result.ok) {
        setState({ kind: "error", message: result.message })
        return
      }
      const message = result.active ? "Producto activado." : "Producto desactivado."
      setState({ kind: "saved", message })
      try {
        await onSaved(result.id)
      } catch {
        setState({ kind: "saved", message: `${message} No se pudo consultar la fila actualizada.` })
      }
    } finally {
      inFlight.current = false
    }
  }

  return (
    <ProductDialog title={`${action} producto`} onClose={() => { if (!inFlight.current || saved) onClose() }}>
      <div className="space-y-4">
        <p className="break-words text-sm font-semibold">{product.name || product.barcode}</p>
        {!saved && <p className="text-sm text-zinc-600">
          {active
            ? "El producto quedará activo con el stock actual. Para venderlo deberá tener unidades disponibles."
            : "El producto quedará inactivo. Se conservarán sus existencias y movimientos."}
        </p>}
        {!userId && !saved && <p role="status" className="text-sm text-zinc-600">La sesión no tiene permiso confirmado para cambiar el estado.</p>}
        {saving && <p role="status" className="text-sm text-zinc-600">Guardando estado…</p>}
        {"message" in state && <p role={saved ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${saved ? "bg-zinc-50" : "bg-rose-50 text-[#a71037]"}`}>{state.message}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className={secondaryButton}>{saved ? "Cerrar" : "Cancelar"}</button>
          {userId && !saved && <button type="button" disabled={saving} onClick={() => void confirm()} className={`${primaryButton} disabled:opacity-50`}>
            {action} producto
          </button>}
        </div>
      </div>
    </ProductDialog>
  )
}
