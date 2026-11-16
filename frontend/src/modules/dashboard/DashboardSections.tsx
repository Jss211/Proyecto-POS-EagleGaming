import { ArrowRight, Wallet, ShieldCheck, Wrench, ShoppingCart, PackagePlus, Boxes, Truck, BadgeDollarSign, XCircle } from "lucide-react"
import Panel, { EmptyDashboardState } from "./DashboardPanel"
import { demoAfterSales, type ActivityType } from "./dashboard-demo"
import { formatDateTime, money, percent, type DashboardSummary, type TopProduct } from "./dashboard-model"

export function TopProducts({ products }: { products: TopProduct[] }) {
  return <Panel title="Top 5 productos más vendidos" subtitle="Productos de ejemplo · Ordenados por unidades del período">
    {products.length === 0 ? <EmptyDashboardState /> : <ol className="space-y-5">{products.map((product, index) => <li key={product.id}>
      <div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-[#cf1045]">{index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-zinc-800">{product.name}</p><p className="mt-1 text-xs text-zinc-500">{product.category}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{product.units} uds.</p><p className="mt-1 text-xs text-zinc-500">{money(product.revenueCents)}</p></div></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true"><div className="h-full rounded-full bg-[#ed1450]" style={{ width: `${product.units / products[0].units * 100}%` }} /></div>
    </li>)}</ol>}
  </Panel>
}

export function Profitability({ summary }: { summary: DashboardSummary }) {
  return <Panel title="Ganancia bruta y margen" subtitle="Rentabilidad del período · Costos de ejemplo">
    <dl className="space-y-4">
      {[{ label: "Ventas netas", value: money(summary.revenueCents) }, { label: "Costo de productos vendidos", value: money(summary.costCents) }].map(row => <div key={row.label} className="flex flex-wrap justify-between gap-2 text-sm"><dt className="text-zinc-500">{row.label}</dt><dd className="font-semibold">{row.value}</dd></div>)}
      <div className="border-t border-zinc-100 pt-5"><dt className="text-sm text-zinc-500">Ganancia bruta</dt><dd className="mt-2 text-3xl font-bold text-zinc-900">{money(summary.profitCents)}</dd></div>
      <div className="rounded-xl bg-rose-50 p-4"><dt className="text-xs font-medium text-[#cf1045]">Margen bruto</dt><dd className="mt-1 text-2xl font-bold text-[#cf1045]">{percent.format(summary.margin)} %</dd></div>
    </dl>
    <p className="mt-4 text-xs leading-5 text-zinc-500">Ventas netas menos costo de los productos vendidos. No equivale a utilidad neta: no descuenta gastos operativos ni otros cargos.</p>
  </Panel>
}

export function CashStatus() {
  return <Panel title="Estado de caja" subtitle="Estado actual · Independiente del filtro comercial">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-zinc-100 p-3 text-zinc-600"><Wallet size={22} aria-hidden="true" /></span><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">Sin información</span></div>
    <dl className="my-5 space-y-3 text-sm">{["Responsable del turno", "Fecha y hora de apertura", "Efectivo esperado"].map(label => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-zinc-500">{label}</dt><dd className="font-medium text-zinc-600">No disponible</dd></div>)}</dl>
    <p className="mb-4 text-xs leading-5 text-zinc-500">No hay datos de apertura ni movimientos de caja conectados. El Dashboard no permite operaciones financieras.</p>
    <a href="#/caja" className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#cf1045]">Ir a Caja · Próximamente <ArrowRight size={16} aria-hidden="true" /></a>
  </Panel>
}

export function AfterSales() {
  const indicators = [
    { status: "warranty", label: "Garantías pendientes", href: "#/garantias", icon: ShieldCheck },
    { status: "diagnosis", label: "Equipos en diagnóstico", href: "#/servicio-tecnico", icon: Wrench },
    { status: "repair", label: "Equipos en reparación", href: "#/servicio-tecnico", icon: Wrench },
    { status: "delivery", label: "Pendientes de entrega", href: "#/servicio-tecnico", icon: PackagePlus },
  ]
  return <Panel title="Garantías y servicio técnico" subtitle="Estado actual de ejemplo · No depende del filtro de ventas">
    <ul className="space-y-3">{indicators.map(({ status, label, href, icon: Icon }) => <li key={status}><a href={href} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 hover:bg-rose-50"><Icon size={18} className="shrink-0 text-[#ed1450]" aria-hidden="true" /><span className="flex-1 text-sm text-zinc-600">{label}</span><span className="text-lg font-bold">{demoAfterSales.filter(record => record.status === status).length}</span><ArrowRight size={14} className="text-zinc-400" aria-hidden="true" /></a></li>)}</ul>
    <p className="mt-4 text-xs text-zinc-500">Registros ilustrativos, sin vinculación con clientes o equipos reales.</p>
  </Panel>
}

const activityKinds = {
  sale: { label: "Venta registrada", icon: ShoppingCart },
  product: { label: "Producto agregado", icon: PackagePlus },
  stock: { label: "Stock actualizado", icon: Boxes },
  purchase: { label: "Compra recibida", icon: Truck },
  price: { label: "Precio modificado", icon: BadgeDollarSign },
  warranty: { label: "Garantía registrada", icon: ShieldCheck },
  cancelled: { label: "Venta anulada", icon: XCircle },
} satisfies Record<ActivityType, { label: string; icon: typeof ShoppingCart }>

export function RecentActivity({ activities }: { activities: DashboardSummary["activities"] }) {
  return <Panel title="Actividad reciente" subtitle="Últimos 10 movimientos de ejemplo del período · Sin relación con el usuario autenticado">
    {activities.length === 0 ? <EmptyDashboardState /> : <ol className="divide-y divide-zinc-100">{activities.map(activity => {
      const { label, icon: Icon } = activityKinds[activity.type]
      return <li key={activity.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0"><span className="rounded-lg bg-rose-50 p-2 text-[#ed1450]"><Icon size={17} aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-zinc-800">{label}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{activity.description}</p></div><time dateTime={activity.occurredAt} className="text-xs text-zinc-500">{formatDateTime(activity.occurredAt)}</time></li>
    })}</ol>}
  </Panel>
}
