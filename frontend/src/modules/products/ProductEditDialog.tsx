import { useRef, useState, type FormEvent } from "react"
import ProductDialog, { fieldClass, primaryButton, secondaryButton } from "./ProductDialog"
import type { CatalogListingProduct } from "./product-lookup"
import { updateProduct, validateProductChanges } from "./product-update"

type EditState = { kind: "idle" | "saving" } | { kind: "saved" | "error"; message: string }
const fields = [
  { key: "name", label: "Nombre", required: true },
  { key: "sku", label: "SKU", required: false },
  { key: "category", label: "Categoría", required: true },
  { key: "price", label: "Precio (S/)", required: true },
] as const

export default function ProductEditDialog({ product, userId, onClose, onSaved }: {
  product: CatalogListingProduct
  userId?: string
  onClose: () => void
  onSaved: (id: string) => Promise<void>
}) {
  const [state, setState] = useState<EditState>({ kind: "idle" })
  const inFlight = useRef(false)
  const saving = state.kind === "saving"
  const saved = state.kind === "saved"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId || inFlight.current || saved) return
    const validation = validateProductChanges(new FormData(event.currentTarget))
    if (!validation.ok) {
      setState({ kind: "error", message: validation.message })
      return
    }

    inFlight.current = true
    setState({ kind: "saving" })
    try {
      const result = await updateProduct(product.id, product.updatedAt, validation.changes, userId)
      if (!result.ok) {
        setState({ kind: "error", message: result.message })
        return
      }
      setState({ kind: "saved", message: "Cambios guardados." })
      try {
        await onSaved(result.id)
      } catch {
        setState({ kind: "saved", message: "Cambios guardados. No se pudo consultar la fila actualizada." })
      }
    } finally {
      inFlight.current = false
    }
  }

  return (
    <ProductDialog title="Editar producto" onClose={() => { if (!inFlight.current || saved) onClose() }}>
      <form onSubmit={event => void submit(event)} className="space-y-5">
        {!userId && !saved && <p role="status" className="text-sm text-zinc-600">La sesión no tiene permiso de edición confirmado.</p>}
        <fieldset disabled={saving || saved} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Código de barras</span>
            <input value={product.barcode} readOnly className={fieldClass} />
          </label>
          {fields.map(field => (
            <label key={field.key}>
              <span className="mb-1 block text-sm font-medium">{field.label}{field.required && " *"}</span>
              <input name={field.key} defaultValue={product[field.key] ?? ""} required={field.required}
                inputMode={field.key === "price" ? "decimal" : undefined} className={fieldClass} />
            </label>
          ))}
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Descripción</span>
            <textarea name="description" defaultValue={product.description ?? ""} rows={3} className={fieldClass} />
          </label>
        </fieldset>
        {saving && <p role="status" className="text-sm text-zinc-600">Guardando cambios…</p>}
        {"message" in state && <p role={saved ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${saved ? "bg-zinc-50" : "bg-rose-50 text-[#a71037]"}`}>{state.message}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className={secondaryButton}>{saved ? "Cerrar" : "Cancelar"}</button>
          {userId && !saved && <button type="submit" disabled={saving} className={`${primaryButton} disabled:opacity-50`}>Guardar cambios</button>}
        </div>
      </form>
    </ProductDialog>
  )
}
