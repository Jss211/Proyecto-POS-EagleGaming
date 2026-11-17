import { demoActivities, demoCustomers, demoProducts, demoSales, type DashboardSale } from "./dashboard-demo"

export type Period = "week" | "month" | "year"
export interface DateRange { start: string; end: string }
export const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })
export const percent = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 })
export const formatDateTime = (value: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }).format(new Date(value))
export const money = (cents: number) => currency.format(cents / 100)

export function todayInLima(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const part = (type: string) => parts.find(item => item.type === type)?.value
  return `${part("year")}-${part("month")}-${part("day")}`
}
export function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
export function shiftMonth(value: string, months: number) {
  const date = new Date(value.slice(0, 7) + "-01T12:00:00Z")
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 10)
}
export function periodRange(period: Period, today: string): DateRange {
  if (period === "week") {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
    const start = shiftDate(today, -((weekday + 6) % 7))
    return { start, end: shiftDate(start, 6) }
  }
  return { start: period === "year" ? "2026-01-01" : `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` }
}
export function rangeDays(range: DateRange) {
  return Math.round((Date.parse(`${range.end}T12:00:00Z`) - Date.parse(`${range.start}T12:00:00Z`)) / 86400000) + 1
}
export function saleTotal(sale: DashboardSale) {
  return sale.items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0)
}
export interface TopProduct { id: string; name: string; category: string; units: number; revenueCents: number }

export function summarizeDashboard(range: DateRange, period: Period = "week") {
  // ISO dates are local business dates; timestamps in these fixtures explicitly use Lima's UTC-05.
  const within = (date: string) => date.slice(0, 10) >= range.start && date.slice(0, 10) <= range.end
  const sales = demoSales.filter(sale => within(sale.occurredAt)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const revenueCents = sales.reduce((total, sale) => total + saleTotal(sale), 0)
  const costCents = sales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + item.quantity * item.unitCostCents, 0), 0)
  const units = sales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0)
  const profitCents = revenueCents - costCents
  const margin = revenueCents === 0 ? 0 : profitCents / revenueCents * 100
  const days = rangeDays(range)
  const previous = { start: period === "week" ? shiftDate(range.start, -days) : shiftMonth(range.start, -12 * (Number(range.end.slice(0, 4)) - Number(range.start.slice(0, 4)) + 1)), end: shiftDate(range.start, -1) }
  const previousRevenueCents = demoSales.filter(sale => sale.occurredAt.slice(0, 10) >= previous.start && sale.occurredAt.slice(0, 10) <= previous.end).reduce((total, sale) => total + saleTotal(sale), 0)
  const growth = previousRevenueCents === 0 ? null : (revenueCents - previousRevenueCents) / previousRevenueCents * 100
  const bucketCount = period === "year" ? Math.max(0, Number(range.end.slice(0, 4)) - 2026 + 1) : period === "month" ? 12 : 7
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = period === "week" ? shiftDate(range.start, index) : shiftMonth(range.start, index * (period === "year" ? 12 : 1))
    const end = period === "week" ? start : shiftDate(shiftMonth(start, period === "year" ? 12 : 1), -1)
    const label = period === "year" ? start.slice(0, 4) : new Intl.DateTimeFormat("es-PE", { ...(period === "month" ? { month: "long" as const } : { weekday: "long" as const }), timeZone: "UTC" }).format(new Date(start + "T12:00:00Z"))
    const amountCents = sales.filter(sale => sale.occurredAt.slice(0, 10) >= start && sale.occurredAt.slice(0, 10) <= end).reduce((total, sale) => total + saleTotal(sale), 0)
    return { day: label, start, end, amountCents, amount: amountCents / 100 }
  })
  const topProducts: TopProduct[] = demoProducts.map(product => {
    const items = sales.flatMap(sale => sale.items).filter(item => item.productId === product.id)
    return { id: product.id, name: product.name, category: product.category, units: items.reduce((total, item) => total + item.quantity, 0), revenueCents: items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0) }
  }).filter(product => product.units > 0).sort((a, b) => b.units - a.units || a.name.localeCompare(b.name)).slice(0, 5)
  return {
    sales, revenueCents, costCents, units, profitCents, margin, growth, previousRevenueCents, buckets, topProducts,
    newCustomers: demoCustomers.filter(customer => within(customer.registeredOn)).length,
    payments: ["Tarjeta", "Efectivo", "Transferencia"].map(method => ({ method, count: sales.filter(sale => sale.method === method).length })),
    activities: demoActivities.filter(activity => within(activity.occurredAt)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 10),
  }
}
export type DashboardSummary = ReturnType<typeof summarizeDashboard>
