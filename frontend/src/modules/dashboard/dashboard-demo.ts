// Fixed fixtures. They never represent the authenticated user or Supabase records.
export const demoProducts = [
  { id: "gpu", name: "Tarjeta gráfica RTX 4060", category: "Componentes", priceCents: 189900, costCents: 149000 },
  { id: "keyboard", name: "Teclado mecánico RGB", category: "Periféricos", priceCents: 25900, costCents: 16500 },
  { id: "mouse", name: "Mouse gaming", category: "Periféricos", priceCents: 12900, costCents: 7500 },
  { id: "monitor", name: "Monitor gaming 27 pulgadas", category: "Monitores", priceCents: 99900, costCents: 76000 },
  { id: "headset", name: "Headset gaming USB", category: "Audio", priceCents: 19900, costCents: 12000 },
]

export type PaymentMethod = "Tarjeta" | "Efectivo" | "Transferencia"
export interface DashboardSale {
  id: string
  occurredAt: string
  customerId: string
  customer: string
  method: PaymentMethod
  items: { productId: string; quantity: number; unitPriceCents: number; unitCostCents: number }[]
}

// Each tuple fixes the date and units per product, in catalog order.
const saleDays: [string, number[]][] = [
  ["2026-10-18", [1, 2, 3, 1, 2]], ["2026-10-21", [1, 1, 2, 1, 1]],
  ["2026-10-25", [1, 3, 4, 1, 2]], ["2026-10-30", [2, 2, 3, 1, 2]],
  ["2026-11-03", [1, 2, 4, 1, 3]], ["2026-11-08", [1, 3, 5, 2, 2]],
  ["2026-11-10", [1, 2, 4, 1, 2]], ["2026-11-11", [1, 3, 3, 2, 1]],
  ["2026-11-12", [2, 2, 5, 1, 3]], ["2026-11-13", [1, 4, 4, 1, 2]],
  ["2026-11-14", [2, 3, 6, 2, 3]], ["2026-11-15", [1, 2, 4, 1, 2]],
  ["2026-11-16", [1, 3, 5, 1, 2]],
]
const methods: PaymentMethod[] = ["Tarjeta", "Transferencia", "Efectivo", "Tarjeta", "Efectivo"]
const times = ["10:15", "11:25", "12:40", "13:30", "14:42"]
export const demoSales: DashboardSale[] = saleDays.flatMap(([date, units], dayIndex) =>
  demoProducts.map((product, index) => ({
    id: `DEMO-${String(dayIndex * 5 + index + 1).padStart(3, "0")}`,
    occurredAt: `${date}T${times[index]}:00-05:00`,
    customerId: `demo-customer-${index + 1 + (dayIndex >= 12 ? 10 : dayIndex >= 6 ? 5 : 0)}`,
    customer: `Cliente de ejemplo ${index + 1 + (dayIndex >= 12 ? 10 : dayIndex >= 6 ? 5 : 0)}`,
    method: methods[index],
    items: [{ productId: product.id, quantity: units[index], unitPriceCents: product.priceCents, unitCostCents: product.costCents }],
  }))
)
export const demoCustomers = ["2026-10-18", "2026-11-10", "2026-11-16"].flatMap((registeredOn, cohort) =>
  Array.from({ length: 5 }, (_, index) => ({ id: `demo-customer-${cohort * 5 + index + 1}`, registeredOn }))
)
export const demoLowStock = ["Teclado mecánico RGB", "Monitor gaming 27 pulgadas", "Headset gaming USB"]
export const demoAfterSales = [
  { id: "DEMO-G01", status: "warranty" }, { id: "DEMO-G02", status: "warranty" },
  { id: "DEMO-T01", status: "diagnosis" }, { id: "DEMO-T02", status: "diagnosis" },
  { id: "DEMO-T03", status: "repair" }, { id: "DEMO-T04", status: "delivery" },
]
export type ActivityType = "sale" | "product" | "stock" | "purchase" | "price" | "warranty" | "cancelled"
export const demoActivities: { id: string; type: ActivityType; description: string; occurredAt: string }[] = [
  ...demoSales.map(sale => ({ id: `activity-${sale.id}`, type: "sale" as const, description: `Venta ${sale.id} registrada en los datos de ejemplo.`, occurredAt: sale.occurredAt })),
  { id: "DEMO-A1", type: "product", description: "Producto de ejemplo incorporado al catálogo gaming.", occurredAt: "2026-11-16T15:00:00-05:00" },
  { id: "DEMO-A2", type: "stock", description: "Existencias de teclados actualizadas en el ejemplo.", occurredAt: "2026-11-16T14:50:00-05:00" },
  { id: "DEMO-A3", type: "purchase", description: "Recepción de periféricos de ejemplo registrada.", occurredAt: "2026-11-15T16:00:00-05:00" },
  { id: "DEMO-A4", type: "price", description: "Precio de un monitor de ejemplo actualizado.", occurredAt: "2026-11-14T16:00:00-05:00" },
  { id: "DEMO-A5", type: "warranty", description: "Garantía de ejemplo registrada para revisión.", occurredAt: "2026-11-13T16:00:00-05:00" },
  { id: "DEMO-A6", type: "cancelled", description: "Venta de ejemplo anulada antes del cobro; excluida de los ingresos.", occurredAt: "2026-11-12T16:00:00-05:00" },
]
