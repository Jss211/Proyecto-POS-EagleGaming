import { useCallback, useEffect, useState } from "react"
import { commitDemoStore, demoStorageKey, emptyDemoStore, loadDemoStore, type OperationResult, type StoreChange } from "./sales-storage"
import type { DemoStore } from "./sales-records"

const storageError = (error: unknown) => error instanceof Error && error.message && error.name !== "QuotaExceededError" && error.name !== "SecurityError" ? error.message : "No se pudo acceder al almacenamiento local. Comprueba los permisos y el espacio del navegador; la operación no se confirmó."

export default function useDemoRecords() {
  const [state, setState] = useState(() => {
    try { return { data: loadDemoStore(), loaded: true, error: null as string | null } } catch (error) { return { data: emptyDemoStore(), loaded: false, error: storageError(error) } }
  })
  const reload = useCallback(() => {
    try { const data = loadDemoStore(); setState({ data, loaded: true, error: null }) } catch (error) { setState(previous => ({ ...previous, loaded: false, error: storageError(error) })) }
  }, [])
  useEffect(() => {
    const refresh = (event: StorageEvent) => { if (event.key === demoStorageKey || event.key === null) reload() }
    window.addEventListener("storage", refresh)
    return () => window.removeEventListener("storage", refresh)
  }, [reload])
  function commit<T>(change: (data: DemoStore) => StoreChange<T>): OperationResult<T> {
    try {
      const result = commitDemoStore(change)
      setState({ data: result.data, loaded: true, error: null })
      return { ok: true, value: result.value }
    } catch (error) {
      const message = storageError(error)
      // Refresh after a rejected checkout: another local sale may have consumed stock.
      // If history cannot be read, never present the initial stock as available.
      try { setState({ data: loadDemoStore(), loaded: true, error: message }) } catch { setState(previous => ({ ...previous, loaded: false, error: message })) }
      return { ok: false, error: message }
    }
  }
  return { ...state, commit, reload }
}
