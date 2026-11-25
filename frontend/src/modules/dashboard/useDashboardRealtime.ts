import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { SupabaseSaleRecord } from "../sales/sales-service"

export interface RealtimeProductItem {
  id: string
  name: string | null
  barcode: string
  sku: string | null
  category: string | null
  price: number | string | null
  stock: number | null
  minStock: number | null
  isActive: boolean | null
  updatedAt: string
}

export interface RealtimeDashboardState {
  isRealtimeConnected: boolean
  channelStatus: "CONNECTING" | "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR" | "IDLE"
  productsCount: number
  activeCount: number
  lowStockItems: RealtimeProductItem[]
  inventoryValuationSoles: number
  // Métricas reales de ventas en Supabase
  sales: SupabaseSaleRecord[]
  hasRealSales: boolean
  realRevenueCents: number
  realTransactionsCount: number
  realUnitsSold: number
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useDashboardRealtime(range?: { start: string; end: string }): RealtimeDashboardState {
  const [products, setProducts] = useState<RealtimeProductItem[]>([])
  const [sales, setSales] = useState<SupabaseSaleRecord[]>([])
  const [channelStatus, setChannelStatus] = useState<RealtimeDashboardState["channelStatus"]>("CONNECTING")
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Consultar productos reales de Supabase
  const fetchLiveProducts = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from("products")
        .select("id, name, barcode, sku, category, price, stock, minStock, isActive, updatedAt")
        .order("updatedAt", { ascending: false })

      if (!queryError && data) {
        setProducts(data as RealtimeProductItem[])
      }
    } catch {
      // Ignorar de forma segura si no hay conexión
    }
  }, [])

  // Consultar ventas reales de Supabase en el rango seleccionado
  const fetchLiveSales = useCallback(async () => {
    try {
      const query = supabase.from("sales").select("*, items:sale_items(*)")
      if (range) {
        query.gte("createdAt", `${range.start}T00:00:00Z`).lte("createdAt", `${range.end}T23:59:59Z`)
      }
      const { data, error: salesError } = await query.order("createdAt", { ascending: false })

      if (!salesError && data) {
        setSales(data as SupabaseSaleRecord[])
      }
    } catch {
      // Tabla puede no existir aún en Supabase
    }
  }, [range?.start, range?.end])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    await Promise.allSettled([fetchLiveProducts(), fetchLiveSales()])
    setIsLoading(false)
  }, [fetchLiveProducts, fetchLiveSales])

  useEffect(() => {
    void refreshAll()

    // Suscripción WebSocket a cambios en 'products' y 'sales'
    const channelName = `realtime-dashboard-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          void fetchLiveProducts()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => {
          void fetchLiveSales()
        }
      )
      .subscribe((status) => {
        setChannelStatus(status as RealtimeDashboardState["channelStatus"])
        if (status === "SUBSCRIBED") {
          setIsRealtimeConnected(true)
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsRealtimeConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchLiveProducts, fetchLiveSales, refreshAll])

  // Cálculos reactivos de inventario
  const lowStockItems = products.filter(
    (p) => (p.stock ?? 0) <= (p.minStock ?? 3)
  )

  const activeCount = products.filter((p) => p.isActive !== false).length

  const inventoryValuationSoles = products.reduce((total, p) => {
    const priceNum = typeof p.price === "number" ? p.price : Number(p.price) || 0
    const stockNum = p.stock || 0
    return total + priceNum * stockNum
  }, 0)

  // Cálculos reactivos de ventas reales
  const hasRealSales = sales.length > 0
  const realRevenueCents = Math.round(sales.reduce((sum, s) => sum + Number(s.total || 0), 0) * 100)
  const realTransactionsCount = sales.length
  const realUnitsSold = sales.reduce(
    (sum, s) => sum + (s.items?.reduce((isum, item) => isum + Number(item.quantity || 0), 0) || 0),
    0
  )

  return {
    isRealtimeConnected,
    channelStatus,
    productsCount: products.length,
    activeCount,
    lowStockItems,
    inventoryValuationSoles,
    sales,
    hasRealSales,
    realRevenueCents,
    realTransactionsCount,
    realUnitsSold,
    isLoading,
    error,
    refresh: refreshAll,
  }
}
