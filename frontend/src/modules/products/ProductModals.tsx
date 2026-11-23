import { useEffect, useRef, useState, type FormEvent } from "react"
import { ScanLine } from "lucide-react"
import ProductDialog, { fieldClass, primaryButton, secondaryButton } from "./ProductDialog"
import { emptyFields, formatPrice, normalize, productFields, type Product, type ProductFields } from "./products-demo"
import { canonicalGtin, connectionError, validateRegistration, type RegistrationAccess } from "./product-registration"

type RegistrationState = { kind: "idle" | "validating" | "saving" } |
  { kind: "valid" | "saved" | "error" | "duplicate"; message: string }

type ProductFormProps = {
  barcode?: string
  onClose: () => void
} & ({
  mode?: "demo"
  product?: Product
  onSave: (fields: ProductFields) => string | undefined
} | {
  mode: "real"
  access?: RegistrationAccess
})

function readProductFields(form: FormData) {
  return Object.fromEntries(productFields.map(({ key }) => [key, String(form.get(key) ?? "").trim()])) as ProductFields
}

export function ProductForm(props: ProductFormProps) {
  const { barcode = "", onClose } = props
  const real = props.mode === "real"
  const product = real ? undefined : props.product
  const access = real ? props.access : undefined
  const [state, setState] = useState<RegistrationState>({ kind: "idle" })
  const inFlight = useRef(false)
  const [error, setError] = useState("")
  const initial = product ?? { ...emptyFields, barcode }
  const title = !product ? "Registrar producto" : product.status === "Pendiente" ? "Completar datos pendientes" : "Editar producto"
  const fieldsToShow = real ? productFields.filter(field => field.key !== "stock") : productFields
  const busy = state.kind === "validating" || state.kind === "saving"

  async function register(formElement: HTMLFormElement, dryRun: boolean) {
    if ((!dryRun && !access) || inFlight.current || state.kind === "saved") return
    inFlight.current = true
    setState({ kind: "validating" })
    try {
      const form = new FormData(formElement)
      const barcodeKind = form.get("barcodeKind")
      if (barcodeKind !== "gtin" && barcodeKind !== "internal") {
        setState({ kind: "error", message: "Selecciona el tipo de código." })
        return
      }
      const validation = validateRegistration(readProductFields(form), barcodeKind)
      if (!validation.ok) {
        setState({ kind: "error", message: validation.error.message })
        return
      }
      if (dryRun || !access) {
        setState({ kind: "valid", message: "Los datos pasaron la validación local." })
        return
      }
      setState({ kind: "saving" })
      const result = await access.save(validation.request)
      if (!result.ok) {
        setState({ kind: result.error.kind === "duplicate" ? "duplicate" : "error", message: result.error.message })
        return
      }
      setState({ kind: "saved", message: "Producto guardado." })
      try {
        await access.refreshCatalog(result.productId)
      } catch {
        setState({ kind: "saved", message: "Producto guardado. No se pudo actualizar el catálogo." })
      }
    } catch {
      setState({ kind: "error", message: connectionError().error.message })
    } finally {
      inFlight.current = false
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (props.mode === "real") {
      void register(event.currentTarget, false)
      return
    }
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
    setError(props.onSave(fields) ?? "")
  }

  return (
    <ProductDialog title={real ? "Registrar producto en Supabase" : title}
      onClose={() => { if (!inFlight.current || state.kind === "saved") onClose() }}>
      <form onSubmit={submit} onChange={() => { if (real && !inFlight.current && state.kind !== "saved") setState({ kind: "idle" }) }} className="space-y-5">
        {real && <p role="status" className="rounded-lg bg-rose-50 p-3 text-sm text-[#a71037]">Supabase no devolvió un producto visible con ese código. La consulta solo incluye registros que tu sesión puede ver.</p>}
        {!real && <p className="text-sm text-zinc-600">Los cambios DEMO se conservan mientras esta pantalla esté abierta.</p>}
        {real && !access && <p className="text-sm text-zinc-600">Puedes completar y validar los datos. El guardado real está deshabilitado.</p>}
        <fieldset disabled={busy || state.kind === "saved"} className="grid min-w-0 gap-4 sm:grid-cols-2">
          {fieldsToShow.map(field => (
            <label key={field.key} className={field.key === "description" ? "sm:col-span-2" : undefined}>
              <span className="mb-1 block text-sm font-medium">{field.label}{"required" in field ? " *" : ""}</span>
              {field.key === "description"
                ? <textarea name={field.key} defaultValue={initial[field.key]} className={fieldClass} rows={3} />
                : <input name={field.key} defaultValue={initial[field.key]} className={fieldClass} required={"required" in field} readOnly={real && field.key === "barcode"} inputMode={"mode" in field ? field.mode : undefined} />}
            </label>
          ))}
          {real && <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Tipo de código</span>
            <select name="barcodeKind" className={fieldClass} defaultValue={canonicalGtin(barcode) ? "gtin" : ""}>
              <option value="" disabled>Selecciona el tipo de código</option>
              <option value="internal">Código interno</option>
              <option value="gtin">GTIN confirmado (UPC-A o EAN-13)</option>
            </select>
          </label>}
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-[#a71037]">{error}</p>}
        {busy && <p role="status" className="text-sm text-zinc-600">{state.kind === "validating" ? "Validando datos…" : "Guardando producto…"}</p>}
        {"message" in state && <p role={state.kind === "error" || state.kind === "duplicate" ? "alert" : "status"} className="rounded-lg bg-zinc-50 p-3 text-sm">{state.message}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={secondaryButton}>{state.kind === "saved" ? "Cerrar" : "Cancelar"}</button>
          {real && <button type="button" disabled={busy || state.kind === "saved"} onClick={event => {
            if (event.currentTarget.form) void register(event.currentTarget.form, true)
          }} className={secondaryButton}>Validar datos</button>}
          <button type="submit" disabled={real && (!access || busy || state.kind === "saved")} className={`${primaryButton} disabled:opacity-50`}>{real ? "Guardar producto" : "Guardar en DEMO"}</button>
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

