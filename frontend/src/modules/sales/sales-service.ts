import { supabase } from "@/lib/supabase"

export interface SupabaseSaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface SupabaseSaleRecord {
  id: string
  folio: string
  cashierId: string
  shiftId?: string | null
  total: number
  amountPaid: number
  change: number
  paymentMethod: string
  status: string
  createdAt: string
  items?: SupabaseSaleItem[]
}

export interface RegisterSaleInput {
  paymentMethod: "Efectivo" | "Tarjeta" | "Transferencia" | "Yape" | "Plin"
  totalCents: number
  amountPaidCents?: number
  changeCents?: number
  items: {
    productId: string
    quantity: number
    unitPriceCents: number
  }[]
}

/**
 * Registra una venta real en Supabase, guarda sus ítems y descuenta el stock en la base de datos.
 */
export async function registerSaleInSupabase(input: RegisterSaleInput): Promise<{
  ok: boolean
  sale?: SupabaseSaleRecord
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const cashierId = session?.user?.id
    if (!cashierId) {
      return { ok: false, error: "Debes tener una sesión iniciada para registrar ventas en Supabase." }
    }

    const saleId = crypto.randomUUID()
    const folio = `T001-${Date.now().toString().slice(-6)}`
    const totalSoles = input.totalCents / 100
    const amountPaidSoles = (input.amountPaidCents ?? input.totalCents) / 100
    const changeSoles = (input.changeCents ?? 0) / 100

    // 1. Insertar cabecera de la venta en la tabla 'sales'
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        id: saleId,
        folio,
        cashierId,
        total: totalSoles,
        amountPaid: amountPaidSoles,
        change: changeSoles,
        paymentMethod: input.paymentMethod.toUpperCase(),
        status: "COMPLETADA",
      })
      .select()
      .single()

    if (saleError || !saleData) {
      return { ok: false, error: saleError?.message || "No se pudo registrar la venta en Supabase." }
    }

    // 2. Insertar ítems en 'sale_items'
    if (input.items.length > 0) {
      const itemsToInsert = input.items.map(item => ({
        id: crypto.randomUUID(),
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPriceCents / 100,
        subtotal: (item.quantity * item.unitPriceCents) / 100,
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(itemsToInsert)
      if (itemsError) {
        console.warn("Advertencia al guardar detalle de venta:", itemsError.message)
      }

      // 3. Descontar stock de los productos vendidos en Supabase
      for (const item of input.items) {
        if (item.productId) {
          const { data: currentProduct } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.productId)
            .single()

          if (currentProduct && typeof currentProduct.stock === "number") {
            const newStock = Math.max(0, currentProduct.stock - item.quantity)
            await supabase.from("products").update({ stock: newStock }).eq("id", item.productId)
          }
        }
      }
    }

    return { ok: true, sale: saleData as SupabaseSaleRecord }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado registrando venta." }
  }
}

/**
 * Consulta ventas de Supabase en un rango de fechas.
 */
export async function fetchSalesFromSupabase(
  startDateIso: string,
  endDateIso: string
): Promise<SupabaseSaleRecord[]> {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select("*, items:sale_items(*)")
      .gte("createdAt", `${startDateIso}T00:00:00Z`)
      .lte("createdAt", `${endDateIso}T23:59:59Z`)
      .order("createdAt", { ascending: false })

    if (error || !data) {
      return []
    }
    return data as SupabaseSaleRecord[]
  } catch {
    return []
  }
}
