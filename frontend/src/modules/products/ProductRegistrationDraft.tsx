import { useId, useState, type FormEvent } from "react"
import ProductDialog, { fieldClass, primaryButton, secondaryButton } from "./ProductDialog"
import { canonicalGtin, validateRegistrationDraft } from "./product-registration"

const pcCategories = ["PC Gamer", "PC de Oficina", "PC de Ingeniería"]
const otherCategories = ["Monitores", "Procesadores", "Tarjetas gráficas", "Teclados", "Mouse", "Memorias RAM", "Almacenamiento", "Accesorios"]

export default function ProductRegistrationDraft({ barcode, onClose }: { barcode: string; onClose: () => void }) {
  const [group, setGroup] = useState("")
  const [subcategory, setSubcategory] = useState("")
  const [feedback, setFeedback] = useState<{ valid: boolean; message: string }>()
  const saveNote = useId()

  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (name: string) => String(form.get(name) ?? "").trim()
    const barcodeKind = value("barcodeKind")
    if (barcodeKind !== "gtin" && barcodeKind !== "internal") return
    const category = group === "other" ? subcategory === "custom" ? value("customCategory") : subcategory : group
    const result = validateRegistrationDraft({
      name: value("name"), barcode,
      sku: value("sku"), category, price: value("price"), description: value("description"),
    }, barcodeKind)
    setFeedback({ valid: result.ok, message: result.ok ? "Los datos pasaron la validación local." : result.error.message })
  }

  return <ProductDialog title="Agregar producto" onClose={onClose}>
    <form onSubmit={validate} onChange={() => setFeedback(undefined)} className="space-y-5">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium">Nombre *</span>
          <input name="name" required className={fieldClass} />
        </label>
        <label><span className="mb-1 block text-sm font-medium">Código de barras *</span>
          <input name="barcode" value={barcode} readOnly className={fieldClass} />
        </label>
        <label><span className="mb-1 block text-sm font-medium">Tipo de código *</span>
          <select name="barcodeKind" required defaultValue={canonicalGtin(barcode) ? "gtin" : ""} className={fieldClass}>
            <option value="" disabled>Selecciona el tipo de código</option>
            <option value="gtin">GTIN (UPC-A o EAN-13)</option>
            <option value="internal">Código interno</option>
          </select>
        </label>
        <label><span className="mb-1 block text-sm font-medium">Categoría *</span>
          <select value={group} required className={fieldClass} onChange={event => { setGroup(event.target.value); setSubcategory("") }}>
            <option value="" disabled>Selecciona una categoría</option>
            {pcCategories.map(category => <option key={category}>{category}</option>)}
            <option value="other">Otros productos</option>
          </select>
        </label>
        {group === "other" && <label><span className="mb-1 block text-sm font-medium">Tipo de producto *</span>
          <select value={subcategory} required className={fieldClass} onChange={event => setSubcategory(event.target.value)}>
            <option value="" disabled>Selecciona un tipo</option>
            {otherCategories.map(category => <option key={category}>{category}</option>)}
            <option value="custom">Otra categoría</option>
          </select>
        </label>}
        {group === "other" && subcategory === "custom" && <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Nombre de la categoría *</span>
          <input name="customCategory" required className={fieldClass} />
        </label>}
        <label><span className="mb-1 block text-sm font-medium">SKU</span>
          <input name="sku" maxLength={128} className={fieldClass} />
        </label>
        <label><span className="mb-1 block text-sm font-medium">Precio de venta (S/) *</span>
          <input name="price" required inputMode="decimal" className={fieldClass} />
        </label>
        <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium">Descripción</span>
          <textarea name="description" rows={3} className={fieldClass} />
        </label>
      </div>
      <p id={saveNote} className="rounded-lg bg-rose-50 p-3 text-sm text-[#a71037]">El guardado está deshabilitado. Supabase requiere un costo real y aún falta un flujo autorizado para completarlo.</p>
      {feedback && <p role={feedback.valid ? "status" : "alert"} className="rounded-lg bg-zinc-50 p-3 text-sm">{feedback.message}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
        <button type="submit" className={secondaryButton}>Validar datos</button>
        <button type="button" disabled aria-describedby={saveNote} className={`${primaryButton} disabled:opacity-50`}>Guardar producto</button>
      </div>
    </form>
  </ProductDialog>
}
