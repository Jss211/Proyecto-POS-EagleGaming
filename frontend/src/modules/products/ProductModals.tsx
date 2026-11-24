import { useEffect, useState, type FormEvent } from "react"
import { ScanLine } from "lucide-react"
import ProductDialog, { fieldClass, primaryButton, secondaryButton } from "./ProductDialog"
import { emptyFields, formatPrice, normalize, productFields, type Product, type ProductFields } from "./products-demo"

function readProductFields(form: FormData) {
  return Object.fromEntries(productFields.map(({ key }) => [key, String(form.get(key) ?? "").trim()])) as ProductFields
}

export function ProductForm({ barcode = "", product, onClose, onSave }: {
  barcode?: string
  product?: Product
  onClose: () => void
  onSave: (fields: ProductFields) => string | undefined
}) {
  const [error, setError] = useState("")
  const initial = product ?? { ...emptyFields, barcode }
  const title = !product ? "Registrar producto" : product.status === "Pendiente" ? "Completar datos pendientes" : "Editar producto"

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = readProductFields(new FormData(event.currentTarget))
    if (productFields.some(field => "required" in field && !fields[field.key])) {
      setError("Completa los campos obligatorios.")
      return
    }
    fields.price = fields.price.replace(",", ".")
    fields.costPrice = fields.costPrice.replace(",", ".")
    if (![fields.price, fields.costPrice].every(value => /^\d{1,8}(\.\d{1,2})?$/.test(value))) {
      setError("Ingresa precio y costo con hasta ocho enteros y dos decimales.")
      return
    }
    if (!/^\d+$/.test(fields.stock) || Number(fields.stock) > 2147483647) {
      setError("Ingresa una cantidad entera de stock entre 0 y 2 147 483 647.")
      return
    }
    setError(onSave(fields) ?? "")
  }


  return (
    <ProductDialog title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-zinc-600">Los cambios DEMO se conservan mientras esta pantalla esté abierta.</p>
        <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2">
          {productFields.map(field => (
            <label key={field.key} className={field.key === "description" ? "sm:col-span-2" : undefined}>
              <span className="mb-1 block text-sm font-medium">{field.label}{"required" in field ? " *" : ""}</span>
              {field.key === "description"
                ? <textarea name={field.key} defaultValue={initial[field.key]} className={fieldClass} rows={3} />
                : <input name={field.key} defaultValue={initial[field.key]} className={fieldClass} required={"required" in field} inputMode={"mode" in field ? field.mode : undefined} />}
            </label>
          ))}
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-[#a71037]">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancelar</button>
          <button type="submit" className={primaryButton}>Guardar en DEMO</button>
        </div>
      </form>
    </ProductDialog>
  )
}

export function ProductDetails({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <ProductDialog title="Ver detalles" onClose={onClose}>
      <dl className="grid gap-4 sm:grid-cols-2">
        {productFields.map(({ key, label }) => (
          <div key={key} className={key === "description" ? "sm:col-span-2" : undefined}>
            <dt className="text-sm text-zinc-600">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words font-medium">
              {key === "price" || key === "costPrice" ? formatPrice(product[key]) : product[key] || "Sin completar"}
            </dd>
          </div>
        ))}
        <div><dt className="text-sm text-zinc-600">Estado</dt><dd className="mt-1 font-medium">{product.status}</dd></div>
      </dl>
    </ProductDialog>
  )
}

type ScanResult = { kind: "idle" | "error" } | { kind: "reading" | "new"; code: string } | { kind: "found"; product: Product }

export function ProductScan({ products, initialBarcode, onClose, onFound, onNew }: {
  products: Product[]
  initialBarcode?: string
  onClose: () => void
  onFound: (product: Product) => void
  onNew: (barcode: string) => void
}) {
  const [code, setCode] = useState(initialBarcode ?? "")
  const [result, setResult] = useState<ScanResult>(initialBarcode ? { kind: "reading", code: initialBarcode } : { kind: "idle" })

  useEffect(() => {
    if (result.kind !== "reading") return
    const timer = window.setTimeout(() => {
      const product = products.find(item => normalize(item.barcode) === normalize(result.code))
      setResult(product ? { kind: "found", product } : { kind: "new", code: result.code })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [products, result])

  return (
    <ProductDialog title="Escanear código" onClose={onClose}>
      <p className="mb-4 text-sm text-zinc-600">Escribe un código para consultarlo en el catálogo DEMO. Prueba con 2000000000101.</p>
      <form onSubmit={event => {
        event.preventDefault()
        const clean = code.trim()
        setResult(clean && !/\s/.test(clean) ? { kind: "reading", code: clean } : { kind: "error" })
      }} className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-sm font-medium">Código de barras</span>
          <input autoFocus className={fieldClass} value={code} onChange={event => { setCode(event.target.value); setResult({ kind: "idle" }) }} />
        </label>
        <button type="submit" className={primaryButton}><ScanLine size={17} aria-hidden="true" />Consultar código</button>
      </form>
      {result.kind === "error" && <p role="alert" className="mt-4 text-sm text-[#a71037]">Ingresa un código de barras sin espacios internos.</p>}
      <div aria-live="polite">
        {result.kind === "reading" && <p className="mt-4 text-sm text-zinc-600">Consultando el catálogo DEMO…</p>}
        {result.kind === "found" && (
          <div className="mt-4 rounded-xl bg-zinc-50 p-4">
            <p className="font-semibold">Producto encontrado</p>
            <p className="my-2 break-words text-sm">{result.product.name || result.product.barcode} · {result.product.status}</p>
            <button type="button" onClick={() => onFound(result.product)} className={secondaryButton}>Ver detalles</button>
          </div>
        )}
        {result.kind === "new" && (
          <div className="mt-4 rounded-xl bg-rose-50 p-4">
            <p className="font-semibold">Producto nuevo</p>
            <p className="my-2 break-words text-sm">El código {result.code} está disponible en el catálogo DEMO.</p>
            <button type="button" onClick={() => onNew(result.code)} className={secondaryButton}>Abrir formulario de registro</button>
          </div>
        )}
      </div>
    </ProductDialog>
  )
}

