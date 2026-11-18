import { forwardRef, type ReactNode } from "react"
import { COMPANY_LOGO_URL } from "@/lib/company"
import { normalizePrintText as printText } from "@/utils/normalize-print-text"
import {
  DOCUMENT_TYPE_META,
  formatBillingDateTime,
  formatIgvPercent,
  formatMoney,
  type BillingEmitterConfig,
  type DemoInvoice,
} from "./billing-model"
import { DemoBarcodeSvg, DemoQrSvg } from "./BillingSvgGraphics"

export const DEMO_DISCLAIMER = "COMPROBANTE DEMOSTRATIVO - SIN VALIDEZ TRIBUTARIA"

export function demoReceiptId(invoice: DemoInvoice) {
  return `DEMO-${printText(invoice.number)}`
}

export function demoQrPayload(invoice: DemoInvoice) {
  return [demoReceiptId(invoice), `TOTAL ${formatMoney(invoice.totalCents)}`, "SIN VALIDEZ TRIBUTARIA"]
    .map(printText)
    .join("\n")
}

export function billingLineAmounts(invoice: DemoInvoice, item: DemoInvoice["items"][number]) {
  const unit = invoice.type === "NOTA_CREDITO" ? -Math.abs(item.unitPriceCents) : item.unitPriceCents
  return { unit, total: unit * item.quantity }
}

function TicketRow({ label, children, emphasis = false }: { label: string; children: ReactNode; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "billing-ticket-row billing-ticket-total billing-ticket-emphasis font-bold" : "billing-ticket-row"}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default forwardRef<HTMLDivElement, { invoice: DemoInvoice; emitter: BillingEmitterConfig }>(
  function BillingThermalTicket({ invoice, emitter }, ref) {
    const phone = printText(emitter.phone)
    const docNumber = printText(invoice.customerDocNumber)
    return (
      <div ref={ref} className="billing-ticket-paper bg-white font-mono text-zinc-800">
        <header className="billing-ticket-block text-center">
          <img
            src={COMPANY_LOGO_URL}
            className="billing-ticket-logo"
            alt=""
            onError={event => { event.currentTarget.style.display = "none" }}
          />
          <p className="font-bold">{printText(emitter.tradeName)}</p>
          <p>{printText(emitter.businessName)}</p>
          <p>RUC DEMO {printText(emitter.ruc)}</p>
          <p>DIRECCION: {printText(emitter.address)}</p>
          {phone && <p>TEL: {phone}</p>}
        </header>

        <section className="billing-ticket-section">
          <div className="billing-ticket-block text-center font-bold">
            <p>{printText(DOCUMENT_TYPE_META[invoice.type].label).toUpperCase()} DEMO</p>
            <p className="billing-ticket-emphasis">{printText(invoice.number)}</p>
          </div>
          <dl className="billing-ticket-block billing-ticket-details">
            <TicketRow label="FECHA">{printText(formatBillingDateTime(invoice.issuedAt))}</TicketRow>
            <TicketRow label="RECEPTOR">{printText(invoice.customerName)}</TicketRow>
            {invoice.customerAddress && <TicketRow label="DIRECCION">{printText(invoice.customerAddress)}</TicketRow>}
            {invoice.customerDocType !== "SIN_DOC" && docNumber && docNumber !== "-" && (
              <TicketRow label={invoice.customerDocType}>{docNumber}</TicketRow>
            )}
            <TicketRow label="PAGO">{printText(invoice.paymentMethod)}</TicketRow>
            {invoice.relatedNumber && <TicketRow label="REFERENCIA">{printText(invoice.relatedNumber)}</TicketRow>}
            {invoice.status !== "EMITIDO" && <TicketRow label="ESTADO">{invoice.status}</TicketRow>}
          </dl>
        </section>

        <section className="billing-ticket-section">
          <h4 className="billing-ticket-products-heading font-bold">PRODUCTOS</h4>
          <ul>
            {invoice.items.map(item => {
              const { unit, total } = billingLineAmounts(invoice, item)
              return (
                <li key={item.id} className="billing-ticket-block billing-ticket-item">
                  <p className="font-semibold">{printText(item.name)}</p>
                  <p>SKU: {printText(item.sku)}</p>
                  <dl>
                    <TicketRow label="CANT. x P. UNIT.">{item.quantity} x {formatMoney(unit)}</TicketRow>
                    <TicketRow label="SUBTOTAL">{formatMoney(total)}</TicketRow>
                  </dl>
                </li>
              )
            })}
          </ul>
        </section>

        <dl className="billing-ticket-section billing-ticket-block">
          <TicketRow label="OP. GRAVADAS">{formatMoney(invoice.subtotalCents)}</TicketRow>
          <TicketRow label={`IGV (${formatIgvPercent(invoice.igvRate ?? emitter.igvRate)})`}>{formatMoney(invoice.igvCents)}</TicketRow>
          <TicketRow label="TOTAL A PAGAR" emphasis>{formatMoney(invoice.totalCents)}</TicketRow>
        </dl>

        <div className="billing-ticket-section text-center">
          <div className="billing-ticket-block flex justify-center"><DemoQrSvg value={demoQrPayload(invoice)} /></div>
          <div className="billing-ticket-block mt-2 flex justify-center"><DemoBarcodeSvg value={demoReceiptId(invoice)} height={64} /></div>
          <div className="billing-ticket-block mt-2">
            <p>GARANTIA: {printText(emitter.ticketFooter)}</p>
            <p className="mt-2 font-bold">{DEMO_DISCLAIMER}</p>
          </div>
        </div>
      </div>
    )
  },
)
