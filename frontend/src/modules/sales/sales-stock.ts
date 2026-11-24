import { salesDemoProducts } from "./sales-demo"
import type { DemoSale } from "./sales-records"

// Stock is derived, never persisted separately or deducted by an effect.
export function deriveDemoStock(sales: readonly DemoSale[]) {
  const sold = new Map<string, number>()
  const seen = new Set<string>()
  const warnings = new Set<string>()
  for (const sale of sales) {
    if (sale.status !== "Registrada DEMO") continue
    if (seen.has(sale.id)) {
      warnings.add(`${sale.number}: venta duplicada; se contabiliza una sola vez para el stock.`)
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
