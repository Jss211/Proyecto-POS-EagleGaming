import { supabase } from "@/lib/supabase"

type StatusResult = { ok: true; id: string; active: boolean } | { ok: false; message: string }

const unconfirmed = "No se pudo confirmar el cambio de estado. Revisa el catálogo antes de reintentar."
const expired = "La sesión venció o cambió. Vuelve a iniciar sesión."

export async function setProductActive(
  id: string, updatedAt: string, active: boolean, userId: string,
): Promise<StatusResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError && (sessionError.status === 0 || (sessionError.status !== undefined && sessionError.status >= 500))) {
      return { ok: false, message: "No se pudo comprobar la sesión. Revisa tu conexión." }
    }
    if (sessionError || session?.user.id !== userId) return { ok: false, message: expired }

    const { data, error, status } = await supabase.rpc("set_product_active", {
      p_product_id: id,
      p_expected_updated_at: updatedAt,
      p_active: active,
    }).setHeader("Authorization", `Bearer ${session.access_token}`)
      .abortSignal(AbortSignal.timeout(12000))

    if (status === 401 || error?.code === "PGRST301" || error?.code === "PGRST303") return { ok: false, message: expired }
    if (status === 403 || error?.code === "42501") return { ok: false, message: "Solo ADMIN puede cambiar el estado de un producto." }
    if (error?.code === "40001") return { ok: false, message: "El producto cambió. Consulta su estado actual y vuelve a intentarlo." }
    if (error?.code === "P0002") return { ok: false, message: "El producto ya no está disponible." }
    if (error?.code === "23514") return { ok: false, message: "Completa los datos obligatorios antes de activar el producto." }
    if (status === 0 || status >= 500) return { ok: false, message: unconfirmed }
    if (error || !data || typeof data !== "object" || !("id" in data) || data.id !== id ||
        !("isActive" in data) || data.isActive !== active) {
      return { ok: false, message: "Supabase no confirmó el cambio de estado." }
    }
    return { ok: true, id, active }
  } catch {
    return { ok: false, message: unconfirmed }
  }
}
