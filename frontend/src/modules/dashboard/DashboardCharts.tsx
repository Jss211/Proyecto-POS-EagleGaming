import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, CreditCard, Wallet, Landmark } from "lucide-react"
import Panel from "./DashboardPanel"
import { money, percent, type DashboardSummary } from "./dashboard-model"

const paymentStyles = [
  { color: "#ed1450", icon: CreditCard, bg: "bg-[#ed1450]/10", border: "border-rose-200" },
  { color: "#18181b", icon: Wallet, bg: "bg-zinc-100", border: "border-zinc-200" },
  { color: "#71717a", icon: Landmark, bg: "bg-zinc-100", border: "border-zinc-200" },
]

function useTooltipPosition() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const locate = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    const bounds = (event.target as Element).getBoundingClientRect()
    setPosition("clientX" in event && event.clientX !== 0
      ? { x: event.clientX, y: event.clientY }
      : { x: bounds.left + bounds.width / 2, y: bounds.top })
  }
  useEffect(() => {
    const dismiss = () => setPosition(null)
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss() }
    window.addEventListener("scroll", dismiss, true)
    window.addEventListener("resize", dismiss)
    window.addEventListener("keydown", escape)
    return () => {
      window.removeEventListener("scroll", dismiss, true)
      window.removeEventListener("resize", dismiss)
      window.removeEventListener("keydown", escape)
    }
  }, [])
  return { position, locate }
}

function ChartTooltip({ id, position, children }: { id: string; position: { x: number; y: number }; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [point, setPoint] = useState(position)
  useLayoutEffect(() => {
    const bounds = ref.current?.getBoundingClientRect()
    if (!bounds) return
    setPoint({
      x: Math.max(8, Math.min(position.x + 12, window.innerWidth - bounds.width - 8)),
      y: Math.max(8, position.y - bounds.height - 12 >= 8 ? position.y - bounds.height - 12 : Math.min(position.y + 16, window.innerHeight - bounds.height - 8)),
    })
  }, [position, children])
  return createPortal(
    <motion.div
      ref={ref}
      id={id}
      role="tooltip"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="eagle-chart-tooltip shadow-xl backdrop-blur-sm"
      style={{ left: point.x, top: point.y }}
    >
      {children}
    </motion.div>,
    document.body
  )
}

export function SalesChart({ summary, rangeLabel }: { summary: DashboardSummary; rangeLabel: string }) {
  const chartId = useId()
  const chartRef = useRef<SVGSVGElement>(null)
  const [chartWidth, setChartWidth] = useState(580)
  const [active, setActive] = useState<number | null>(null)
  const { position, locate } = useTooltipPosition()

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const observer = new ResizeObserver(() => setChartWidth(Math.max(1, Math.round(chart.getBoundingClientRect().width))))
    observer.observe(chart)
    return () => observer.disconnect()
  }, [])

  useEffect(() => setActive(null), [rangeLabel])

  const buckets = summary.buckets
  const peak = Math.max(1, ...buckets.map(b => b.amount))
  const maximum = Math.max(1000, Math.ceil(peak / 4000) * 1000) * 4
  const baseline = 248
  const slotWidth = Math.max(1, chartWidth - 48) / Math.max(1, buckets.length)
  const barWidth = Math.min(54, slotWidth * 0.62)
  const growth = summary.growth
  const GrowthIcon = (growth ?? 0) < 0 ? ArrowDownRight : ArrowUpRight
  const selected = active === null ? null : buckets[active]
  const detail = selected ? `${selected.day}: ${selected.start} al ${selected.end}. ${money(selected.amountCents)}` : "Pasa el cursor o toca una barra para ver el importe."

  return (
    <Panel title="Rendimiento de ventas" subtitle={`Ingresos del período · ${rangeLabel}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total facturado</span>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl font-gaming">
            {money(summary.revenueCents)}
          </p>
        </div>
        <div className="group relative text-right" tabIndex={0} aria-label={`Variación: ${growth === null ? "sin base comparable" : percent.format(growth) + " %"}. Período anterior: ${money(summary.previousRevenueCents)}`}>
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs bg-zinc-100 text-zinc-700 border border-zinc-200"
          >
            <GrowthIcon size={14} aria-hidden="true" />
            {growth === null ? "Sin base comparable" : `${growth > 0 ? "+" : ""}${percent.format(growth)} %`}
          </motion.span>
          <p className="mt-1 text-[11px] text-zinc-500">vs. período anterior</p>
          <span className="eagle-detail-tooltip">
            Actual: {money(summary.revenueCents)}. Anterior: {money(summary.previousRevenueCents)}.
          </span>
        </div>
      </div>

      <div className="min-w-0 w-full" onMouseMove={locate} onFocusCapture={locate} onClickCapture={locate}>
        <svg ref={chartRef} viewBox={`0 0 ${chartWidth} 330`} width="100%" height="330" className="block w-full" role="group" aria-labelledby={`${chartId}-title`}>
          <defs>
            <linearGradient id="barPeakGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff2a6d" />
              <stop offset="100%" stopColor="#ed1450" />
            </linearGradient>
            <linearGradient id="barStandardGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="100%" stopColor="#27272a" />
            </linearGradient>
            <filter id="glowPeak" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ed1450" floodOpacity="0.3" />
            </filter>
          </defs>
          <title id={`${chartId}-title`}>Ventas en soles. Total: {money(summary.revenueCents)}</title>

          {/* Líneas de cuadrícula horizontal */}
          {[0, maximum / 4, maximum / 2, maximum * 3 / 4, maximum].map(value => {
            const y = baseline - (value / maximum) * 216
            return (
              <g key={value} aria-hidden="true">
                <line x1="40" x2={chartWidth - 8} y1={y} y2={y} stroke="#f4f4f5" strokeDasharray={value ? "4 4" : undefined} />
                <text x="34" y={y + 4} textAnchor="end" fill="#a1a1aa" fontSize="10" fontWeight="500">
                  {value ? `${value / 1000}k` : "0"}
                </text>
              </g>
            )
          })}

          {/* Barras animadas con hover interactivo */}
          {buckets.map((bucket, index) => {
            const height = (bucket.amount / maximum) * 216
            const x = 40 + index * slotWidth + (slotWidth - barWidth) / 2
            const isPeak = bucket.amount === peak && peak > 0
            const isHovered = active === index

            return (
              <g
                key={index}
                role="button"
                tabIndex={0}
                aria-label={`${bucket.day}, ${bucket.start} al ${bucket.end}: ${money(bucket.amountCents)}`}
                aria-describedby={`${chartId}-detail`}
                className="eagle-chart-bar transition-transform"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(index)}
              >
                {/* Columna de resaltado translúcida al hacer hover */}
                {isHovered && (
                  <rect
                    x={40 + index * slotWidth}
                    y="24"
                    width={slotWidth}
                    height="228"
                    rx="8"
                    fill="#ed1450"
                    opacity="0.05"
                  />
                )}

                {/* Barra principal con transición suave */}
                <rect
                  className="eagle-chart-value"
                  x={x}
                  y={baseline - height}
                  width={barWidth}
                  height={Math.max(4, height)}
                  rx="6"
                  fill={isPeak ? "url(#barPeakGradient)" : "url(#barStandardGradient)"}
                  filter={isPeak ? "url(#glowPeak)" : undefined}
                  opacity={active === null || isHovered ? 1 : 0.45}
                  style={{
                    transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1), y 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
                  }}
                />

                {/* Área invisible amplia para mejorar hit target */}
                <rect x={40 + index * slotWidth} y="24" width={slotWidth} height="224" fill="transparent" />

                {/* Etiqueta del día o mes */}
                <text
                  x={x + barWidth / 2}
                  y="266"
                  textAnchor="end"
                  transform={`rotate(-40 ${x + barWidth / 2} 266)`}
                  fill={isHovered ? "#18181b" : "#71717a"}
                  fontWeight={isHovered ? "600" : "400"}
                  fontSize={chartWidth < 400 ? 9 : 11}
                  aria-hidden="true"
                >
                  {bucket.day}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <p id={`${chartId}-detail`} role="status" className="sr-only">{detail}</p>
      {selected && position && (
        <ChartTooltip id={`${chartId}-tooltip`} position={position}>
          <strong className="block capitalize font-semibold">{selected.day}</strong>
          <span className="block text-zinc-400 text-xs">{selected.start} al {selected.end}</span>
          <span className="mt-1 block font-bold text-rose-400 font-gaming text-sm">{money(selected.amountCents)}</span>
        </ChartTooltip>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        <span>Mayor venta del período: {money(Math.round(peak * 100))}</span>
        <span>Período anterior: {money(summary.previousRevenueCents)}</span>
      </div>
    </Panel>
  )
}

export function PaymentsChart({ summary }: { summary: DashboardSummary }) {
  const payments = summary.payments.map((payment, index) => ({ ...payment, ...paymentStyles[index] }))
  const total = summary.sales.length
  const chartId = useId()
  const [active, setActive] = useState<string | null>(null)
  const { position, locate } = useTooltipPosition()

  useEffect(() => setActive(null), [summary])

  const circumference = 2 * Math.PI * 72
  let offset = 0
  const selected = payments.find(payment => payment.method === active)
  const description = (payment: typeof payments[number]) => `${payment.method}: ${payment.count} transacciones · ${percent.format(total ? (payment.count / total) * 100 : 0)} %`

  return (
    <Panel title="Métodos de pago" subtitle="Distribución porcentual del período">
      <div className="relative mx-auto my-2 shrink-0" onMouseMove={locate} onFocusCapture={locate} onClickCapture={locate} style={{ width: "min(100%, 180px)", aspectRatio: "1 / 1" }}>
        <svg viewBox="0 0 200 200" width="180" height="180" role="group" aria-labelledby={`${chartId}-title`} className="block h-full w-full">
          <title id={`${chartId}-title`}>Métodos de pago: {total} transacciones</title>
          <circle cx="100" cy="100" r="72" fill="none" stroke="#f4f4f5" strokeWidth="22" />
          {payments.map(payment => {
            const length = total ? (payment.count / total) * circumference : 0
            const start = offset
            offset += length
            const isHovered = active === payment.method
            return (
              <circle
                key={payment.method}
                className="eagle-chart-segment"
                cx="100"
                cy="100"
                r="72"
                fill="none"
                stroke={payment.color}
                strokeWidth={isHovered ? 26 : 22}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-start}
                transform="rotate(-90 100 100)"
                role="button"
                tabIndex={payment.count ? 0 : -1}
                aria-label={description(payment)}
                aria-describedby={`${chartId}-detail`}
                style={{
                  pointerEvents: payment.count ? "stroke" : "none",
                  transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                  opacity: active === null || isHovered ? 1 : 0.6,
                }}
                onMouseEnter={() => setActive(payment.method)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(payment.method)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(payment.method)}
              />
            )
          })}
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 font-gaming">{total}</span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">Transacciones</span>
        </div>
      </div>

      <p id={`${chartId}-detail`} role="status" className={total ? "sr-only" : "mt-3 text-xs text-zinc-500"}>
        {selected ? description(selected) : total ? "Señala un método para ver sus detalles." : "No hay pagos en este período."}
      </p>

      {selected && position && (
        <ChartTooltip id={`${chartId}-tooltip`} position={position}>
          <strong className="block font-semibold">{selected.method}</strong>
          <span className="block text-zinc-300 text-xs">{selected.count} transacciones</span>
          <span className="mt-0.5 block font-bold text-rose-400">{percent.format(total ? (selected.count / total) * 100 : 0)} % del total</span>
        </ChartTooltip>
      )}

      <ul className="mt-4 space-y-2.5" onMouseMove={locate} onFocusCapture={locate} onClickCapture={locate}>
        {payments.map(({ method, count, color, icon: Icon, bg, border }) => {
          const isSelected = active === method
          const pct = total ? (count / total) * 100 : 0
          return (
            <li key={method}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition-all ${
                  isSelected ? "border-rose-300 bg-rose-50/50 shadow-xs" : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/80"
                }`}
                aria-describedby={`${chartId}-detail`}
                onMouseEnter={() => setActive(method)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(method)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(method)}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg} ${border} border`}>
                  <Icon size={15} style={{ color }} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-800 text-xs sm:text-sm">{method}</span>
                  <span className="block text-[11px] text-zinc-500">{count} pagos registrados</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-bold text-zinc-900 text-xs sm:text-sm">{percent.format(pct)} %</span>
                </span>
              </motion.button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
