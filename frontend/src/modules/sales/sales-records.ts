import { calculateTotals, normalizeSearch, salesDateInLima, type CartSummary, type PaymentMethod } from "./sales-model"

export interface RecordLine { productId: string; name: string; sku: string; quantity: number; unitPriceCents: number }
export interface RecordTotals { subtotalCents: number; discountCents: number; totalCents: number }
export interface DemoSale extends RecordTotals {
  id: string
  number: string
  createdAt: string
  client: "Cliente mostrador"
  lines: RecordLine[]
  paymentMethod: PaymentMethod
  receivedCents: number | null
  changeCents: number | null
  status: "Registrada DEMO"
}
export interface DemoQuote extends RecordTotals {
  id: string
  number: string
  createdAt: string
  updatedAt: string
  client: string
  notes: string
  expiresOn: string
  status: "Borrador" | "Vigente"
  lines: RecordLine[]
}
export interface DemoStore { version: 1; nextSaleNumber: number; nextQuoteNumber: number; sales: DemoSale[]; quotes: DemoQuote[] }

export function snapshotCart(summary: CartSummary) {
  if (!summary.lines.length || summary.cartError || summary.discountError) throw new Error(summary.cartError ?? summary.discountError ?? "Agrega al menos un producto.")
  const lines = summary.lines.map(line => ({ productId: line.id, name: line.name, sku: line.sku, quantity: line.quantity, unitPriceCents: line.priceCents }))
  return { lines, ...calculateTotals(lines, summary.discountCents) }
}
export const quoteStatus = (quote: DemoQuote, today = salesDateInLima()) => quote.status === "Borrador" ? "Borrador" : quote.expiresOn < today ? "Vencida" : "Vigente"

export interface HistoryFilters { query: string; from: string; to: string; method: string; status: string; order: "newest" | "oldest" }
export function filterSaleHistory(sales: DemoSale[], filters: HistoryFilters) {
  return sales.filter(sale => {
    const date = salesDateInLima(sale.createdAt)
    return normalizeSearch(sale.number).includes(normalizeSearch(filters.query)) && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to) && (!filters.method || sale.paymentMethod === filters.method) && (!filters.status || sale.status === filters.status)
  }).sort((a, b) => (filters.order === "newest" ? -1 : 1) * (a.createdAt.localeCompare(b.createdAt) || a.number.localeCompare(b.number)))
}
