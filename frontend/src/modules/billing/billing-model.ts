import type { CompanyDetails } from "@/lib/company"

export type DocumentType = "FACTURA" | "BOLETA" | "TICKET" | "NOTA_CREDITO"

export type BillingStatus = "EMITIDO" | "ANULADO" | "PENDIENTE"

export type BillingPaymentMethod = "Efectivo" | "Yape" | "Plin" | "Tarjeta" | "Transferencia"

export type CustomerDocType = "SIN_DOC" | "DNI" | "RUC"

export interface BillingLineItem {
  id: string
  sku: string
  name: string
  quantity: number
  unitPriceCents: number
}

export interface DemoInvoice {
  id: string
  series: string
  correlative: number
  number: string
  type: DocumentType
  status: BillingStatus
  issuedAt: string
  customerName: string
  customerDocType: CustomerDocType
  customerDocNumber: string
  customerAddress?: string
  paymentMethod: BillingPaymentMethod
  items: BillingLineItem[]
  subtotalCents: number
  igvCents: number
  totalCents: number
  igvRate?: number
  hashCode: string
  relatedNumber?: string
  voidReason?: string
}

export interface SeriesConfig {
  id: string
  type: DocumentType
  series: string
  nextCorrelative: number
  label: string
  description: string
  active: boolean
}

export interface BillingEmitterConfig extends CompanyDetails {
  igvRate: number
}

export interface BillingStore {
  version: 1
  invoices: DemoInvoice[]
  series: SeriesConfig[]
  emitter: BillingEmitterConfig
}

export const IGV_RATE = 0.18

export const DOCUMENT_TYPE_META: Record<
  DocumentType,
  {
    label: string
    shortLabel: string
    badgeClass: string
    dotClass: string
    barColor: string
  }
> = {
  FACTURA: {
    label: "Factura Electrónica",
    shortLabel: "Factura",
    badgeClass: "border-rose-200 bg-rose-50 text-[#cf1045]",
    dotClass: "bg-[#ed1450]",
    barColor: "#ed1450",
  },
  BOLETA: {
    label: "Boleta de Venta",
    shortLabel: "Boleta",
    badgeClass: "border-zinc-200 bg-zinc-900 text-white",
    dotClass: "bg-zinc-900",
    barColor: "#18181b",
  },
  TICKET: {
    label: "Ticket de Venta",
    shortLabel: "Ticket",
    badgeClass: "border-zinc-200 bg-zinc-100 text-zinc-700",
    dotClass: "bg-zinc-500",
    barColor: "#71717a",
  },
  NOTA_CREDITO: {
    label: "Nota de Crédito",
    shortLabel: "N. Crédito",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-500",
    barColor: "#d97706",
  },
}

export const STATUS_META: Record<
  BillingStatus,
  {
    label: string
    badgeClass: string
    dotClass: string
  }
> = {
  EMITIDO: {
    label: "Emitido",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  ANULADO: {
    label: "Anulado",
    badgeClass: "border-rose-200 bg-rose-50 text-[#cf1045]",
    dotClass: "bg-[#ed1450]",
  },
  PENDIENTE: {
    label: "Pendiente",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    dotClass: "bg-amber-500",
  },
}

export const BILLING_PAYMENT_METHODS: BillingPaymentMethod[] = [
  "Efectivo",
  "Yape",
  "Plin",
  "Tarjeta",
  "Transferencia",
]

export function formatMoney(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(cents) / 100
  const formatted = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
  return `${negative ? "- " : ""}S/ ${formatted}`
}

export function formatCorrelative(series: string, correlative: number): string {
  return `${series}-${String(correlative).padStart(6, "0")}`
}

export function calculateTaxBreakdown(totalCents: number, igvRate = IGV_RATE) {
  const safeRate = Number.isFinite(igvRate) && igvRate >= 0 ? igvRate : IGV_RATE
  const subtotalCents = Math.round(totalCents / (1 + safeRate))
  const igvCents = totalCents - subtotalCents
  return { subtotalCents, igvCents, totalCents }
}

export function formatIgvPercent(rate = IGV_RATE): string {
  const percent = Math.round(rate * 10000) / 100
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`
}

export function formatBillingDate(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date(iso))
}

export function formatBillingTime(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  }).format(new Date(iso))
}

export function formatBillingDateTime(iso: string): string {
  return `${formatBillingDate(iso)} · ${formatBillingTime(iso)}`
}

export function generateDemoHash(seed: string): string {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let out = ""
  let value = hash >>> 0
  for (let i = 0; i < 24; i++) {
    value = Math.imul(value ^ (i * 2654435761), 1597334677) >>> 0
    out += alphabet[value % alphabet.length]
  }
  return `${out}=`
}
