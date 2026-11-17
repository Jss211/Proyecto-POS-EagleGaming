export type ProductCategory = "Tarjetas gráficas" | "Procesadores" | "Memorias RAM" | "Teclados" | "Mouse" | "Monitores" | "Audífonos" | "Almacenamiento"

export interface DemoProduct {
  id: string
  name: string
  sku: string
  barcode: string
  category: ProductCategory
  priceCents: number
  available: number
  stockVerified?: boolean
  detail: string
  brand?: string
  description?: string
  specifications?: string[]
  status?: string
}

// Fixed catalog for the frontend demonstration; never queries or changes real stock.
export const salesDemoProducts: DemoProduct[] = [
  { id: "gpu-4060", name: "GeForce RTX 4060", sku: "EG-GPU-001", barcode: "DEMO000001", category: "Tarjetas gráficas", priceCents: 189900, available: 5, detail: "8 GB GDDR6 · Doble ventilador" },
  { id: "cpu-5600", name: "AMD Ryzen 5 5600", sku: "EG-CPU-001", barcode: "DEMO000002", category: "Procesadores", priceCents: 54900, available: 8, detail: "6 núcleos · Socket AM4" },
  { id: "ram-16", name: "Kingston Fury Beast 16 GB", sku: "EG-RAM-001", barcode: "DEMO000003", category: "Memorias RAM", priceCents: 18900, available: 12, detail: "DDR4 · 3200 MHz" },
  { id: "keyboard-rgb", name: "Teclado mecánico RGB", sku: "EG-TEC-001", barcode: "DEMO000004", category: "Teclados", priceCents: 25900, available: 6, detail: "Formato TKL · Switch red" },
  { id: "mouse-gaming", name: "Mouse gaming G203", sku: "EG-MOU-001", barcode: "DEMO000005", category: "Mouse", priceCents: 12900, available: 10, detail: "8000 DPI · Iluminación RGB" },
  { id: "monitor-27", name: "Monitor gaming 27 pulgadas", sku: "EG-MON-001", barcode: "DEMO000006", category: "Monitores", priceCents: 99900, available: 3, detail: "Full HD · 165 Hz" },
  { id: "headset-usb", name: "Audífonos gaming USB", sku: "EG-AUD-001", barcode: "DEMO000007", category: "Audífonos", priceCents: 19900, available: 7, detail: "Micrófono · Sonido envolvente" },
  { id: "ssd-1tb", name: "SSD NVMe 1 TB", sku: "EG-SSD-001", barcode: "DEMO000008", category: "Almacenamiento", priceCents: 28900, available: 0, detail: "M.2 · PCIe 4.0" },
]

export const salesDemoCategories = Array.from(new Set(salesDemoProducts.map(product => product.category)))
