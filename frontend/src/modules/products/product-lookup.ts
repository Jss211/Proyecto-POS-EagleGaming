import { supabase } from "@/lib/supabase"
import { sessionIdentity } from "@/lib/session-identity"
import { canonicalGtin } from "./product-registration"

export type CatalogProduct = {
  id: string
  barcode: string
  sku: string | null
  name: string | null
  description: string | null
  category: string | null
  price: number | string | null
  isActive: boolean | null
}

export type StockCatalogProduct = CatalogProduct & { stock: number | null }

export type BarcodeResult =
  | { kind: "found"; product: StockCatalogProduct }
  | { kind: "missing" }
  | { kind: "error"; message: string }

export type CatalogListingProduct = StockCatalogProduct & {
  minStock: number | null
  createdAt: string
  updatedAt: string
}
const scanColumns = "id,barcode,sku,name,description,category,price,isActive"
const catalogColumns = `${scanColumns},stock,minStock,createdAt,updatedAt`
const catalogBatchSize = 200

export async function readCatalogProduct(id: string): Promise<CatalogListingProduct> {
  const { data, error } = await supabase.from("products").select(catalogColumns)
    .eq("id", id).abortSignal(AbortSignal.timeout(10000)).maybeSingle<CatalogListingProduct>()
  if (error || !data) throw new Error("No se pudo leer el producto registrado.")
  return data
}

export async function readVisibleCatalog(email: string, signal: AbortSignal, forSales = false, expectedSession?: string) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  signal.throwIfAborted()
  if (sessionError) throw new Error("No se pudo comprobar la sesión. Revisa tu conexión e inténtalo de nuevo.")
  if (!session || (session.user.email ?? "Correo no disponible") !== email ||
      (expectedSession !== undefined && sessionIdentity(session) !== expectedSession)) {
    throw new Error("Inicia sesión de nuevo para consultar el catálogo de Supabase.")
  }

  const products: CatalogListingProduct[] = []
  let cursor: string | undefined

  // Continue to the end of the visible rows, even if the API caps a batch.
  while (true) {
    signal.throwIfAborted()
    const query = supabase.schema("public").from("products").select(catalogColumns).order("id").limit(catalogBatchSize)
      .setHeader("Authorization", `Bearer ${session.access_token}`)
    const visible = forSales ? query.eq("isActive", true).gt("stock", 0) : query
    const { data, error, status } = await (cursor === undefined ? visible : visible.gt("id", cursor))
      .abortSignal(signal).overrideTypes<CatalogListingProduct[]>()

    if (error) {
      if (status === 401 || status === 403 || error.code === "42501") {
        throw new Error("La sesión no está autorizada para consultar el catálogo. Revisa tus permisos o inicia sesión de nuevo.")
      }
      if (status === 0 || status >= 500) throw new Error("No se pudo conectar con el catálogo de Supabase.")
      throw new Error("No se pudo cargar el catálogo de Supabase.")
    }
    if (!data.length) return products.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    cursor = data[data.length - 1].id
    products.push(...data)
  }
}

export async function lookupBarcode(barcode: string, signal: AbortSignal, expectedSession?: string): Promise<BarcodeResult> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (signal.aborted) throw signal.reason
  if (sessionError) {
    return { kind: "error", message: "No se pudo verificar la sesión. Revisa tu conexión e inténtalo de nuevo." }
  }
  if (!session || (expectedSession !== undefined && sessionIdentity(session) !== expectedSession)) {
    return { kind: "error", message: "Inicia sesión para consultar el catálogo en Supabase." }
  }

  const gtin = canonicalGtin(barcode)
  const equivalent = gtin && (barcode.length === 12 ? `0${barcode}` : barcode.startsWith("0") ? barcode.slice(1) : null)
  const query = supabase.schema("public").from("products").select(`${scanColumns},stock`)
    .setHeader("Authorization", `Bearer ${session.access_token}`)
  const { data, error, status } = await (equivalent
    ? query.in("barcode", [barcode, equivalent])
    : query.eq("barcode", barcode))
    .abortSignal(signal)
    .maybeSingle<StockCatalogProduct>()

  if (error) {
    if (status === 401 || status === 403 || error.code === "42501") {
      return { kind: "error", message: "La sesión no tiene permiso para consultar el catálogo." }
    }
    if (status === 0 || status >= 500) {
      return { kind: "error", message: "No se pudo conectar con el catálogo. Intenta nuevamente." }
    }
    return { kind: "error", message: "Supabase no pudo completar la consulta del código." }
  }

  return data ? { kind: "found", product: data } : { kind: "missing" }
}
