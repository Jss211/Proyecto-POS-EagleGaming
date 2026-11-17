import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  Check,
  Hash,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"
import {
  DOCUMENT_TYPE_META,
  formatCorrelative,
  formatIgvPercent,
  type BillingEmitterConfig,
  type SeriesConfig,
} from "./billing-model"
import { EagleCrestSvg } from "./BillingSvgGraphics"

const IGV_PRESETS = [
  { label: "0% (Exonerado)", rate: 0 },
  { label: "10% (Reducido)", rate: 0.1 },
  { label: "18% (General)", rate: 0.18 },
]

interface BillingSeriesPanelProps {
  series: SeriesConfig[]
  emitter: BillingEmitterConfig
  onUpdateSeries: (id: string, nextCorrelative: number) => void
  onUpdateEmitter: (next: BillingEmitterConfig) => void
}

export default function BillingSeriesPanel({
  series,
  emitter,
  onUpdateSeries,
  onUpdateEmitter,
}: BillingSeriesPanelProps) {
  const [draftEmitter, setDraftEmitter] = useState<BillingEmitterConfig>(emitter)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    setDraftEmitter(emitter)
  }, [emitter])

  const igvPercentValue = Math.round(draftEmitter.igvRate * 10000) / 100

  const handleIgvPercentChange = (percent: number) => {
    const clamped = Math.max(0, Math.min(30, Number.isFinite(percent) ? percent : 0))
    setDraftEmitter(prev => ({ ...prev, igvRate: Math.round(clamped * 100) / 10000 }))
  }

  const handleSaveEmitter = () => {
    onUpdateEmitter(draftEmitter)
    setSavedNotice(true)
    window.setTimeout(() => setSavedNotice(false), 2400)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Series & Correlatives */}
      <div className="space-y-4 lg:col-span-7">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900">
                <Hash size={18} className="text-[#ed1450]" aria-hidden="true" />
                Series y correlativos activos
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Controla la numeración automática para cada tipo de comprobante DEMO.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Numeración activa
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {series.map((item, idx) => {
              const meta = DOCUMENT_TYPE_META[item.type]
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.28 }}
                  className="eagle-dashboard-card flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        {meta.shortLabel}
                      </span>
                      <span className="font-mono text-xs font-bold text-zinc-900">{item.series}</span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-zinc-900">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
                  </div>

                  <div className="mt-4 border-t border-zinc-200 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Próximo comprobante
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-[#ed1450]">
                        {formatCorrelative(item.series, item.nextCorrelative)}
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span>N.º</span>
                        <input
                          type="number"
                          min={1}
                          max={999999}
                          aria-label={`Siguiente correlativo para ${item.series}`}
                          value={item.nextCorrelative}
                          onChange={e => {
                            const val = Math.max(1, Math.min(999999, Number(e.target.value) || 1))
                            onUpdateSeries(item.id, val)
                          }}
                          className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-right font-mono text-xs font-semibold text-zinc-800 focus:border-[#ed1450] focus:outline-none"
                        />
                      </label>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Emitter Fiscal Card */}
      <div className="lg:col-span-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
          className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <EagleCrestSvg className="h-10 w-10 shrink-0" />
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900">
                Datos fiscales del emisor
              </h3>
              <p className="text-xs text-zinc-500">
                Aparecen en el encabezado de tus tickets 80mm y PDFs A4.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3.5">
            <label className="block text-xs font-medium text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={13} className="text-zinc-400" aria-hidden="true" />
                Razón social
              </span>
              <input
                type="text"
                value={draftEmitter.businessName}
                onChange={e => setDraftEmitter(prev => ({ ...prev, businessName: e.target.value }))}
                className="mt-1 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#ed1450] focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600">
                Nombre comercial
                <input
                  type="text"
                  value={draftEmitter.tradeName}
                  onChange={e => setDraftEmitter(prev => ({ ...prev, tradeName: e.target.value }))}
                  className="mt-1 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#ed1450] focus:outline-none"
                />
              </label>

              <label className="block text-xs font-medium text-zinc-600">
                RUC emisor
                <input
                  type="text"
                  maxLength={11}
                  value={draftEmitter.ruc}
                  onChange={e =>
                    setDraftEmitter(prev => ({ ...prev, ruc: e.target.value.replace(/\D/g, "") }))
                  }
                  className="mt-1 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-800 focus:border-[#ed1450] focus:outline-none"
                />
              </label>
            </div>

            <label className="block text-xs font-medium text-zinc-600">
              Dirección del establecimiento
              <input
                type="text"
                value={draftEmitter.address}
                onChange={e => setDraftEmitter(prev => ({ ...prev, address: e.target.value }))}
                className="mt-1 block min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus:border-[#ed1450] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-medium text-zinc-600">
              Pie de comprobante (garantías / políticas)
              <textarea
                rows={2}
                value={draftEmitter.ticketFooter}
                onChange={e => setDraftEmitter(prev => ({ ...prev, ticketFooter: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-800 focus:border-[#ed1450] focus:outline-none"
              />
            </label>

            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-semibold text-zinc-700">
                  <SlidersHorizontal size={14} className="text-[#ed1450]" aria-hidden="true" />
                  Tasa de IGV predeterminada
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    aria-label="Porcentaje de IGV"
                    value={igvPercentValue}
                    onChange={e => handleIgvPercentChange(Number(e.target.value))}
                    className="w-20 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-right font-mono text-xs font-bold text-zinc-900 focus:border-[#ed1450] focus:outline-none"
                  />
                  <span className="font-mono font-bold text-zinc-600">%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {IGV_PRESETS.map(preset => {
                  const active = Math.abs(draftEmitter.igvRate - preset.rate) < 0.0001
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDraftEmitter(prev => ({ ...prev, igvRate: preset.rate }))}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        active
                          ? "border-[#ed1450] bg-rose-50 text-[#cf1045]"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              <p className="text-[11px] leading-4 text-zinc-500">
                Se aplicará ({formatIgvPercent(draftEmitter.igvRate)}) a los próximos comprobantes emitidos. Los ya emitidos conservan su tasa original.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                <ShieldCheck size={14} className="text-[#ed1450]" aria-hidden="true" />
                Guardado local DEMO
              </span>
              <button
                type="button"
                onClick={handleSaveEmitter}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ed1450] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#d01046]"
              >
                {savedNotice ? (
                  <>
                    <Check size={15} aria-hidden="true" />
                    Cambios guardados
                  </>
                ) : (
                  <>
                    <Save size={15} aria-hidden="true" />
                    Guardar emisor
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
