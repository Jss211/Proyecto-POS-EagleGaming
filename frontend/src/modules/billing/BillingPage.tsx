import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import {
  Ban,
  Banknote,
  CheckCircle2,
  FileText,
  FileX2,
  Percent,
  Plus,
  Printer,
  Receipt,
  ReceiptText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import {
  DOCUMENT_TYPE_META,
  STATUS_META,
  formatBillingDate,
  formatBillingTime,
  formatIgvPercent,
  formatMoney,
  type BillingStatus,
  type BillingEmitterConfig,
  type DemoInvoice,
  type DocumentType,
} from "./billing-model"
import {
  createInitialBillingStore,
  emitDemoInvoice,
  loadBillingStore,
  saveBillingStore,
  voidDemoInvoice,
} from "./billing-demo"
import BillingPreviewModal, { type PreviewFormat } from "./BillingPreviewModal"
import BillingEmitModal from "./BillingEmitModal"
import BillingSeriesPanel from "./BillingSeriesPanel"
import BillingVoidModal from "./BillingVoidModal"

type BillingTab = "comprobantes" | "series"
type TypeFilter = "ALL" | DocumentType
type StatusFilter = "ALL" | BillingStatus

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "FACTURA", label: "Facturas" },
  { id: "BOLETA", label: "Boletas" },
  { id: "TICKET", label: "Tickets" },
  { id: "NOTA_CREDITO", label: "Notas de crédito" },
]

export default function BillingPage({ onEmitterChange }: { onEmitterChange: (emitter: BillingEmitterConfig) => void }) {
  const [store, setStore] = useState(loadBillingStore)
  const [tab, setTab] = useState<BillingTab>("comprobantes")
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")

  const [emitOpen, setEmitOpen] = useState(false)
  const [previewState, setPreviewState] = useState<{
    invoice: DemoInvoice | null
    format: PreviewFormat
  }>({ invoice: null, format: "ticket" })
  const [voidTarget, setVoidTarget] = useState<DemoInvoice | null>(null)
  const [notice, setNotice] = useState<{ message: string; invoice?: DemoInvoice } | null>(null)

  useEffect(() => {
    saveBillingStore(store)
    onEmitterChange(store.emitter)
  }, [store, onEmitterChange])

  const metrics = useMemo(() => {
    const activeSales = store.invoices.filter(
      inv => inv.status === "EMITIDO" && inv.type !== "NOTA_CREDITO",
    )
    const totalBilledCents = activeSales.reduce((acc, inv) => acc + inv.totalCents, 0)
    const totalIgvCents = activeSales.reduce((acc, inv) => acc + inv.igvCents, 0)
    const voidedCount = store.invoices.filter(inv => inv.status === "ANULADO").length
    const creditNoteCount = store.invoices.filter(inv => inv.type === "NOTA_CREDITO").length

    const byType = {
      FACTURA: activeSales.filter(i => i.type === "FACTURA").reduce((a, b) => a + b.totalCents, 0),
      BOLETA: activeSales.filter(i => i.type === "BOLETA").reduce((a, b) => a + b.totalCents, 0),
      TICKET: activeSales.filter(i => i.type === "TICKET").reduce((a, b) => a + b.totalCents, 0),
    }

    return {
      totalBilledCents,
      totalIgvCents,
      activeCount: activeSales.length,
      voidedCount,
      creditNoteCount,
      byType,
    }
  }, [store.invoices])

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase()
    return store.invoices.filter(inv => {
      if (typeFilter !== "ALL" && inv.type !== typeFilter) return false
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false
      if (!q) return true
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerDocNumber.toLowerCase().includes(q) ||
        inv.paymentMethod.toLowerCase().includes(q)
      )
    })
  }, [store.invoices, query, typeFilter, statusFilter])

  const distribution = useMemo(() => {
    const sum = metrics.byType.FACTURA + metrics.byType.BOLETA + metrics.byType.TICKET
    return ([
      { type: "FACTURA" as const, amount: metrics.byType.FACTURA },
      { type: "BOLETA" as const, amount: metrics.byType.BOLETA },
      { type: "TICKET" as const, amount: metrics.byType.TICKET },
    ]).map(entry => ({
      ...entry,
      percent: sum > 0 ? Math.round((entry.amount / sum) * 100) : 0,
    }))
  }, [metrics.byType])

  const handleEmit = (payload: Parameters<typeof emitDemoInvoice>[1]) => {
    const { store: nextStore, created } = emitDemoInvoice(store, payload)
    setStore(nextStore)
    setTab("comprobantes")
    setTypeFilter("ALL")
    setStatusFilter("ALL")
    setNotice({
      message: `${DOCUMENT_TYPE_META[created.type].label} ${created.number} emitida en modo DEMO.`,
      invoice: created,
    })
  }

  const handleConfirmVoid = (invoiceId: string, reason: string) => {
    const result = voidDemoInvoice(store, invoiceId, reason)
    if (!result) return
    setStore(result.store)
    setPreviewState(prev => (prev.invoice?.id === invoiceId ? { invoice: null, format: "ticket" } : prev))
    setNotice({
      message: `Comprobante anulado. Se generó la Nota de Crédito ${result.creditNote.number}.`,
      invoice: result.creditNote,
    })
  }

  const handleResetDemo = () => {
    const fresh = createInitialBillingStore()
    setStore(fresh)
    setQuery("")
    setTypeFilter("ALL")
    setStatusFilter("ALL")
    setNotice({ message: "Datos de facturación DEMO restaurados al estado inicial." })
  }

  const kpiCards = [
    {
      label: "Total facturado vigente",
      value: formatMoney(metrics.totalBilledCents),
      detail: `${metrics.activeCount} comprobantes activos`,
      icon: Banknote,
    },
    {
      label: "Comprobantes emitidos",
      value: String(store.invoices.length),
      detail: `${metrics.activeCount} vigentes · ${metrics.creditNoteCount} notas de crédito`,
      icon: ReceiptText,
    },
    {
      label: "IGV acumulado",
      value: formatMoney(metrics.totalIgvCents),
      detail: `Tasa actual: ${formatIgvPercent(store.emitter.igvRate)} · Editable en Series y emisor`,
      icon: Percent,
    },
    {
      label: "Anulados y ajustes",
      value: String(metrics.voidedCount),
      detail: `${metrics.creditNoteCount} notas de crédito vinculadas`,
      icon: FileX2,
    },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <h2 className="font-gaming text-2xl font-bold text-zinc-900">Facturación</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Emisión, control de series y vista previa de tickets 80mm y comprobantes A4.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-[#cf1045]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ed1450]" />
              DEMO · Emisión local sin envío a SUNAT
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Restaurar demo
            </button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEmitOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ed1450] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ed1450]/20 transition-colors hover:bg-[#d01046]"
            >
              <Plus size={17} aria-hidden="true" />
              Emitir comprobante
            </motion.button>
          </div>
        </motion.div>

        {/* Action Toast Banner */}
        <AnimatePresence>
          {notice && (
            <motion.div
              key="billing-notice"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.24 }}
              className="overflow-hidden"
            >
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[#ed1450]">
                    <CheckCircle2 size={16} aria-hidden="true" />
                  </span>
                  <span>{notice.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  {notice.invoice && (
                    <button
                      type="button"
                      onClick={() => setPreviewState({ invoice: notice.invoice!, format: "ticket" })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-[#cf1045] hover:bg-rose-100"
                    >
                      <Printer size={14} aria-hidden="true" />
                      Ver {notice.invoice.number}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotice(null)}
                    aria-label="Ocultar aviso"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Cards */}
        <section aria-label="Indicadores de facturación DEMO" className="eagle-dashboard-kpis">
          {kpiCards.map(({ label, value, detail, icon: Icon }, idx) => (
            <motion.article
              key={label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
              className="eagle-dashboard-card min-w-0 rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <span className="inline-flex rounded-xl bg-rose-50 p-3 text-[#ed1450]">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-medium text-zinc-500">{label}</h3>
              <p className="mt-2 break-words text-2xl font-bold tracking-tight tabular-nums text-zinc-900">
                {value}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
            </motion.article>
          ))}
        </section>

        {/* Distribution Strip */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.3 }}
          aria-label="Distribución de facturación por tipo de comprobante"
          className="rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Distribución por tipo de comprobante</h3>
              <p className="text-xs text-zinc-500">Participación sobre el volumen vigente emitido en modo DEMO.</p>
            </div>
            <span className="font-mono text-xs font-semibold text-zinc-500">
              RUC DEMO: {store.emitter.ruc}
            </span>
          </div>

          {/* Animated Stacked Progress Bar */}
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-zinc-100">
            {distribution.map(item => (
              <motion.div
                key={item.type}
                initial={{ width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ backgroundColor: DOCUMENT_TYPE_META[item.type].barColor }}
                className="h-full first:rounded-l-full last:rounded-r-full"
                title={`${DOCUMENT_TYPE_META[item.type].shortLabel}: ${item.percent}%`}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {distribution.map(item => {
              const meta = DOCUMENT_TYPE_META[item.type]
              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">{meta.label}</p>
                      <p className="text-[11px] text-zinc-500">{item.percent}% del volumen</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-zinc-900">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.section>

        {/* Main Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Secciones de Facturación"
            className="relative inline-flex rounded-xl border border-zinc-200 bg-white p-1.5"
          >
            {([
              { id: "comprobantes", label: "Bandeja de comprobantes", icon: Receipt },
              { id: "series", label: "Series y emisor", icon: SlidersHorizontal },
            ] as const).map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative z-10 inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    active ? "text-white" : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="billing-main-tab-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-[#ed1450]"
                    />
                  )}
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </nav>

          <p className="text-xs text-zinc-500">
            Mostrando <span className="font-semibold text-zinc-800">{filteredInvoices.length}</span> de{" "}
            <span className="font-semibold text-zinc-800">{store.invoices.length}</span> registros locales
          </p>
        </div>

        {/* Tab Views */}
        <AnimatePresence mode="wait">
          {tab === "comprobantes" ? (
            <motion.section
              key="tab-comprobantes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl border border-zinc-200 bg-white"
            >
              {/* Filter Bar */}
              <div className="space-y-4 border-b border-zinc-200 p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1 lg:max-w-md">
                    <Search
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Buscar por serie (F001), receptor, RUC o DNI..."
                      aria-label="Buscar comprobantes"
                      className="block min-h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-10 pr-4 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-[#ed1450] focus:bg-white focus:outline-none sm:text-sm"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="billing-status-filter" className="text-xs font-medium text-zinc-500">
                      Estado:
                    </label>
                    <select
                      id="billing-status-filter"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                      className="min-h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 focus:border-[#ed1450] focus:outline-none"
                    >
                      <option value="ALL">Todos los estados</option>
                      <option value="EMITIDO">Emitidos</option>
                      <option value="ANULADO">Anulados</option>
                    </select>
                  </div>
                </div>

                {/* Type Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_FILTERS.map(({ id, label }) => {
                    const active = typeFilter === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTypeFilter(id)}
                        className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active ? "text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="billing-type-filter-pill"
                            transition={{ type: "spring", stiffness: 460, damping: 34 }}
                            className="absolute inset-0 rounded-lg bg-[#141419]"
                          />
                        )}
                        <span className="relative z-10">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Table */}
              {filteredInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                    <ReceiptText size={24} aria-hidden="true" />
                  </span>
                  <h4 className="mt-4 text-sm font-bold text-zinc-900">No se encontraron comprobantes</h4>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">
                    Prueba limpiando los filtros o emite un nuevo comprobante de demostración.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("")
                      setTypeFilter("ALL")
                      setStatusFilter("ALL")
                    }}
                    className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <caption className="sr-only">Bandeja de comprobantes de demostración</caption>
                    <thead className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Comprobante</th>
                        <th scope="col" className="px-4 py-3.5">Emisión</th>
                        <th scope="col" className="px-4 py-3.5">Receptor</th>
                        <th scope="col" className="px-4 py-3.5">Pago</th>
                        <th scope="col" className="px-4 py-3.5 text-right">IGV</th>
                        <th scope="col" className="px-4 py-3.5 text-right">Total</th>
                        <th scope="col" className="px-4 py-3.5">Estado</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <AnimatePresence initial={false}>
                        {filteredInvoices.map((inv, idx) => {
                          const typeMeta = DOCUMENT_TYPE_META[inv.type]
                          const statusMeta = STATUS_META[inv.status]
                          return (
                            <motion.tr
                              key={inv.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
                              className="group transition-colors hover:bg-zinc-50/90"
                            >
                              <td className="px-5 py-4">
                                <div className="flex flex-col items-start gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewState({ invoice: inv, format: "ticket" })}
                                    className="font-mono text-xs font-bold text-zinc-900 transition-colors hover:text-[#ed1450]"
                                  >
                                    {inv.number}
                                  </button>
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeMeta.badgeClass}`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${typeMeta.dotClass}`} />
                                    {typeMeta.shortLabel}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-xs tabular-nums text-zinc-600">
                                <p className="font-medium text-zinc-800">{formatBillingDate(inv.issuedAt)}</p>
                                <p className="text-[11px] text-zinc-400">{formatBillingTime(inv.issuedAt)}</p>
                              </td>

                              <td className="max-w-[230px] px-4 py-4">
                                <p className="truncate text-xs font-semibold text-zinc-900">{inv.customerName}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                                  {inv.customerDocType === "SIN_DOC"
                                    ? "Sin documento"
                                    : `${inv.customerDocType}: ${inv.customerDocNumber}`}
                                </p>
                                {inv.relatedNumber && (
                                  <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
                                    Ref. {inv.relatedNumber}
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4 text-xs font-medium text-zinc-600">
                                {inv.paymentMethod}
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-right text-xs tabular-nums text-zinc-500">
                                <p>{formatMoney(inv.igvCents)}</p>
                                <p className="text-[10px] text-zinc-400">{formatIgvPercent(inv.igvRate)}</p>
                              </td>

                              <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold tabular-nums text-zinc-900">
                                <span className={inv.totalCents < 0 ? "text-amber-700" : inv.status === "ANULADO" ? "text-zinc-400 line-through" : ""}>
                                  {formatMoney(inv.totalCents)}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.badgeClass}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                                  {statusMeta.label}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    title="Ver ticket térmico 80mm"
                                    aria-label={`Ver ticket 80mm de ${inv.number}`}
                                    onClick={() => setPreviewState({ invoice: inv, format: "ticket" })}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-[#ed1450] hover:bg-rose-50 hover:text-[#ed1450]"
                                  >
                                    <Receipt size={15} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Ver comprobante A4"
                                    aria-label={`Ver formato A4 de ${inv.number}`}
                                    onClick={() => setPreviewState({ invoice: inv, format: "a4" })}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                                  >
                                    <FileText size={15} aria-hidden="true" />
                                  </button>
                                  {inv.status === "EMITIDO" && inv.type !== "NOTA_CREDITO" && (
                                    <button
                                      type="button"
                                      title="Anular y emitir Nota de Crédito"
                                      aria-label={`Anular comprobante ${inv.number}`}
                                      onClick={() => setVoidTarget(inv)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-[#cf1045]"
                                    >
                                      <Ban size={15} aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>
          ) : (
            <motion.section
              key="tab-series"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <BillingSeriesPanel
                series={store.series}
                emitter={store.emitter}
                onUpdateSeries={(id, nextCorrelative) =>
                  setStore(prev => ({
                    ...prev,
                    series: prev.series.map(s => (s.id === id ? { ...s, nextCorrelative } : s)),
                  }))
                }
                onUpdateEmitter={emitter => setStore(prev => ({ ...prev, emitter }))}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Modals */}
        <BillingPreviewModal
          invoice={previewState.invoice}
          initialFormat={previewState.format}
          emitter={store.emitter}
          onClose={() => setPreviewState({ invoice: null, format: "ticket" })}
          onRequestVoid={inv => setVoidTarget(inv)}
        />

        <BillingEmitModal
          open={emitOpen}
          seriesList={store.series}
          defaultIgvRate={store.emitter.igvRate}
          onClose={() => setEmitOpen(false)}
          onEmit={handleEmit}
        />

        <BillingVoidModal
          invoice={voidTarget}
          onClose={() => setVoidTarget(null)}
          onConfirm={handleConfirmVoid}
        />
      </div>
    </MotionConfig>
  )
}
