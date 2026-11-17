import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowUpRight, ArrowDownRight, CreditCard, Wallet, Landmark } from "lucide-react"
import Panel from "./DashboardPanel"
import { money, percent, type DashboardSummary } from "./dashboard-model"

const paymentStyles = [
  { color: "#ed1450", icon: CreditCard },
  { color: "#27272a", icon: Wallet },
  { color: "#a1a1aa", icon: Landmark },
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
  return createPortal(<div ref={ref} id={id} role="tooltip" className="eagle-chart-tooltip" style={{ left: point.x, top: point.y }}>{children}</div>, document.body)
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
  const maximum = Math.max(1000, Math.ceil(Math.max(...buckets.map(bucket => bucket.amount)) / 4000) * 1000) * 4
  const baseline = 248
  const slotWidth = Math.max(1, chartWidth - 48) / Math.max(1, buckets.length)
  const barWidth = Math.min(64, slotWidth * 0.65)
  const peak = Math.max(...buckets.map(bucket => bucket.amount))
  const growth = summary.growth
  const GrowthIcon = (growth ?? 0) < 0 ? ArrowDownRight : ArrowUpRight
  const selected = active === null ? null : buckets[active]
  const detail = selected ? `${selected.day}: ${selected.start} al ${selected.end}. ${money(selected.amountCents)}` : "Pasa el cursor, toca o enfoca una barra para ver el importe exacto."
  return <Panel title="Rendimiento de ventas" subtitle={`Ingresos del ${rangeLabel}`}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{money(summary.revenueCents)}</p>
      <div className="group relative text-right" tabIndex={0} aria-label={`Variación: ${growth === null ? "sin base comparable" : percent.format(growth) + " %"}. Período anterior: ${money(summary.previousRevenueCents)}`}>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-[#cf1045]"><GrowthIcon size={14} aria-hidden="true" />{growth === null ? "Sin base comparable" : `${growth > 0 ? "+" : ""}${percent.format(growth)} %`}</span>
        <p className="mt-1 text-[11px] text-zinc-500">vs. período anterior</p>
        <span className="eagle-detail-tooltip">Actual: {money(summary.revenueCents)}. Anterior: {money(summary.previousRevenueCents)}. {growth === null ? "No hay ingresos anteriores para calcular la variación." : "Variación sobre los ingresos del período anterior."}</span>
      </div>
    </div>
    <div className="min-w-0 w-full" onMouseMove={locate} onFocusCapture={locate} onClickCapture={locate}>
      <svg ref={chartRef} viewBox={`0 0 ${chartWidth} 330`} width="100%" height="330" className="block w-full" role="group" aria-labelledby={`${chartId}-title`}>
        <title id={`${chartId}-title`}>Ventas DEMO en soles. Total: {money(summary.revenueCents)}</title>
        {[0, maximum / 4, maximum / 2, maximum * 3 / 4, maximum].map(value => {
          const y = baseline - value / maximum * 216
          return <g key={value} aria-hidden="true"><line x1="40" x2={chartWidth - 8} y1={y} y2={y} stroke="#e4e4e7" strokeDasharray={value ? "4 5" : undefined} /><text x="34" y={y + 4} textAnchor="end" fill="#71717a" fontSize="11">{value ? `${value / 1000}k` : "0"}</text></g>
        })}
        {Array.from({ length: Math.max(12, buckets.length) }, (_, index) => {
          const bucket = buckets[index]
          const height = (bucket?.amount ?? 0) / maximum * 216
          const x = 40 + index * slotWidth + (slotWidth - barWidth) / 2
          return <g key={index} role="button" tabIndex={bucket ? 0 : -1} aria-hidden={!bucket || undefined} aria-label={bucket ? `${bucket.day}, ${bucket.start} al ${bucket.end}: ${money(bucket.amountCents)}` : undefined} aria-describedby={bucket ? `${chartId}-detail` : undefined} className="eagle-chart-bar" style={{ pointerEvents: bucket ? "auto" : "none" }} onMouseEnter={() => bucket && setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(index)} onKeyDown={event => { if (event.key === "Escape") setActive(null); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(index) } }}>
            <rect className="eagle-chart-value" x={x} y={baseline - height} width={barWidth} height={height} rx="5" fill={bucket?.amount === peak ? "#ed1450" : "#27272a"} opacity={active === null || active === index ? 1 : 0.7} />
            {bucket && <><rect x={40 + index * slotWidth} y="24" width={slotWidth} height="224" fill="transparent" /><text x={x + barWidth / 2} y="264" textAnchor="end" transform={`rotate(-40 ${x + barWidth / 2} 264)`} fill="#71717a" fontSize={chartWidth < 400 ? 9 : 11} aria-hidden="true">{bucket.day}</text></>}
          </g>
        })}
      </svg>
    </div>
    <p id={`${chartId}-detail`} role="status" className="sr-only">{detail}</p>
    {selected && position && <ChartTooltip id={`${chartId}-tooltip`} position={position}><strong className="block capitalize">{selected.day}</strong><span className="block text-zinc-300">{selected.start} al {selected.end}</span><span className="mt-1 block font-semibold">{money(selected.amountCents)}</span></ChartTooltip>}
    {!summary.sales.length && <p className="mt-2 text-xs text-zinc-500">No hay registros de ejemplo para este período.</p>}
    <p className="mt-3 text-xs leading-5 text-zinc-500">Período anterior: {money(summary.previousRevenueCents)}. El acento destaca el intervalo con más ventas.</p>
  </Panel>
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
  const description = (payment: typeof payments[number]) => `${payment.method}: ${payment.count} transacciones · ${percent.format(total ? payment.count / total * 100 : 0)} %`
  return <Panel title="Métodos de pago" subtitle="Distribución en el período">
    <div className="relative mx-auto shrink-0" onMouseMove={locate} onFocusCapture={locate} onClickCapture={locate} style={{ width: "min(100%, 180px)", aspectRatio: "1 / 1" }}>
      <svg viewBox="0 0 200 200" width="180" height="180" role="group" aria-labelledby={`${chartId}-title`} className="block h-full w-full">
        <title id={`${chartId}-title`}>Métodos de pago DEMO: {total} transacciones</title>
        <circle cx="100" cy="100" r="72" fill="none" stroke="#f4f4f5" strokeWidth="22" />
        {payments.map(payment => {
          const length = total ? payment.count / total * circumference : 0
          const start = offset
          offset += length
          return <circle key={payment.method} className="eagle-chart-segment" cx="100" cy="100" r="72" fill="none" stroke={payment.color} strokeWidth={active === payment.method ? 26 : 22} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" role="button" tabIndex={payment.count ? 0 : -1} aria-label={description(payment)} aria-describedby={`${chartId}-detail`} style={{ pointerEvents: payment.count ? "stroke" : "none" }} onMouseEnter={() => setActive(payment.method)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(payment.method)} onBlur={() => setActive(null)} onClick={() => setActive(payment.method)} onKeyDown={event => { if (event.key === "Escape") setActive(null); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(payment.method) } }} />
        })}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold tracking-tight text-zinc-900">{total}</span><span className="mt-1 text-[11px] text-zinc-500">Total de pagos</span></div>
    </div>
    <p id={`${chartId}-detail`} role="status" className={total ? "sr-only" : "mt-3 text-xs text-zinc-500"}>{selected ? description(selected) : total ? "Toca, enfoca o señala un método para ver sus detalles." : "No hay pagos de ejemplo en este período."}</p>
    {selected && position && <ChartTooltip id={`${chartId}-tooltip`} position={position}><strong className="block">{selected.method}</strong><span className="block">{selected.count} transacciones</span><span className="block font-semibold">{percent.format(total ? selected.count / total * 100 : 0)} % del total</span></ChartTooltip>}
    <ul className="mt-5 space-y-3" onMouseMove={locate} onFocusCapture={locate} onClickCapture={locate}>{payments.map(({ method, count, color, icon: Icon }) => <li key={method}>
      <button type="button" className="flex w-full items-center gap-3 rounded-lg text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500" aria-describedby={`${chartId}-detail`} onMouseEnter={() => setActive(method)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(method)} onBlur={() => setActive(null)} onClick={() => setActive(method)} onKeyDown={event => { if (event.key === "Escape") setActive(null) }}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" /><Icon size={16} className="shrink-0 text-zinc-400" aria-hidden="true" /><span className="min-w-0 flex-1 break-words text-zinc-600">{method}<span className="mt-1 block text-xs text-zinc-500">{count} pagos</span></span><span className="shrink-0 text-right font-semibold text-zinc-900">{percent.format(total ? count / total * 100 : 0)} %</span>
      </button>
    </li>)}</ul>
  </Panel>
}
