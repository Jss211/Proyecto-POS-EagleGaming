import { shiftDate, todayInLima } from "./dashboard-dates"

// Fixtures dinámicos de demostración para el Dashboard EagleGaming
export const demoProducts = [
  { id: "monitor-teros", name: "Monitor gaming TEROS TE-2417S 23.8\"", category: "Monitores", priceCents: 45900, costCents: 34000 },
  { id: "gpu", name: "Tarjeta gráfica GeForce RTX 4060 8GB", category: "Componentes", priceCents: 189900, costCents: 149000 },
  { id: "keyboard", name: "Teclado mecánico RGB Switch Red", category: "Periféricos", priceCents: 25900, costCents: 16500 },
  { id: "mouse", name: "Mouse gaming óptico 8000 DPI", category: "Periféricos", priceCents: 12900, costCents: 7500 },
  { id: "headset", name: "Headset gaming 7.1 Surround USB", category: "Audio", priceCents: 19900, costCents: 12000 },
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

// Desplazamientos en días respecto a la fecha actual para que siempre existan datos en la semana y mes actual
const baseToday = todayInLima()
const relativeOffsets: [number, number[]][] = [
  [-28, [1, 2, 2, 1, 1]],
  [-24, [1, 1, 3, 2, 1]],
  [-21, [2, 1, 2, 3, 2]],
  [-17, [1, 2, 4, 1, 2]],
  [-14, [2, 1, 3, 2, 1]],
  [-12, [1, 2, 2, 1, 3]],
  [-10, [1, 1, 4, 3, 2]],
  [-8, [2, 2, 3, 1, 2]],
  [-6, [1, 1, 5, 2, 1]],
  [-5, [2, 2, 3, 2, 2]],
  [-4, [1, 3, 4, 1, 3]],
  [-3, [2, 1, 5, 2, 2]],
  [-2, [1, 2, 3, 3, 1]],
  [-1, [3, 2, 4, 2, 2]],
  [0, [2, 3, 5, 4, 3]],
]

const methods: PaymentMethod[] = ["Tarjeta", "Transferencia", "Efectivo", "Tarjeta", "Transferencia"]
const times = ["09:45", "11:20", "13:15", "15:40", "17:10"]

export const demoSales: DashboardSale[] = relativeOffsets.flatMap(([offsetDays, units], dayIndex) => {
  const date = shiftDate(baseToday, offsetDays)
  return demoProducts.map((product, index) => ({
    id: `EG-POS-${String(dayIndex * 5 + index + 1).padStart(3, "0")}`,
    occurredAt: `${date}T${times[index]}:00-05:00`,
    customerId: `demo-customer-${index + 1 + (dayIndex >= 12 ? 10 : dayIndex >= 6 ? 5 : 0)}`,
    customer: `Cliente Gaming ${index + 1 + (dayIndex >= 12 ? 10 : dayIndex >= 6 ? 5 : 0)}`,
    method: methods[index % methods.length],
    items: [{ productId: product.id, quantity: units[index], unitPriceCents: product.priceCents, unitCostCents: product.costCents }],
  }))
})

export const demoCustomers = [-28, -21, -14, -7, -2, 0].flatMap((offset, cohort) => {
  const registeredOn = shiftDate(baseToday, offset)
  return Array.from({ length: 4 }, (_, index) => ({
    id: `demo-customer-${cohort * 4 + index + 1}`,
    registeredOn,
  }))
})

export const demoLowStock = [
  "Monitor gaming TEROS TE-2417S (2 unidades)",
  "Teclado mecánico RGB Switch Red (3 unidades)",
  "Headset gaming 7.1 Surround USB (1 unidad)",
]

export const demoAfterSales = [
  { id: "DEMO-G01", status: "warranty" },
  { id: "DEMO-G02", status: "warranty" },
  { id: "DEMO-T01", status: "diagnosis" },
  { id: "DEMO-T02", status: "diagnosis" },
  { id: "DEMO-T03", status: "repair" },
  { id: "DEMO-T04", status: "delivery" },
]

export type ActivityType = "sale" | "product" | "stock" | "purchase" | "price" | "warranty" | "cancelled"

export const demoActivities: { id: string; type: ActivityType; description: string; occurredAt: string }[] = [
  ...demoSales.slice(-8).map(sale => ({
    id: `activity-${sale.id}`,
    type: "sale" as const,
    description: `Venta ${sale.id} completada en el punto de venta (${sale.method}).`,
    occurredAt: sale.occurredAt,
  })),
  {
    id: "DEMO-A1",
    type: "product",
    description: "Monitor TEROS TE-2417S 23.8\" registrado en catálogo físico.",
    occurredAt: `${baseToday}T14:30:00-05:00`,
  },
  {
    id: "DEMO-A2",
    type: "stock",
    description: "Alerta de stock bajo para Teclados mecánicos RGB.",
    occurredAt: `${shiftDate(baseToday, -1)}T16:15:00-05:00`,
  },
  {
    id: "DEMO-A3",
    type: "purchase",
    description: "Recepción de lote de componentes y periféricos gaming.",
    occurredAt: `${shiftDate(baseToday, -2)}T10:00:00-05:00`,
  },
]
