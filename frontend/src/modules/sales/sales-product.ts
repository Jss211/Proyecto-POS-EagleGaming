import type { DemoProduct } from "./sales-demo"

export type SalesProduct = Omit<DemoProduct, "category"> & { category: string }
