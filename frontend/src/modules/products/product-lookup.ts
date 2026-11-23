import { supabase } from "@/lib/supabase"

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

export type BarcodeResult =
  | { kind: "found"; product: CatalogProduct }
  | { kind: "missing" }
  | { kind: "error"; message: string }

export async function lookupBarcode(barcode: string, signal: AbortSignal): Promise<BarcodeResult> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (signal.aborted) throw signal.reason
  if (sessionError) {
    return { kind: "error", message: "No se pudo verificar la sesión. Revisa tu conexión e inténtalo de nuevo." }
  }
  if (!session) {
    return { kind: "error", message: "Inicia sesión para consultar el catálogo en Supabase." }
  }

  // Keep the value intact. In particular, leading zeros and letter case matter.
  const { data, error, status } = await supabase.from("products")
    .select("id,barcode,sku,name,description,category,price,isActive")
    .eq("barcode", barcode)
    .abortSignal(signal)
    .maybeSingle<CatalogProduct>()

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
