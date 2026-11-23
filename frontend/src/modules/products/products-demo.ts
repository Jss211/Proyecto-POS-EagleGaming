export type ProductFields = {
  name: string
  sku: string
  barcode: string
  category: string
  price: string
  costPrice: string
  stock: string
  description: string
}

export type Product = ProductFields & {
  id: string
  status: "Activo" | "Inactivo" | "Pendiente"
  minStock: number
}

export const emptyFields: ProductFields = {
  name: "", sku: "", barcode: "", category: "", price: "", costPrice: "", stock: "", description: "",
}

export const productFields = [
  { key: "name", label: "Nombre", required: true },
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "Código de barras", required: true },
  { key: "category", label: "Categoría", required: true },
  { key: "price", label: "Precio (S/)", mode: "decimal", required: true },
  { key: "costPrice", label: "Costo (S/)", mode: "decimal", required: true },
  { key: "stock", label: "Stock", mode: "numeric", required: true },
  { key: "description", label: "Descripción" },
] as const satisfies ReadonlyArray<{ key: keyof ProductFields; label: string; required?: boolean; mode?: "decimal" | "numeric" }>

export const normalize = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
export const formatPrice = (value: string) => value === "" ? "—" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(value))
export const isLowStock = (product: Product) => product.status === "Activo" && product.stock !== "" && Number(product.stock) <= product.minStock

const samples = [
  ["Teclado mecánico TKL", "Interruptores lineales y cable USB-C", "TEC-101", "2000000000101", "Periféricos", "249", "150", "12", "Activo"],
  ["Mouse óptico", "Sensor de 8000 DPI", "MOU-102", "2000000000102", "Periféricos", "119", "75", "3", "Activo"],
  ["Monitor IPS 24 pulgadas", "Full HD y frecuencia de 144 Hz", "MON-103", "2000000000103", "Monitores", "699", "510", "7", "Activo"],
  ["SSD NVMe 1 TB", "Formato M.2 y PCIe 4.0", "SSD-104", "2000000000104", "Almacenamiento", "299", "215", "0", "Activo"],
  ["Memoria DDR4 16 GB", "Frecuencia de 3200 MHz", "RAM-105", "2000000000105", "Componentes", "159", "109", "18", "Activo"],
  ["Audífonos USB", "Micrófono ajustable", "AUD-106", "2000000000106", "Audio", "139", "90", "2", "Inactivo"],
  ["Fuente de poder 650 W", "Certificación 80 Plus Bronze", "FUE-107", "2000000000107", "Componentes", "279", "190", "9", "Activo"],
  ["", "", "", "2000000000108", "", "", "", "", "Pendiente"],
  ["", "", "", "2000000000109", "", "", "", "", "Pendiente"],
] as const

export const demoProducts: Product[] = samples.map(([name, description, sku, barcode, category, price, costPrice, stock, status]) => ({
  id: barcode, name, description, sku, barcode, category, price, costPrice, stock, status, minStock: 5,
}))
