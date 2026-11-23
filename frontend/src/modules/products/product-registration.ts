import { supabase } from "@/lib/supabase"

export type BarcodeKind = "internal" | "gtin"

export type RegistrationFields = {
  name: string
  barcode: string
  sku: string
  category: string
  price: string
  costPrice: string
  description: string
}

export type RegisterProductRequest = {
  name: string
  barcode: string
  barcodeKind: BarcodeKind
  sku: string | null
  category: string
  price: string
  costPrice: string
  description: string | null
}

export type RegisterProductError =
  | { kind: "validation" | "duplicate" | "permission" | "session" | "connection" | "unexpected"; message: string }

export type RegisterProductResponse =
  | { ok: true; productId: string }
  | { ok: false; error: RegisterProductError }

export type RegistrationAccess = {
  save: (request: RegisterProductRequest) => Promise<RegisterProductResponse>
  refreshCatalog: (productId: string) => Promise<void>
}

export function canonicalGtin(barcode: string): string | null {
  if (!/^\d{12,13}$/.test(barcode)) return null

  const digits = [...barcode].map(Number)
  const checkDigit = digits.pop()
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - sum % 10) % 10 === checkDigit ? barcode.padStart(14, "0") : null
}

export function registrationBarcodeKey(barcode: string, kind: BarcodeKind): string | null {
  if (kind === "internal") return `internal:${barcode}`
  const gtin = canonicalGtin(barcode)
  return gtin ? `gtin:${gtin}` : null
}

export function validateRegistration(fields: RegistrationFields, barcodeKind: BarcodeKind) {
  const { name, barcode, sku, category, price, costPrice, description } = fields
  const invalid = (message: string) => ({ ok: false, error: { kind: "validation", message } } as const)
  if (!name.trim()) return invalid("Ingresa el nombre del producto.")
  if (!/^\S{1,128}$/.test(barcode)) return invalid("Ingresa un código de hasta 128 caracteres sin espacios internos.")
  if (sku && !/^\S{1,128}$/.test(sku)) return invalid("El SKU debe tener hasta 128 caracteres y no puede contener espacios internos.")
  if (!category.trim()) return invalid("Ingresa la categoría del producto.")
  if (!registrationBarcodeKey(barcode, barcodeKind)) return invalid("El GTIN debe ser un UPC-A o EAN-13 con dígito verificador válido.")
  if (barcodeKind === "internal" && canonicalGtin(barcode)) {
    return invalid("Este código tiene un dígito verificador UPC-A o EAN-13 válido. Regístralo como GTIN.")
  }

  const decimal = (value: string) => value.trim().replace(",", ".")
  if (![price, costPrice].every(value => /^\d{1,8}(\.\d{1,2})?$/.test(decimal(value)))) {
    return invalid("Ingresa precio y costo con hasta ocho enteros y dos decimales.")
  }

  const request: RegisterProductRequest = {
    name: name.trim(), barcode, barcodeKind, sku: sku || null, category: category.trim(),
    price: decimal(price), costPrice: decimal(costPrice), description: description.trim() || null,
  }
  return { ok: true, request } as const
}

type RegistrationRpc = (
  name: "register_product",
  args: { p_product: RegisterProductRequest },
) => PromiseLike<{ data: unknown; error: { code?: string } | null; status?: number }>

export function createProductRegistrationService(rpc: RegistrationRpc): RegistrationAccess["save"] {
  return async request => {
    try {
      const { data, error, status } = await rpc("register_product", { p_product: request })
      if (error?.code === "23505") {
        return { ok: false, error: { kind: "duplicate", message: "Ya existe un producto con ese código, su GTIN equivalente o ese SKU." } }
      }
      if (status === 401 || error?.code === "PGRST301" || error?.code === "PGRST303") return sessionError()
      if (status === 403 || error?.code === "42501") {
        return { ok: false, error: { kind: "permission", message: "Tu sesión no está autorizada para registrar productos." } }
      }
      if (status === 0 || (status !== undefined && status >= 500)) return connectionError()
      if (error?.code === "22023" || error?.code === "23514") {
        return { ok: false, error: { kind: "validation", message: "El servidor rechazó los datos. Revisa los campos del formulario." } }
      }
      const id = data && typeof data === "object" && "id" in data ? data.id : null
      if (!error && typeof id === "string" && id.trim()) return { ok: true, productId: id }
      return { ok: false, error: { kind: "unexpected", message: "El servidor no confirmó el registro del producto." } }
    } catch {
      return connectionError()
    }
  }
}

function sessionError(): Extract<RegisterProductResponse, { ok: false }> {
  return { ok: false, error: { kind: "session", message: "La sesión venció o cambió. Vuelve a iniciar sesión antes de guardar." } }
}

export async function registerProduct(request: RegisterProductRequest, userId: string): Promise<RegisterProductResponse> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error && (error.status === 0 || (error.status !== undefined && error.status >= 500))) return connectionError()
    if (error || session?.user.id !== userId) return sessionError()
    return createProductRegistrationService((name, args) => supabase.rpc(name, args)
      .setHeader("Authorization", `Bearer ${session.access_token}`)
      .abortSignal(AbortSignal.timeout(12000)))(request)
  } catch {
    return connectionError()
  }
}

export function connectionError(): Extract<RegisterProductResponse, { ok: false }> {
  return { ok: false, error: { kind: "connection", message: "No se pudo confirmar el guardado. Consulta el código antes de volver a enviar." } }
}
