import { useReducer, useState } from "react"
import { cartReducer, summarizeCart, type CartAction, type CartItem } from "./sales-model"
import type { SalesProduct } from "./sales-product"

type ScanNotice = { kind: "success" | "error"; message: string }
type CartState = { items: CartItem[]; scanNotice?: ScanNotice }
type DraftAction = CartAction |
  { type: "scan"; product: SalesProduct } |
  { type: "scan-error"; message: string } |
  { type: "reset-scan" } |
  { type: "refresh"; products: readonly SalesProduct[] }

export default function useSalesCart(products: readonly SalesProduct[], initialItems: CartItem[] = [], initialDiscount = "") {
  const [{ items, scanNotice }, dispatch] = useReducer((state: CartState, action: DraftAction): CartState => {
    if (action.type === "reset-scan") return { items: state.items }
    if (action.type === "scan-error") return { ...state, scanNotice: { kind: "error", message: action.message } }
    if (action.type === "refresh") {
      const available = new Map(action.products.map(product => [product.id, product.available]))
      const items = state.items.flatMap(item => {
        const quantity = Math.min(item.quantity, available.get(item.productId) ?? 0)
        return quantity > 0 ? [{ ...item, quantity }] : []
      })
      return { ...state, items }
    }
    if (action.type === "scan") {
      const { product } = action
      const existing = state.items.find(item => item.productId === product.id)
      if (existing && existing.quantity > product.available) {
        const items = state.items.map(item => item === existing ? { ...item, quantity: product.available } : item)
        return { items, scanNotice: { kind: "error", message: `${product.name}: cantidad ajustada al stock disponible (${product.available}).` } }
      }
      const items = cartReducer(state.items, { type: "add", productId: product.id }, [product])
      if (items === state.items) {
        return { ...state, scanNotice: { kind: "error", message: `${product.name}: límite alcanzado. Stock disponible: ${product.available}.` } }
      }
      const quantity = items.find(item => item.productId === product.id)?.quantity
      return { items, scanNotice: { kind: "success", message: `${product.name}: ${quantity} en el carrito.` } }
    }
    return { ...state, items: cartReducer(state.items, action, products) }
  }, { items: initialItems })
  const [discount, setDiscount] = useState(initialDiscount)
  const action = (action: CartAction) => {
    if (action.type === "clear" || (action.type === "remove" && items.length === 1)) setDiscount("")
    dispatch(action)
  }
  return { products, items, scanNotice, dispatch, discount, setDiscount, action, clear: () => action({ type: "clear" }), summary: summarizeCart(items, discount, products) }
}
