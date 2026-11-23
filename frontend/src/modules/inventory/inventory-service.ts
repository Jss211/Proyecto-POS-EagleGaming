import { supabase } from "@/lib/supabase"

export type InventoryEntry = {
  productId: string
  quantity: number
  reason: string
  notes: string
}

export type InventoryMovement = {
  id: string
  productId: string
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  reason: string | null
  createdAt: string
}

export const historyPageSize = 10

function isMovement(value: unknown): value is InventoryMovement {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<InventoryMovement>
  return typeof item.id === "string" && typeof item.productId === "string" &&
    typeof item.type === "string" && typeof item.createdAt === "string" &&
    Number.isInteger(item.quantity) && Number.isInteger(item.stockBefore) &&
    Number.isInteger(item.stockAfter) && (item.reason === null || typeof item.reason === "string")
}

export async function readInventoryHistory(page: number, signal: AbortSignal) {
  const { data, error } = await supabase.rpc("list_inventory_movements", {
    p_offset: page * historyPageSize,
    p_limit: historyPageSize + 1,
  }, { get: true }).abortSignal(signal)
  if (error) {
    if (error.code === "42501" || error.code === "PGRST301") throw new Error("Tu sesión no puede consultar los movimientos.")
    throw new Error("No se pudieron consultar los movimientos. Revisa tu conexión.")
  }
  if (!Array.isArray(data) || !data.every(isMovement)) throw new Error("Supabase devolvió un historial inválido.")
  return { movements: data.slice(0, historyPageSize), hasNext: data.length > historyPageSize }
}

export function parseEntryQuantity(value: string): number | null {
  if (!/^\d{1,10}$/.test(value)) return null
  const quantity = Number(value)
  return quantity > 0 && quantity <= 2147483647 ? quantity : null
}

type EntryResult = { ok: true; movement: InventoryMovement; stock: number; replayed: boolean } |
  { ok: false; message: string }

type Receipt = { movement?: InventoryMovement; stock?: number; replayed?: boolean }

export async function recordInventoryEntry(entry: InventoryEntry, userId: string): Promise<EntryResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || session?.user.id !== userId) {
      return { ok: false, message: "No se pudo comprobar la sesión. Revisa tu conexión o vuelve a iniciar sesión." }
    }

    // Retain the ID for the same request if the browser loses the response.
    const fingerprint = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(entry)))
    const key = `eagle.inventory.entry.${userId}.${Array.from(new Uint8Array(fingerprint)).map(n => n.toString(16).padStart(2, "0")).join("")}`
    const requestId = sessionStorage.getItem(key) ?? crypto.randomUUID()
    sessionStorage.setItem(key, requestId)
    const { data, error, status } = await supabase.rpc("record_inventory_entry", {
      p_request_id: requestId,
      p_product_id: entry.productId,
      p_quantity: entry.quantity,
      p_reason: entry.reason,
      p_notes: entry.notes || null,
    }).setHeader("Authorization", `Bearer ${session.access_token}`)
      .abortSignal(AbortSignal.timeout(12000))
    if (status === 401 || error?.code === "PGRST301" || error?.code === "PGRST303") {
      return { ok: false, message: "La sesión venció. Vuelve a iniciar sesión." }
    }
    if (status === 403 || error?.code === "42501") return { ok: false, message: "Solo ADMIN puede registrar entradas." }
    if (error?.code === "P0002") return { ok: false, message: "El producto ya no está disponible." }
    if (error?.code === "22023" || error?.code === "22003") return { ok: false, message: "Verifica la cantidad, el motivo y el límite de stock." }
    if (error?.code === "23505") return { ok: false, message: "Identificador de entrada en conflicto. Revisa el historial antes de reenviar." }
    if (error) return { ok: false, message: "No se pudo confirmar la entrada. Puedes repetir la misma solicitud sin duplicarla." }

    const result = data as Receipt | null
    if (!isMovement(result?.movement) || result.movement.id !== requestId || result.movement.productId !== entry.productId ||
        typeof result.stock !== "number" || result.stock !== result.movement.stockAfter || typeof result.replayed !== "boolean") {
      return { ok: false, message: "Supabase no confirmó la entrada. Revisa el historial antes de cambiar la solicitud." }
    }
    sessionStorage.removeItem(key)
    return { ok: true, movement: result.movement, stock: result.stock, replayed: result.replayed }
  } catch {
    return { ok: false, message: "No se pudo confirmar la entrada. Revisa la conexión y repite la misma solicitud." }
  }
}
