import { LayoutDashboard, ShoppingCart, Package, Boxes, Truck, ShoppingBag, Wallet, Receipt, ShieldCheck, Wrench, ChartNoAxesCombined, Settings, type LucideIcon } from "lucide-react"

export interface ErpModule {
  id: string
  title: string
  icon: LucideIcon
  description: string
}

export const navigationGroups: { title: string; modules: ErpModule[] }[] = [
  { title: "General", modules: [
    { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, description: "Una vista general de tu tienda." },
  ] },
  { title: "Comercial", modules: [
    { id: "ventas", title: "Ventas", icon: ShoppingCart, description: "Punto de venta y gestión de ventas." },
    { id: "facturacion", title: "Facturación", icon: Receipt, description: "Gestión de comprobantes de venta." },
  ] },
  { title: "Productos y abastecimiento", modules: [
    { id: "productos", title: "Productos", icon: Package, description: "Catálogo de productos y periféricos gaming." },
    { id: "inventario", title: "Inventario", icon: Boxes, description: "Existencias y movimientos de productos." },
    { id: "proveedores", title: "Proveedores", icon: Truck, description: "Directorio de proveedores." },
    { id: "compras", title: "Compras", icon: ShoppingBag, description: "Gestión de compras y abastecimiento." },
  ] },
  { title: "Operaciones", modules: [
    { id: "caja", title: "Caja", icon: Wallet, description: "Apertura, movimientos y cierre de caja." },
    { id: "garantias", title: "Garantías", icon: ShieldCheck, description: "Seguimiento de garantías de productos." },
    { id: "servicio-tecnico", title: "Servicio técnico", icon: Wrench, description: "Seguimiento de equipos y reparaciones." },
  ] },
  { title: "Administración", modules: [
    { id: "reportes", title: "Reportes", icon: ChartNoAxesCombined, description: "Indicadores e informes del negocio." },
    { id: "configuracion", title: "Configuración", icon: Settings, description: "Preferencias de EagleGaming." },
  ] },
]

export const erpModules = navigationGroups.flatMap(group => group.modules)
