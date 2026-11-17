import { salesDemoProducts, type DemoProduct } from "./sales-demo"
import type { DemoSale } from "./sales-records"
import type { CartItem } from "./sales-model"

// Stock is derived, never persisted separately or deducted by an effect.
export function deriveDemoStock(sales: readonly DemoSale[]) {
  const sold = new Map<string, number>()
  const seen = new Set<string>()
  const warnings = new Set<string>()
  for (const sale of sales) {
    if (sale.status !== "Registrada DEMO") continue
    if (seen.has(sale.id)) {
      warnings.add(`${sale.number}: venta duplicada; se contabiliza una sola vez para el stock DEMO.`)
      continue
    }
    seen.add(sale.id)
    for (const line of sale.lines) {
      const product = salesDemoProducts.find(product => product.id === line.productId)
      if (!product) {
        warnings.add(`${sale.number}: el producto ${line.productId} no está en el catálogo DEMO. No se asignaron sus unidades a otro producto.`)
        continue
      }
      // The persisted format validates positive integer quantities before reaching here.
      // Saturating above initial stock avoids numeric overflow in old oversold histories.
      sold.set(product.id, Math.min(product.available + 1, (sold.get(product.id) ?? 0) + line.quantity))
    }
  }
  const products = salesDemoProducts.map(product => {
    const quantity = sold.get(product.id) ?? 0
    if (quantity > product.available) warnings.add(`${product.name}: las ventas DEMO anteriores superan las ${product.available} unidades iniciales. Se muestra stock 0; el historial se conserva sin cambios.`)
    return { ...product, available: Math.max(0, product.available - quantity) }
  })
  return { products, warnings: [...warnings] }
}

export function stockAvailabilityError(items: readonly CartItem[], products: readonly DemoProduct[]): string | null {
  if (new Set(items.map(item => item.productId)).size !== items.length) return "Hay productos duplicados en la selección. Revisa el carrito DEMO."
  for (const item of items) {
    const product = products.find(product => product.id === item.productId)
    if (!product) return "La selección contiene un producto que ya no está en el catálogo DEMO."
    if (product.stockVerified === false) return `${product.name}: no se pudo verificar el stock DEMO. Reintenta la lectura del historial local.`
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) return `${product.name}: la cantidad debe ser un entero mayor que cero.`
    if (product.available === 0) return `${product.name}: agotado, 0 disponibles en el stock DEMO. Elimina este producto de la selección.`
    if (item.quantity > product.available) return `${product.name}: seleccionaste ${item.quantity}, pero solo hay ${product.available} disponibles en el stock DEMO. Reduce la cantidad.`
  }
  return null
}
