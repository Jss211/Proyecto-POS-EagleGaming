import { demoActivities, demoCustomers, demoProducts, demoSales, type DashboardSale } from "./dashboard-demo"

export type Period = "today" | "week" | "month" | "custom"
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
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function validRange(range: DateRange) {
  return isDate(range.start) && isDate(range.end) && range.start <= range.end
}
export function periodRange(period: Period, today: string, custom: DateRange): DateRange {
  if (period === "custom") return custom
  return { start: shiftDate(today, period === "today" ? 0 : period === "week" ? -6 : -29), end: today }
}
export function rangeDays(range: DateRange) {
  return Math.round((Date.parse(`${range.end}T12:00:00Z`) - Date.parse(`${range.start}T12:00:00Z`)) / 86400000) + 1
}
export function saleTotal(sale: DashboardSale) {
  return sale.items.reduce((total, item) => total + item.quantity * item.unitPriceCents, 0)
}
export interface TopProduct { id: string; name: string; category: string; units: number; revenueCents: number }

export function summarizeDashboard(range: DateRange) {
  // ISO dates are local business dates; timestamps in these fixtures explicitly use Lima's UTC-05.
  const within = (date: string) => date.slice(0, 10) >= range.start && date.slice(0, 10) <= range.end
  const sales = demoSales.filter(sale => within(sale.occurredAt)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const revenueCents = sales.reduce((total, sale) => total + saleTotal(sale), 0)
  const costCents = sales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + item.quantity * item.unitCostCents, 0), 0)
  const units = sales.reduce((total, sale) => total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0)
  const profitCents = revenueCents - costCents
  const margin = revenueCents === 0 ? 0 : profitCents / revenueCents * 100
  const days = rangeDays(range)
  const previous = { start: shiftDate(range.start, -days), end: shiftDate(range.start, -1) }
  const previousRevenueCents = demoSales.filter(sale => sale.occurredAt.slice(0, 10) >= previous.start && sale.occurredAt.slice(0, 10) <= previous.end).reduce((total, sale) => total + saleTotal(sale), 0)
  const growth = previousRevenueCents === 0 ? null : (revenueCents - previousRevenueCents) / previousRevenueCents * 100
  // At most 7 chronological buckets, even for a multi-year custom range.
  const bucketCount = Math.min(7, days)
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = shiftDate(range.start, Math.floor(index * days / bucketCount))
    const end = shiftDate(range.start, Math.floor((index + 1) * days / bucketCount) - 1)
    const formatter = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
    const short = (date: string) => formatter.format(new Date(`${date}T12:00:00Z`))
    const label = start === end ? short(start) : `${short(start)}–${short(end)}`
    const amount = sales.filter(sale => sale.occurredAt.slice(0, 10) >= start && sale.occurredAt.slice(0, 10) <= end).reduce((total, sale) => total + saleTotal(sale), 0) / 100
    return { day: label, amount }
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
