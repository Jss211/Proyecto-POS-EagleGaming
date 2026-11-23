import { useEffect, useState } from "react"
import { readVisibleCatalog, type CatalogListingProduct } from "./product-lookup"

type CatalogState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; products: CatalogListingProduct[] }

export function isPendingProduct(product: CatalogListingProduct) {
  return !product.name?.trim() || !product.barcode.trim() || !product.category?.trim() ||
    product.price === null || !String(product.price).trim() ||
    !Number.isFinite(Number(product.price)) || Number(product.price) < 0
}

export function isRealStockLow(product: CatalogListingProduct) {
  return product.isActive === true && product.stock !== null && product.minStock !== null &&
    product.stock <= product.minStock
}

export function useRealProductCatalog(email: string | undefined, checkingPermission: boolean) {
  const [catalog, setCatalog] = useState<CatalogState>({ kind: "loading" })
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!email || checkingPermission) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort()
      setCatalog({ kind: "error", message: "La consulta del catálogo tardó demasiado. Inténtalo nuevamente." })
    }, 15000)

    setCatalog({ kind: "loading" })
    readVisibleCatalog(email, controller.signal)
      .then(products => {
        if (!controller.signal.aborted) setCatalog({ kind: "ready", products })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCatalog({ kind: "error", message: error instanceof Error ? error.message : "No se pudo cargar el catálogo de Supabase." })
        }
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [email, revision, checkingPermission])

  return {
    catalog: checkingPermission ? { kind: "loading" } as const : catalog,
    reload: () => {
      setCatalog({ kind: "loading" })
      setRevision(value => value + 1)
    },
  }
}
