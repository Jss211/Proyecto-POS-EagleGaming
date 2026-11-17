import SalesDialog from "./SalesDialog"
import { CartTotals } from "./SalesCart"
import { formatSalesDateTime, formatSalesMoney } from "./sales-model"
import { quoteStatus, type DemoQuote, type DemoSale, type RecordLine } from "./sales-records"

export function SalesRecordLines({ lines }: { lines: RecordLine[] }) {
  return <ul className="divide-y divide-zinc-100">{lines.map(line => <li key={line.productId} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm"><div className="min-w-0"><p className="break-words font-medium">{line.name}</p><p className="mt-1 text-xs text-zinc-500">{line.sku} · {line.quantity} × {formatSalesMoney(line.unitPriceCents)}</p></div><p className="font-semibold tabular-nums">{formatSalesMoney(line.quantity * line.unitPriceCents)}</p></li>)}</ul>
}

export default function SalesRecordDetail({ record, onClose }: { record: DemoSale | DemoQuote; onClose: () => void }) {
  const isSale = "paymentMethod" in record
  return <SalesDialog title={record.number} onClose={onClose} footer={<button type="button" onClick={onClose} className="sales-button sales-button-secondary">Cerrar detalle</button>}>
    <p className="rounded-xl bg-rose-50 p-3 text-xs leading-6 text-[#cf1045]">{isSale ? "Venta de demostración registrada localmente. No es una transacción real ni un comprobante fiscal." : "Cotización de demostración. No reserva stock ni registra una venta."}</p>
    <dl className="my-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-zinc-500">Creación · Lima</dt><dd className="mt-1">{formatSalesDateTime(record.createdAt)}</dd></div><div><dt className="text-xs text-zinc-500">Cliente de demostración</dt><dd className="mt-1 break-words">{record.client}</dd></div><div><dt className="text-xs text-zinc-500">Estado</dt><dd className="mt-1">{isSale ? record.status : quoteStatus(record)}</dd></div>{isSale ? <div><dt className="text-xs text-zinc-500">Método de pago DEMO</dt><dd className="mt-1">{record.paymentMethod}</dd></div> : <><div><dt className="text-xs text-zinc-500">Vencimiento · Lima</dt><dd className="mt-1">{record.expiresOn}</dd></div><div><dt className="text-xs text-zinc-500">Última edición</dt><dd className="mt-1">{formatSalesDateTime(record.updatedAt)}</dd></div></>}</dl>
    <h4 className="text-sm font-semibold">Productos y precios guardados</h4><SalesRecordLines lines={record.lines} /><div className="mt-4"><CartTotals summary={record} /></div>
    {isSale && record.paymentMethod === "Efectivo" && <dl className="mt-5 space-y-3 rounded-xl bg-zinc-50 p-4 text-sm"><div className="flex justify-between gap-2"><dt>Monto recibido DEMO</dt><dd className="font-semibold">{formatSalesMoney(record.receivedCents ?? 0)}</dd></div><div className="flex justify-between gap-2"><dt>Vuelto DEMO</dt><dd className="font-semibold">{formatSalesMoney(record.changeCents ?? 0)}</dd></div></dl>}
    {!isSale && <><h4 className="mt-5 text-sm font-semibold">Observaciones de demostración</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-500">{record.notes || "Sin observaciones."}</p></>}
    <p className="mt-4 break-all text-[11px] text-zinc-400">Identificador local: {record.id}</p>
  </SalesDialog>
}
