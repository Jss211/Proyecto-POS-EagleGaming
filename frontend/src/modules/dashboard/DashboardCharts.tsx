import { useEffect, useId, useRef, useState } from "react"
import { ArrowUpRight, ArrowDownRight, CreditCard, Wallet, Landmark } from "lucide-react"
import Panel, { EmptyDashboardState } from "./DashboardPanel"
import { currency, percent, type DashboardSummary } from "./dashboard-model"

const paymentStyles = [
  { color: "#ed1450", icon: CreditCard },
  { color: "#27272a", icon: Wallet },
  { color: "#a1a1aa", icon: Landmark },
]

export function SalesChart({ summary, rangeLabel }: { summary: DashboardSummary; rangeLabel: string }) {
  const salesBuckets = summary.buckets
  const totalRevenue = summary.revenueCents / 100
  const previousRevenue = summary.previousRevenueCents / 100
  const growth = summary.growth
  const GrowthIcon = (growth ?? 0) < 0 ? ArrowDownRight : ArrowUpRight
  const hasSales = summary.sales.length > 0
  const chartId = useId()
  const chartRef = useRef<SVGSVGElement>(null)
  const [chartWidth, setChartWidth] = useState(580)

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const updateWidth = () => setChartWidth(Math.max(1, Math.round(chart.getBoundingClientRect().width)))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(chart)
    return () => observer.disconnect()
  }, [hasSales])

  const maximum = Math.max(1000, Math.ceil(Math.max(...salesBuckets.map(day => day.amount)) / 4000) * 1000) * 4
  const baseline = 248
  const chartHeight = 216
  const slotWidth = Math.max(1, chartWidth - 64) / salesBuckets.length
  const barWidth = Math.min(64, slotWidth * 0.65)
  const peak = Math.max(...salesBuckets.map(day => day.amount))
  if (!hasSales) return <Panel title="Rendimiento de ventas" subtitle={rangeLabel}><EmptyDashboardState /></Panel>
  return <Panel title="Rendimiento de ventas" subtitle={`Ingresos del ${rangeLabel}`}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{currency.format(totalRevenue)}</p>
      <div className="text-right"><span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-[#cf1045]"><GrowthIcon size={14} aria-hidden="true" />{growth === null ? "Sin base comparable" : `${growth > 0 ? "+" : ""}${percent.format(growth)} %`}</span><p className="mt-1 text-[11px] text-zinc-500">vs. período anterior</p></div>
    </div>
    <div style={{ width: "100%", overflowX: "auto" }} tabIndex={0} role="region" aria-label="Gráfico de ventas; permite desplazamiento horizontal en pantallas pequeñas">
    <svg ref={chartRef} viewBox={`0 0 ${chartWidth} 280`} width="100%" height="280" style={{ display: "block", width: "100%", minWidth: 340, height: 280, flexShrink: 0 }} role="img" aria-labelledby={`${chartId}-title ${chartId}-description`}>
      <title id={`${chartId}-title`}>Ventas del período de demostración, en soles</title>
      <desc id={`${chartId}-description`}>{salesBuckets.map(day => `${day.day}: ${currency.format(day.amount)}`).join("; ")}. Total: {currency.format(totalRevenue)}.</desc>
      {[0, maximum / 4, maximum / 2, maximum * 3 / 4, maximum].map(value => {
        const y = baseline - value / maximum * chartHeight
        return <g key={value} aria-hidden="true"><line x1="48" x2={chartWidth - 8} y1={y} y2={y} stroke="#e4e4e7" strokeDasharray={value ? "4 5" : undefined} /><text x="38" y={y + 4} textAnchor="end" fill="#71717a" fontSize="12">{value ? `${value / 1000}k` : "0"}</text></g>
      })}
      {salesBuckets.map((day, index) => {
        const height = day.amount / maximum * chartHeight
        const x = 48 + index * slotWidth + (slotWidth - barWidth) / 2
        return <g key={day.day} aria-hidden="true">
          <rect x={x} y={baseline - height} width={barWidth} height={height} rx="5" fill={day.amount === peak ? "#ed1450" : "#27272a"} />
          <text x={x + barWidth / 2} y={baseline - height - 9} textAnchor="middle" fill="#52525b" fontSize="11">{percent.format(day.amount / 1000)}k</text>
          <text x={x + barWidth / 2} y={day.day.includes("–") ? 260 : 273} textAnchor="middle" fill="#71717a" fontSize="11">{day.day.split("–").map((label, line) => <tspan key={line} x={x + barWidth / 2} dy={line === 0 ? 0 : 13}>{label}</tspan>)}</text>
        </g>
      })}
    </svg>
    </div>
    <p className="mt-3 text-xs leading-5 text-zinc-500">Período anterior: {currency.format(previousRevenue)}. El acento destaca el intervalo con más ventas.</p>
  </Panel>
}

export function PaymentsChart({ summary }: { summary: DashboardSummary }) {
  const payments = summary.payments.map((payment, index) => ({ ...payment, ...paymentStyles[index] }))
  const totalPayments = summary.sales.length
  const chartId = useId()
  const radius = 72
  const circumference = 2 * Math.PI * radius
  let offset = 0
  if (!totalPayments) return <Panel title="Métodos de pago" subtitle="Distribución en el período"><EmptyDashboardState /></Panel>
  return <Panel title="Métodos de pago" subtitle="Distribución en el período">
    <div className="relative mx-auto shrink-0" style={{ width: "min(100%, 180px)", aspectRatio: "1 / 1" }}>
      <svg viewBox="0 0 200 200" width="180" height="180" role="img" aria-labelledby={`${chartId}-title ${chartId}-description`} className="block h-full w-full">
        <title id={`${chartId}-title`}>Métodos de pago de demostración</title>
        <desc id={`${chartId}-description`}>{totalPayments} pagos. {payments.map(payment => `${payment.method}: ${payment.count}, ${percent.format(payment.count / totalPayments * 100)} por ciento`).join("; ")}.</desc>
        {payments.filter(payment => payment.count > 0).map(payment => {
          const length = payment.count / totalPayments * circumference
          const start = offset
          offset += length
          return <circle key={payment.method} cx="100" cy="100" r={radius} fill="none" stroke={payment.color} strokeWidth="22" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" aria-hidden="true" />
        })}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold tracking-tight text-zinc-900">{totalPayments}</span><span className="mt-1 text-[11px] text-zinc-500">Total de pagos</span></div>
    </div>
    <ul className="mt-5 space-y-3">{payments.map(({ method, count, color, icon: Icon }) => <li key={method} className="flex items-center gap-3 text-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" /><Icon size={16} className="shrink-0 text-zinc-400" aria-hidden="true" /><span className="min-w-0 flex-1 break-words text-zinc-600">{method}<span className="mt-1 block text-xs text-zinc-500">{count} pagos</span></span><span className="shrink-0 text-right font-semibold text-zinc-900">{percent.format(count / totalPayments * 100)} %</span>
    </li>)}</ul>
  </Panel>
}

