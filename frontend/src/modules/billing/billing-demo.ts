import {
  calculateTaxBreakdown,
  formatCorrelative,
  generateDemoHash,
  type BillingEmitterConfig,
  type BillingLineItem,
  type BillingPaymentMethod,
  type BillingStore,
  type CustomerDocType,
  type DemoInvoice,
  type DocumentType,
  type SeriesConfig,
} from "./billing-model"

export const BILLING_STORAGE_KEY = "eagle-gaming-billing-demo-v1"

export interface BillingCatalogProduct {
  id: string
  sku: string
  name: string
  category: string
  unitPriceCents: number
}

export const BILLING_DEMO_PRODUCTS: BillingCatalogProduct[] = [
  { id: "p-rtx4070", sku: "GPU-4070S-12G", name: "ASUS Dual GeForce RTX 4070 Super 12GB", category: "Tarjetas Gráficas", unitPriceCents: 279900 },
  { id: "p-mon27", sku: "MON-TUF-27Q", name: "Monitor ASUS TUF Gaming 27\" 180Hz QHD", category: "Monitores", unitPriceCents: 114900 },
  { id: "p-mouse", sku: "PER-GPX2-BLK", name: "Logitech G Pro X Superlight 2 Negro", category: "Periféricos", unitPriceCents: 54900 },
  { id: "p-kbd", sku: "PER-HX-ALLOY", name: "Teclado Mecánico HyperX Alloy Origins Core", category: "Periféricos", unitPriceCents: 36900 },
  { id: "p-headset", sku: "AUD-CLD3-WRL", name: "Audífonos HyperX Cloud III Wireless", category: "Audio", unitPriceCents: 48900 },
  { id: "p-ssd", sku: "STO-SN850-1TB", name: "SSD NVMe WD Black SN850X 1TB PCIe 4.0", category: "Almacenamiento", unitPriceCents: 38900 },
  { id: "p-ram", sku: "RAM-VNG-32D5", name: "Memoria Corsair Vengeance RGB 32GB DDR5", category: "Componentes", unitPriceCents: 49900 },
  { id: "p-pad", sku: "ACC-MPAD-XL", name: "Mousepad Gaming Eagle XL Antideslizante", category: "Accesorios", unitPriceCents: 6900 },
]

export const DEMO_RUC_DIRECTORY: Record<string, { name: string; address: string }> = {
  "20601234567": {
    name: "NEXO ESPORTS & STREAMING S.A.C.",
    address: "Av. Garcilaso de la Vega 1348, Int. 204, Cercado de Lima",
  },
  "20559876543": {
    name: "ESTUDIO CREATIVO VALKYRIE E.I.R.L.",
    address: "Calle Los Pinos 412, Miraflores, Lima",
  },
  "20608841290": {
    name: "ARENA GAMING PERU S.A.C.",
    address: "Av. Javier Prado Este 2890, San Borja, Lima",
  },
}

const DEFAULT_EMITTER: BillingEmitterConfig = {
  businessName: "EAGLE GAMING PERU S.A.C.",
  tradeName: "EAGLE GAMING STORE",
  ruc: "20609482711",
  address: "Av. Garcilaso de la Vega 1251, Tienda 3B-14, Lima",
  phone: "(01) 480-9240",
  igvRate: 0.18,
  ticketFooter: "Conserve este comprobante para trámites de garantía técnica (12 meses en hardware).",
}

const DEFAULT_SERIES: SeriesConfig[] = [
  {
    id: "ser-f001",
    type: "FACTURA",
    series: "F001",
    nextCorrelative: 48,
    label: "Facturas Electrónicas",
    description: "Comprobantes con RUC y desglose de IGV 18% para empresas.",
    active: true,
  },
  {
    id: "ser-b001",
    type: "BOLETA",
    series: "B001",
    nextCorrelative: 215,
    label: "Boletas de Venta",
    description: "Comprobantes para consumidor final con o sin DNI.",
    active: true,
  },
  {
    id: "ser-t001",
    type: "TICKET",
    series: "T001",
    nextCorrelative: 942,
    label: "Tickets de Mostrador",
    description: "Notas de venta internas rápidas sin datos fiscales.",
    active: true,
  },
  {
    id: "ser-nc01",
    type: "NOTA_CREDITO",
    series: "FC01",
    nextCorrelative: 12,
    label: "Notas de Crédito",
    description: "Anulaciones, devoluciones y ajustes de comprobantes.",
    active: true,
  },
]

function buildInvoice(params: {
  id: string
  series: string
  correlative: number
  type: DocumentType
  status: DemoInvoice["status"]
  issuedAt: string
  customerName: string
  customerDocType: CustomerDocType
  customerDocNumber: string
  customerAddress?: string
  paymentMethod: BillingPaymentMethod
  items: BillingLineItem[]
  igvRate?: number
  relatedNumber?: string
  voidReason?: string
}): DemoInvoice {
  const number = formatCorrelative(params.series, params.correlative)
  const rawTotal = params.items.reduce((acc, item) => acc + item.unitPriceCents * item.quantity, 0)
  const signedTotal = params.type === "NOTA_CREDITO" ? -Math.abs(rawTotal) : rawTotal
  const rate = params.igvRate ?? DEFAULT_EMITTER.igvRate
  const { subtotalCents, igvCents, totalCents } = calculateTaxBreakdown(signedTotal, rate)
  return {
    ...params,
    number,
    subtotalCents,
    igvCents,
    totalCents,
    igvRate: rate,
    hashCode: generateDemoHash(`${number}-${params.issuedAt}-${totalCents}`),
  }
}

export function createInitialBillingStore(): BillingStore {
  const invoices: DemoInvoice[] = [
    buildInvoice({
      id: "inv-1",
      series: "F001",
      correlative: 47,
      type: "FACTURA",
      status: "EMITIDO",
      issuedAt: "2026-11-17T13:42:00-05:00",
      customerName: "NEXO ESPORTS & STREAMING S.A.C.",
      customerDocType: "RUC",
      customerDocNumber: "20601234567",
      customerAddress: "Av. Garcilaso de la Vega 1348, Int. 204, Cercado de Lima",
      paymentMethod: "Transferencia",
      items: [
        { id: "l1", sku: "GPU-4070S-12G", name: "ASUS Dual GeForce RTX 4070 Super 12GB", quantity: 1, unitPriceCents: 279900 },
        { id: "l2", sku: "RAM-VNG-32D5", name: "Memoria Corsair Vengeance RGB 32GB DDR5", quantity: 2, unitPriceCents: 49900 },
      ],
    }),
    buildInvoice({
      id: "inv-2",
      series: "B001",
      correlative: 214,
      type: "BOLETA",
      status: "EMITIDO",
      issuedAt: "2026-11-17T12:15:00-05:00",
      customerName: "Renato Quispe Paredes",
      customerDocType: "DNI",
      customerDocNumber: "74829104",
      paymentMethod: "Yape",
      items: [
        { id: "l3", sku: "MON-TUF-27Q", name: "Monitor ASUS TUF Gaming 27\" 180Hz QHD", quantity: 1, unitPriceCents: 114900 },
      ],
    }),
    buildInvoice({
      id: "inv-3",
      series: "T001",
      correlative: 941,
      type: "TICKET",
      status: "EMITIDO",
      issuedAt: "2026-11-17T11:30:00-05:00",
      customerName: "Público General",
      customerDocType: "SIN_DOC",
      customerDocNumber: "—",
      paymentMethod: "Efectivo",
      items: [
        { id: "l4", sku: "PER-GPX2-BLK", name: "Logitech G Pro X Superlight 2 Negro", quantity: 1, unitPriceCents: 54900 },
        { id: "l5", sku: "ACC-MPAD-XL", name: "Mousepad Gaming Eagle XL Antideslizante", quantity: 1, unitPriceCents: 6900 },
      ],
    }),
    buildInvoice({
      id: "inv-4",
      series: "F001",
      correlative: 46,
      type: "FACTURA",
      status: "EMITIDO",
      issuedAt: "2026-11-16T18:20:00-05:00",
      customerName: "ARENA GAMING PERU S.A.C.",
      customerDocType: "RUC",
      customerDocNumber: "20608841290",
      customerAddress: "Av. Javier Prado Este 2890, San Borja, Lima",
      paymentMethod: "Tarjeta",
      items: [
        { id: "l6", sku: "AUD-CLD3-WRL", name: "Audífonos HyperX Cloud III Wireless", quantity: 3, unitPriceCents: 48900 },
        { id: "l7", sku: "PER-HX-ALLOY", name: "Teclado Mecánico HyperX Alloy Origins Core", quantity: 3, unitPriceCents: 36900 },
      ],
    }),
    buildInvoice({
      id: "inv-5",
      series: "B001",
      correlative: 213,
      type: "BOLETA",
      status: "EMITIDO",
      issuedAt: "2026-11-16T16:05:00-05:00",
      customerName: "Valeria Salgado Torres",
      customerDocType: "DNI",
      customerDocNumber: "71204833",
      paymentMethod: "Plin",
      items: [
        { id: "l8", sku: "STO-SN850-1TB", name: "SSD NVMe WD Black SN850X 1TB PCIe 4.0", quantity: 1, unitPriceCents: 38900 },
      ],
    }),
    buildInvoice({
      id: "inv-6",
      series: "FC01",
      correlative: 11,
      type: "NOTA_CREDITO",
      status: "EMITIDO",
      issuedAt: "2026-11-16T14:10:00-05:00",
      customerName: "ESTUDIO CREATIVO VALKYRIE E.I.R.L.",
      customerDocType: "RUC",
      customerDocNumber: "20559876543",
      customerAddress: "Calle Los Pinos 412, Miraflores, Lima",
      paymentMethod: "Transferencia",
      relatedNumber: "F001-000045",
      voidReason: "Cambio por modelo superior en stock",
      items: [
        { id: "l9", sku: "PER-HX-ALLOY", name: "Teclado Mecánico HyperX Alloy Origins Core", quantity: 1, unitPriceCents: 36900 },
      ],
    }),
    buildInvoice({
      id: "inv-7",
      series: "F001",
      correlative: 45,
      type: "FACTURA",
      status: "ANULADO",
      issuedAt: "2026-11-16T13:22:00-05:00",
      customerName: "ESTUDIO CREATIVO VALKYRIE E.I.R.L.",
      customerDocType: "RUC",
      customerDocNumber: "20559876543",
      customerAddress: "Calle Los Pinos 412, Miraflores, Lima",
      paymentMethod: "Transferencia",
      voidReason: "Anulado mediante Nota de Crédito FC01-000011",
      items: [
        { id: "l10", sku: "PER-HX-ALLOY", name: "Teclado Mecánico HyperX Alloy Origins Core", quantity: 1, unitPriceCents: 36900 },
      ],
    }),
    buildInvoice({
      id: "inv-8",
      series: "T001",
      correlative: 940,
      type: "TICKET",
      status: "EMITIDO",
      issuedAt: "2026-11-15T19:08:00-05:00",
      customerName: "Público General",
      customerDocType: "SIN_DOC",
      customerDocNumber: "—",
      paymentMethod: "Yape",
      items: [
        { id: "l11", sku: "ACC-MPAD-XL", name: "Mousepad Gaming Eagle XL Antideslizante", quantity: 2, unitPriceCents: 6900 },
      ],
    }),
  ]

  return {
    version: 1,
    invoices,
    series: DEFAULT_SERIES.map(s => ({ ...s })),
    emitter: { ...DEFAULT_EMITTER },
  }
}

export function loadBillingStore(): BillingStore {
  try {
    const raw = localStorage.getItem(BILLING_STORAGE_KEY)
    if (!raw) return createInitialBillingStore()
    const parsed = JSON.parse(raw) as Partial<BillingStore>
    if (parsed.version === 1 && Array.isArray(parsed.invoices) && Array.isArray(parsed.series) && parsed.emitter) {
      return parsed as BillingStore
    }
  } catch {
    // Fallback to clean demo state if localStorage is restricted or malformed.
  }
  return createInitialBillingStore()
}

export function saveBillingStore(store: BillingStore): void {
  try {
    localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Ignore storage quota errors in demo mode.
  }
}

export function emitDemoInvoice(
  store: BillingStore,
  input: {
    type: Exclude<DocumentType, "NOTA_CREDITO">
    customerName: string
    customerDocType: CustomerDocType
    customerDocNumber: string
    customerAddress?: string
    paymentMethod: BillingPaymentMethod
    items: BillingLineItem[]
    igvRate?: number
  },
): { store: BillingStore; created: DemoInvoice } {
  const seriesObj = store.series.find(s => s.type === input.type) ?? store.series[0]
  const correlative = seriesObj.nextCorrelative
  const created = buildInvoice({
    id: `inv-${Date.now()}`,
    series: seriesObj.series,
    correlative,
    type: input.type,
    status: "EMITIDO",
    issuedAt: new Date().toISOString(),
    customerName: input.customerName.trim() || "Público General",
    customerDocType: input.customerDocType,
    customerDocNumber: input.customerDocNumber.trim() || "—",
    customerAddress: input.customerAddress?.trim() || undefined,
    paymentMethod: input.paymentMethod,
    items: input.items,
    igvRate: input.igvRate ?? store.emitter.igvRate,
  })

  const nextSeries = store.series.map(s =>
    s.id === seriesObj.id ? { ...s, nextCorrelative: s.nextCorrelative + 1 } : s,
  )

  return {
    created,
    store: {
      ...store,
      series: nextSeries,
      invoices: [created, ...store.invoices],
    },
  }
}

export function voidDemoInvoice(
  store: BillingStore,
  invoiceId: string,
  reason: string,
): { store: BillingStore; creditNote: DemoInvoice } | null {
  const target = store.invoices.find(inv => inv.id === invoiceId)
  if (!target || target.status === "ANULADO" || target.type === "NOTA_CREDITO") return null

  const ncSeries = store.series.find(s => s.type === "NOTA_CREDITO")
  const seriesCode = ncSeries?.series ?? "FC01"
  const correlative = ncSeries?.nextCorrelative ?? 1
  const creditNote = buildInvoice({
    id: `inv-nc-${Date.now()}`,
    series: seriesCode,
    correlative,
    type: "NOTA_CREDITO",
    status: "EMITIDO",
    issuedAt: new Date().toISOString(),
    customerName: target.customerName,
    customerDocType: target.customerDocType,
    customerDocNumber: target.customerDocNumber,
    customerAddress: target.customerAddress,
    paymentMethod: target.paymentMethod,
    items: target.items,
    igvRate: target.igvRate ?? store.emitter.igvRate,
    relatedNumber: target.number,
    voidReason: reason,
  })

  const nextInvoices = store.invoices.map(inv =>
    inv.id === invoiceId
      ? {
          ...inv,
          status: "ANULADO" as const,
          voidReason: `${reason} (Ref. ${creditNote.number})`,
        }
      : inv,
  )

  const nextSeries = store.series.map(s =>
    s.type === "NOTA_CREDITO" ? { ...s, nextCorrelative: s.nextCorrelative + 1 } : s,
  )

  return {
    creditNote,
    store: {
      ...store,
      series: nextSeries,
      invoices: [creditNote, ...nextInvoices],
    },
  }
}
