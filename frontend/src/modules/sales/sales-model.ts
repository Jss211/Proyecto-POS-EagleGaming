import type { SalesProduct } from "./sales-product"

const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })
export const formatSalesMoney = (cents: number) => currency.format(cents / 100)
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

export function filterSalesProducts(query: string, category: string, products: readonly SalesProduct[]) {
  const search = normalizeSearch(query)
  return products.filter(product => (!category || product.category === category) && normalizeSearch(`${product.name} ${product.sku} ${product.barcode}`).includes(search))
}

export interface CartItem { productId: string; quantity: number }
export type CartAction = { type: "add" | "increase" | "decrease" | "remove"; productId: string } | { type: "clear" }

export function cartReducer(cart: CartItem[], action: CartAction, products: readonly SalesProduct[]): CartItem[] {
  if (action.type === "clear") return []
  if (action.type === "remove") return cart.filter(item => item.productId !== action.productId)
  const product = products.find(item => item.id === action.productId)
  if (!product) return cart
  const existing = cart.find(item => item.productId === product.id)
  if (action.type === "decrease") return existing && existing.quantity > 1 ? cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity - 1 } : item) : cart
  if (!product.available || (existing?.quantity ?? 0) >= product.available) return cart
  return existing ? cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...cart, { productId: product.id, quantity: 1 }]
}

export function parseMoneyCents(value: string): number | null {
  if (!/^\d{1,9}([.,]\d{1,2})?$/.test(value.trim())) return null
  const [whole, decimal = ""] = value.trim().replace(",", ".").split(".")
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"))
}

export function stockAvailabilityError(items: readonly CartItem[], products: readonly SalesProduct[]): string | null {
  if (new Set(items.map(item => item.productId)).size !== items.length) return "Hay productos duplicados en la selección. Revisa el carrito."
  for (const item of items) {
    const product = products.find(product => product.id === item.productId)
    if (!product) return "La selección contiene un producto que ya no está disponible en el catálogo."
    if (product.stockVerified === false) return `${product.name}: no se pudo verificar el stock. Reintenta la lectura del historial local.`
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) return `${product.name}: la cantidad debe ser un entero mayor que cero.`
    if (product.available === 0) return `${product.name}: agotado, 0 disponibles en el stock. Elimina este producto de la selección.`
    if (item.quantity > product.available) return `${product.name}: seleccionaste ${item.quantity}, pero solo hay ${product.available} disponibles en el stock. Reduce la cantidad.`
  }
  return null
}

export function summarizeCart(cart: CartItem[], discountInput: string, products: readonly SalesProduct[]) {
  const cartError = stockAvailabilityError(cart, products)
  let lineSum = 0
  const lines = cart.flatMap(item => {
    const product = products.find(product => product.id === item.productId)
    if (!product || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) return []
    const totalCents = product.priceCents * item.quantity
    if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(lineSum + totalCents)) return []
    lineSum += totalCents
    // Preserve stale lines and their totals so the user can decrease/remove them.
    // cartError blocks saving when a later sale has reduced their available stock.
    return [{ ...product, quantity: item.quantity, totalCents }]
  })
  const subtotalCents = lines.reduce((sum, item) => sum + item.totalCents, 0)
  const requestedDiscount = discountInput.trim() === "" ? 0 : parseMoneyCents(discountInput)
  const discountError = requestedDiscount === null ? "Ingresa un descuento válido con hasta 2 decimales." : requestedDiscount > subtotalCents ? "El descuento no puede superar el subtotal." : null
  const discountCents = Math.min(requestedDiscount ?? 0, subtotalCents)
  const totals = calculateTotals(lines.map(line => ({ quantity: line.quantity, unitPriceCents: line.priceCents })), discountCents)
  return { lines, ...totals, discountError, cartError, units: lines.reduce((sum, item) => sum + item.quantity, 0) }
}
export type CartSummary = ReturnType<typeof summarizeCart>

export function cashPayment(receivedInput: string, totalCents: number) {
  const receivedCents = parseMoneyCents(receivedInput)
  const error = receivedCents === null ? "Ingresa un importe válido en soles con hasta 2 decimales." : receivedCents < totalCents ? "El monto recibido es menor que el total a pagar." : null
  return { error, receivedCents, changeCents: error ? null : receivedCents! - totalCents }
}

export function calculateTotals(lines: { quantity: number; unitPriceCents: number }[], discountCents: number) {
  if (lines.some(line => !Number.isSafeInteger(line.quantity) || line.quantity <= 0 || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0)) throw new Error("Cantidades o precios inválidos.")
  const subtotalCents = lines.reduce((total, line) => total + line.quantity * line.unitPriceCents, 0)
  if (!Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(discountCents) || discountCents < 0 || discountCents > subtotalCents) throw new Error("Los importes o el descuento no son válidos.")
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents }
}

export const paymentMethods = ["Efectivo", "Tarjeta", "Transferencia", "Yape", "Plin"] as const
export type PaymentMethod = typeof paymentMethods[number]
export const formatSalesDateTime = (value: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }).format(new Date(value))
export function salesDateInLima(value = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value))
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-")
}
export function validSalesDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function defaultQuoteExpiry(today = salesDateInLima()) {
  const date = new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 7)
  return date.toISOString().slice(0, 10)
}
