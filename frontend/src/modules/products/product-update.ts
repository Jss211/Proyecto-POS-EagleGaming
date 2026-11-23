import { supabase } from "@/lib/supabase"

export type ProductChanges = {
  name: string
  sku: string | null
  category: string
  description: string | null
  price: string
}

type UpdateResult = { ok: true; id: string } | { ok: false; message: string }

const unconfirmed = "No se pudo confirmar la edición. Consulta los datos del producto antes de reintentar."

export function validateProductChanges(form: FormData) {
  const field = (key: string) => String(form.get(key) ?? "").trim()
  const name = field("name")
  const category = field("category")
  const sku = field("sku")
  const price = field("price").replace(",", ".")

  if (!name || !category) return { ok: false, message: "Ingresa el nombre y la categoría." } as const
  if (sku && !/^\S{1,128}$/.test(sku)) {
    return { ok: false, message: "El SKU debe contener hasta 128 caracteres sin espacios." } as const
  }
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(price)) {
    return { ok: false, message: "Ingresa un precio no negativo de hasta ocho enteros y dos decimales." } as const
  }

  const changes: ProductChanges = { name, category, sku: sku || null, price, description: field("description") || null }
  return { ok: true, changes } as const
}

export async function updateProduct(id: string, updatedAt: string, changes: ProductChanges, userId: string): Promise<UpdateResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError && (sessionError.status === 0 || (sessionError.status !== undefined && sessionError.status >= 500))) {
      return { ok: false, message: "No se pudo comprobar la sesión. Revisa tu conexión." }
    }
    if (sessionError || session?.user.id !== userId) {
      return { ok: false, message: "La sesión venció o cambió. Vuelve a iniciar sesión." }
    }

    const { data, error, status } = await supabase.rpc("update_product", {
      p_product_id: id,
      p_expected_updated_at: updatedAt,
      p_changes: changes,
    }).setHeader("Authorization", `Bearer ${session.access_token}`)
      .abortSignal(AbortSignal.timeout(12000))

    if (error?.code === "23505") return { ok: false, message: "Ya existe otro producto con ese SKU." }
    if (status === 401 || error?.code === "PGRST303" || error?.code === "PGRST301") {
      return { ok: false, message: "La sesión venció. Vuelve a iniciar sesión." }
    }
    if (status === 403 || error?.code === "42501") return { ok: false, message: "Solo ADMIN puede editar productos." }
    if (status === 0 || status >= 500) return { ok: false, message: unconfirmed }
    if (error?.code === "P0002") return { ok: false, message: "El producto cambió o ya no está disponible. Consulta sus datos actuales antes de editarlo." }
    if (error?.code === "22023" || error?.code === "23514") return { ok: false, message: "Supabase rechazó los datos. Revisa el nombre, la categoría, el SKU y el precio." }
    if (error || !data || typeof data !== "object" || !("id" in data) || data.id !== id) {
      return { ok: false, message: "Supabase no confirmó la edición del producto." }
    }
    return { ok: true, id }
  } catch {
    return { ok: false, message: unconfirmed }
  }
}
