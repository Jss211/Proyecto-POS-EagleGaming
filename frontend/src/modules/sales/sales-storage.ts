import { calculateTotals, cashPayment, defaultQuoteExpiry, paymentMethods, salesDateInLima, stockAvailabilityError, validSalesDate, type CartSummary, type PaymentMethod } from "./sales-model"
import { snapshotCart, type DemoQuote, type DemoSale, type DemoStore, type RecordLine } from "./sales-records"
import { deriveDemoStock } from "./sales-stock"

export const demoStorageKey = "eaglegaming.sales-demo.v1"
type DemoStorage = Pick<Storage, "getItem" | "setItem">
export interface StoreChange<T> { data: DemoStore; value: T }
export type OperationResult<T> = { ok: true; value: T } | { ok: false; error: string }
export const emptyDemoStore = (): DemoStore => ({ version: 1, nextSaleNumber: 1, nextQuoteNumber: 1, sales: [], quotes: [] })

const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const text = (value: unknown, max = 160): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max
const amount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0
const timestamp = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).length === allowed.length && Object.keys(value).every(key => allowed.includes(key))
const totalsKeys = ["subtotalCents", "discountCents", "totalCents"]
function validLines(value: unknown): value is RecordLine[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 && new Set(value.map(line => object(line) ? line.productId : undefined)).size === value.length && value.every(line => object(line) && keys(line, ["productId", "name", "sku", "quantity", "unitPriceCents"]) && text(line.productId) && text(line.name) && text(line.sku) && amount(line.quantity) && line.quantity > 0 && amount(line.unitPriceCents))
}
function validTotals(value: Record<string, unknown>) {
  if (!validLines(value.lines) || !amount(value.discountCents)) return false
  try {
    const totals = calculateTotals(value.lines, value.discountCents)
    return value.subtotalCents === totals.subtotalCents && value.totalCents === totals.totalCents
  } catch { return false }
}
function validSale(value: unknown): value is DemoSale {
  if (!object(value) || !keys(value, ["id", "number", "createdAt", "client", "lines", "paymentMethod", "receivedCents", "changeCents", "status", ...totalsKeys]) || !text(value.id) || !text(value.number) || !/^DEMO-V-\d{6,}$/.test(value.number) || !timestamp(value.createdAt) || value.client !== "Cliente mostrador" || value.status !== "Registrada DEMO" || !paymentMethods.includes(value.paymentMethod as PaymentMethod) || !validTotals(value)) return false
  return value.paymentMethod === "Efectivo" ? amount(value.receivedCents) && amount(value.changeCents) && value.receivedCents >= (value.totalCents as number) && value.changeCents === value.receivedCents - (value.totalCents as number) : value.receivedCents === null && value.changeCents === null
}
function validQuote(value: unknown): value is DemoQuote {
  return object(value) && keys(value, ["id", "number", "createdAt", "updatedAt", "client", "notes", "expiresOn", "status", "lines", ...totalsKeys]) && text(value.id) && text(value.number) && /^DEMO-C-\d{6,}$/.test(value.number) && timestamp(value.createdAt) && timestamp(value.updatedAt) && value.updatedAt >= value.createdAt && text(value.client, 90) && (value.client === "Cliente mostrador" || value.client.startsWith("DEMO · ")) && typeof value.notes === "string" && value.notes.length <= 1000 && typeof value.expiresOn === "string" && validSalesDate(value.expiresOn) && value.expiresOn >= salesDateInLima(value.createdAt) && (value.status === "Borrador" || value.status === "Vigente") && validTotals(value)
}
export function validateDemoStore(value: unknown): value is DemoStore {
  if (!object(value) || !keys(value, ["version", "nextSaleNumber", "nextQuoteNumber", "sales", "quotes"]) || value.version !== 1 || !amount(value.nextSaleNumber) || !amount(value.nextQuoteNumber) || !Array.isArray(value.sales) || !Array.isArray(value.quotes) || !value.sales.every(validSale) || !value.quotes.every(validQuote)) return false
  const records = [...value.sales, ...value.quotes]
  return new Set(records.map(record => record.id)).size === records.length && new Set(records.map(record => record.number)).size === records.length && value.nextSaleNumber > value.sales.reduce((max, sale) => Math.max(max, Number(sale.number.slice(7))), 0) && value.nextQuoteNumber > value.quotes.reduce((max, quote) => Math.max(max, Number(quote.number.slice(7))), 0)
}
export function loadDemoStore(storage?: DemoStorage): DemoStore {
  const raw = (storage ?? window.localStorage).getItem(demoStorageKey)
  if (raw === null) return emptyDemoStore()
  let data: unknown
  try { data = JSON.parse(raw) } catch { throw new Error("Los registros DEMO locales no contienen JSON válido. No se sobrescribieron.") }
  if (!validateDemoStore(data)) throw new Error("El formato de los registros DEMO locales es inválido o incompatible. No se sobrescribieron.")
  return data
}
export function commitDemoStore<T>(change: (data: DemoStore) => StoreChange<T>, storage?: DemoStorage): StoreChange<T> {
  const target = storage ?? window.localStorage
  // Read immediately before each write so navigation never overwrites newer local records.
  const result = change(loadDemoStore(target))
  if (!validateDemoStore(result.data)) throw new Error("La operación contiene datos DEMO inválidos.")
  target.setItem(demoStorageKey, JSON.stringify(result.data))
  return result
}
const newId = () => crypto.randomUUID()
const recordNumber = (kind: "V" | "C", sequence: number) => `DEMO-${kind}-${String(sequence).padStart(6, "0")}`

export function registerDemoSale(data: DemoStore, summary: CartSummary, method: PaymentMethod, received: string, now = new Date().toISOString()): StoreChange<DemoSale> {
  const stockError = stockAvailabilityError(summary.lines.map(line => ({ productId: line.id, quantity: line.quantity })), deriveDemoStock(data.sales).products)
  if (stockError) throw new Error(stockError)
  const snapshot = snapshotCart(summary)
  if (!paymentMethods.includes(method)) throw new Error("Selecciona un método de pago válido.")
  const cash = method === "Efectivo" ? cashPayment(received, snapshot.totalCents) : null
  if (cash?.error) throw new Error(cash.error)
  const sale: DemoSale = { id: newId(), number: recordNumber("V", data.nextSaleNumber), createdAt: now, client: "Cliente mostrador", ...snapshot, paymentMethod: method, receivedCents: cash?.receivedCents ?? null, changeCents: cash?.changeCents ?? null, status: "Registrada DEMO" }
  return { data: { ...data, nextSaleNumber: data.nextSaleNumber + 1, sales: [...data.sales, sale] }, value: sale }
}
export interface QuoteInput { id?: string; summary: CartSummary; clientName: string; notes: string; expiresOn: string; status: DemoQuote["status"] }
export function saveDemoQuote(data: DemoStore, input: QuoteInput, now = new Date().toISOString()): StoreChange<DemoQuote> {
  const original = input.id ? data.quotes.find(quote => quote.id === input.id) : undefined
  if (input.id && !original) throw new Error("Esta cotización ya no existe. Recarga el listado antes de editarla.")
  if (input.clientName.trim().length > 80 || input.notes.length > 1000) throw new Error("Revisa la longitud del nombre ficticio y las observaciones.")
  const createdAt = original?.createdAt ?? now
  if (!validSalesDate(input.expiresOn) || input.expiresOn < salesDateInLima(createdAt)) throw new Error("El vencimiento debe ser una fecha válida, igual o posterior a la creación.")
  const quote: DemoQuote = { id: original?.id ?? newId(), number: original?.number ?? recordNumber("C", data.nextQuoteNumber), createdAt, updatedAt: now, client: input.clientName.trim() ? `DEMO · ${input.clientName.trim()}` : "Cliente mostrador", notes: input.notes.trim(), expiresOn: input.expiresOn, status: input.status, ...snapshotCart(input.summary) }
  return { data: { ...data, nextQuoteNumber: data.nextQuoteNumber + (original ? 0 : 1), quotes: original ? data.quotes.map(record => record.id === quote.id ? quote : record) : [...data.quotes, quote] }, value: quote }
}
export function duplicateDemoQuote(data: DemoStore, id: string, now = new Date().toISOString()): StoreChange<DemoQuote> {
  const original = data.quotes.find(quote => quote.id === id)
  if (!original) throw new Error("La cotización ya no existe.")
  const quote: DemoQuote = { ...original, id: newId(), number: recordNumber("C", data.nextQuoteNumber), createdAt: now, updatedAt: now, expiresOn: defaultQuoteExpiry(salesDateInLima(now)), status: "Borrador", lines: original.lines.map(line => ({ ...line })) }
  return { data: { ...data, nextQuoteNumber: data.nextQuoteNumber + 1, quotes: [...data.quotes, quote] }, value: quote }
}
export function deleteDemoQuote(data: DemoStore, id: string): StoreChange<null> {
  if (!data.quotes.some(quote => quote.id === id)) throw new Error("La cotización ya no existe.")
  return { data: { ...data, quotes: data.quotes.filter(quote => quote.id !== id) }, value: null }
}
