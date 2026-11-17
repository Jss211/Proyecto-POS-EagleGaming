import { useReducer, useState } from "react"
import { cartReducer, summarizeCart, type CartAction, type CartItem } from "./sales-model"
import type { DemoProduct } from "./sales-demo"

export default function useSalesCart(products: readonly DemoProduct[], initialItems: CartItem[] = [], initialDiscount = "") {
  const [items, dispatch] = useReducer((items: CartItem[], action: CartAction) => cartReducer(items, action, products), initialItems)
  const [discount, setDiscount] = useState(initialDiscount)
  const action = (action: CartAction) => {
    if (action.type === "clear" || (action.type === "remove" && items.length === 1)) setDiscount("")
    dispatch(action)
  }
  return { products, items, discount, setDiscount, action, clear: () => action({ type: "clear" }), summary: summarizeCart(items, discount, products) }
}
