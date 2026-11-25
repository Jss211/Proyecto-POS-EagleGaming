import { motion } from "framer-motion"
import { ArrowRight, Wallet, ShieldCheck, Wrench, ShoppingCart, PackagePlus, Boxes, Truck, BadgeDollarSign, XCircle, ChevronRight } from "lucide-react"
import Panel, { EmptyDashboardState } from "./DashboardPanel"
import { demoAfterSales, type ActivityType } from "./dashboard-demo"
import { formatDateTime, money, percent, type DashboardSummary, type TopProduct } from "./dashboard-model"

export function TopProducts({ products }: { products: TopProduct[] }) {
  const maxUnits = products[0]?.units || 1
  return (
    <Panel title="Top 5 productos más vendidos" subtitle="Clasificación por unidades vendidas en el período">
      {products.length === 0 ? (
        <EmptyDashboardState />
      ) : (
        <ol className="space-y-4">
          {products.map((product, index) => (
            <motion.li
              key={product.id}
              whileHover={{ scale: 1.01 }}
              className="group relative rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 transition-all hover:border-rose-200 hover:bg-white hover:shadow-xs"
              tabIndex={0}
              aria-label={`${product.name}: ${product.units} unidades, ${money(product.revenueCents)}`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ed1450]/10 font-gaming text-xs font-bold text-[#ed1450]">
                  #{index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 group-hover:text-[#ed1450] transition-colors">{product.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{product.category}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-zinc-900 font-gaming">{product.units} uds.</p>
                  <p className="mt-0.5 text-xs font-medium text-emerald-600">{money(product.revenueCents)}</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200/70" aria-hidden="true">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#ed1450] to-rose-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(product.units / maxUnits) * 100}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

export function Profitability({ summary }: { summary: DashboardSummary }) {
  return (
    <Panel title="Ganancia bruta y margen" subtitle="Métricas de rentabilidad comercial del período">
      <dl className="space-y-4">
        {[
          { label: "Ventas netas del período", value: money(summary.revenueCents), isHighlight: false },
          { label: "Costo total de mercadería (CPV)", value: money(summary.costCents), isHighlight: false },
        ].map(row => (
          <div key={row.label} className="flex flex-wrap justify-between gap-2 text-sm border-b border-zinc-100 pb-3">
            <dt className="text-zinc-500">{row.label}</dt>
            <dd className="font-semibold text-zinc-800">{row.value}</dd>
          </div>
        ))}

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Ganancia bruta</dt>
          <dd className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 font-gaming">
            {money(summary.profitCents)}
          </dd>
        </div>

        <div className="rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50 to-rose-100/40 p-4 shadow-xs">
          <dt className="text-xs font-semibold uppercase tracking-wider text-[#cf1045]">Margen bruto comercial</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#ed1450] font-gaming">{percent.format(summary.margin)} %</span>
            <span className="text-xs font-medium text-rose-700">sobre ingresos</span>
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
        Ganancia bruta = Ventas netas menos costo directo de reposición. No incluye sueldos ni alquiler de local.
      </p>
    </Panel>
  )
}

export function CashStatus() {
  return (
    <Panel title="Estado de caja" subtitle="Control de turno de operaciones">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-zinc-100 p-3 text-zinc-700">
          <Wallet size={22} aria-hidden="true" />
        </span>
        <div>
          <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 border border-zinc-200">
            Caja Turno Mañana
          </span>
          <p className="mt-1 text-xs text-zinc-500">Cajero activo: Jordan Rojas</p>
        </div>
      </div>
      <dl className="my-5 space-y-3 text-sm border-t border-b border-zinc-100 py-4">
        {[
          { label: "Monto de apertura", val: "S/ 300.00 (Efectivo)" },
          { label: "Ventas en efectivo", val: "S/ 1,420.00" },
          { label: "Efectivo total en gaveta", val: "S/ 1,720.00" },
        ].map(item => (
          <div key={item.label} className="flex flex-wrap justify-between gap-2 text-xs">
            <dt className="text-zinc-500">{item.label}</dt>
            <dd className="font-semibold text-zinc-800">{item.val}</dd>
          </div>
        ))}
      </dl>
      <motion.a
        href="#/caja"
        whileHover={{ x: 3 }}
        className="mt-auto inline-flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-[#cf1045] hover:bg-rose-50 transition-colors"
      >
        <span>Gestionar arqueo y cierre de caja</span>
        <ChevronRight size={14} aria-hidden="true" />
      </motion.a>
    </Panel>
  )
}

export function AfterSales() {
  const indicators = [
    { status: "warranty", label: "Garantías pendientes", href: "#/garantias", icon: ShieldCheck, badge: "Garantía" },
    { status: "diagnosis", label: "Equipos en diagnóstico", href: "#/servicio-tecnico", icon: Wrench, badge: "Diagnóstico" },
    { status: "repair", label: "Equipos en reparación", href: "#/servicio-tecnico", icon: Wrench, badge: "Taller" },
    { status: "delivery", label: "Listos para entrega", href: "#/servicio-tecnico", icon: PackagePlus, badge: "Entrega" },
  ]
  return (
    <Panel title="Garantías y servicio técnico" subtitle="Seguimiento de soporte post-venta">
      <ul className="space-y-2.5">
        {indicators.map(({ status, label, href, icon: Icon }) => (
          <li key={status}>
            <motion.a
              href={href}
              whileHover={{ x: 3 }}
              className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white p-3 hover:border-rose-200 hover:bg-rose-50/40 transition-all"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#ed1450]">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="flex-1 text-xs font-medium text-zinc-700">{label}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-800 font-gaming">
                {demoAfterSales.filter(record => record.status === status).length}
              </span>
              <ArrowRight size={13} className="text-zinc-400" aria-hidden="true" />
            </motion.a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-zinc-400">
        Control de incidencias de hardware y equipos gaming en garantía.
      </p>
    </Panel>
  )
}

const activityKinds = {
  sale: { label: "Venta cobrada", icon: ShoppingCart, color: "text-emerald-600 bg-emerald-50" },
  product: { label: "Producto registrado", icon: PackagePlus, color: "text-rose-600 bg-rose-50" },
  stock: { label: "Movimiento de stock", icon: Boxes, color: "text-blue-600 bg-blue-50" },
  purchase: { label: "Ingreso de compra", icon: Truck, color: "text-amber-600 bg-amber-50" },
  price: { label: "Precio modificado", icon: BadgeDollarSign, color: "text-purple-600 bg-purple-50" },
  warranty: { label: "Garantía recibida", icon: ShieldCheck, color: "text-rose-600 bg-rose-50" },
  cancelled: { label: "Venta anulada", icon: XCircle, color: "text-zinc-600 bg-zinc-100" },
} satisfies Record<ActivityType, { label: string; icon: typeof ShoppingCart; color: string }>

export function RecentActivity({ activities }: { activities: DashboardSummary["activities"] }) {
  return (
    <Panel title="Actividad reciente del sistema" subtitle="Últimas operaciones comerciales y movimientos de inventario">
      {activities.length === 0 ? (
        <EmptyDashboardState />
      ) : (
        <ol className="divide-y divide-zinc-100">
          {activities.map(activity => {
            const item = activityKinds[activity.type] || activityKinds.sale
            const Icon = item.icon
            return (
              <motion.li
                key={activity.id}
                whileHover={{ scale: 1.005 }}
                className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0 transition-colors rounded-lg px-2 hover:bg-zinc-50"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-900">{item.label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 leading-snug">{activity.description}</p>
                </div>
                <time dateTime={activity.occurredAt} className="text-[11px] tabular-nums text-zinc-400 font-medium">
                  {formatDateTime(activity.occurredAt)}
                </time>
              </motion.li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
