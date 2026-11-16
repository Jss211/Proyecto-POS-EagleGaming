import { ArrowUpRight, Banknote, ShoppingCart, Package, TriangleAlert, ArrowRight, Monitor, Keyboard, Headphones } from "lucide-react"

const metrics = [
  { label: "Ventas del día", value: "S/ 4,850.00", detail: "Importe de ejemplo", icon: Banknote, color: "bg-rose-50 text-[#ed1450]" },
  { label: "Operaciones", value: "24", detail: "Transacciones de ejemplo", icon: ShoppingCart, color: "bg-violet-50 text-violet-600" },
  { label: "Productos", value: "186", detail: "Referencias de ejemplo", icon: Package, color: "bg-sky-50 text-sky-700" },
  { label: "Alertas de inventario", value: "3", detail: "Productos con stock bajo", icon: TriangleAlert, color: "bg-amber-50 text-amber-700" },
]

const inventory = [
  { name: "Teclado mecánico RGB", category: "Periféricos", stock: 2, minimum: 5, icon: Keyboard },
  { name: "Monitor gaming 27 pulgadas", category: "Monitores", stock: 1, minimum: 3, icon: Monitor },
  { name: "Headset gaming USB", category: "Audio", stock: 3, minimum: 6, icon: Headphones },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-zinc-900 p-6 text-white sm:p-8">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#ed1450]/15" aria-hidden="true" />
        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">Tu tienda, bajo control</span>
          <h2 className="mt-3 font-gaming text-2xl font-bold sm:text-3xl">Todo listo para el siguiente nivel.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">Ventas, productos y operaciones en un solo lugar. Explora la estructura de tu espacio EagleGaming.</p>
          <span className="mt-5 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs text-zinc-300">Dashboard de demostración · Sin datos reales</span>
        </div>
      </section>

      <section aria-label="Indicadores de demostración" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-2"><span className={`rounded-xl p-3 ${color}`}><Icon size={20} aria-hidden="true" /></span><span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Demo</span></div>
            <h3 className="mt-5 text-sm font-medium text-zinc-500">{label}</h3>
            <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
            <p className="mt-2 text-xs text-zinc-500">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5">
            <div><h2 className="font-semibold text-zinc-900">Atención al inventario</h2><p className="mt-1 text-xs text-zinc-500">Ejemplos de productos por reponer</p></div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">3 alertas · Demo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[450px] text-left text-sm">
              <caption className="sr-only">Inventario de demostración, sin existencias reales</caption>
              <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th scope="col" className="px-5 py-3 font-medium">Producto</th><th scope="col" className="px-4 py-3 font-medium">Stock</th><th scope="col" className="px-4 py-3 font-medium">Mínimo</th></tr></thead>
              <tbody className="divide-y divide-zinc-100">{inventory.map(({ name, category, stock, minimum, icon: Icon }) => <tr key={name}>
                <th scope="row" className="flex items-center gap-3 px-5 py-4 font-medium"><span className="rounded-lg bg-zinc-100 p-2 text-zinc-500"><Icon size={18} aria-hidden="true" /></span><span>{name}<span className="mt-1 block text-xs font-normal text-zinc-500">{category}</span></span></th>
                <td className="px-4 py-4 font-semibold text-amber-700">{stock}</td><td className="px-4 py-4 text-zinc-500">{minimum}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <a href="#/inventario" className="flex items-center justify-center gap-2 border-t border-zinc-100 p-4 text-sm font-semibold text-[#cf1045] hover:bg-rose-50">Explorar inventario <ArrowRight size={16} aria-hidden="true" /></a>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Explora tus módulos</h2>
          <p className="mt-1 text-xs text-zinc-500">Estructura preparada · Pantallas próximamente</p>
          <div className="mt-5 space-y-3">{[
            { id: "ventas", title: "Ventas", detail: "Tu próximo punto de venta", icon: ShoppingCart },
            { id: "productos", title: "Productos", detail: "Organiza tu catálogo gaming", icon: Package },
            { id: "reportes", title: "Reportes", detail: "Una mirada a tu negocio", icon: ArrowUpRight },
          ].map(({ id, title, detail, icon: Icon }) => <a key={id} href={`#/${id}`} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-4 hover:border-rose-200 hover:bg-rose-50"><Icon size={20} className="text-[#ed1450]" aria-hidden="true" /><span className="flex-1 text-sm font-semibold">{title}<span className="mt-1 block text-xs font-normal text-zinc-500">{detail}</span></span><ArrowRight size={16} className="text-zinc-400" aria-hidden="true" /></a>)}</div>
        </section>
      </div>
      <p className="text-xs leading-5 text-zinc-500">Todos los importes, cantidades y productos de esta vista son ficticios. No se registran ventas ni movimientos.</p>
    </div>
  )
}
