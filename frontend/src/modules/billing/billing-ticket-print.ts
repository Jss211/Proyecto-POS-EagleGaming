export interface TicketPrintJob {
  pageHeightMm: number
  dispose: () => void
}

// CSS pages require two finite dimensions: "80mm auto" is not a valid page size.
// Measure the same 72 mm layout used for printing, rather than guessing a roll length.
export async function prepareTicketPrint(source: HTMLElement): Promise<TicketPrintJob> {
  const root = document.createElement("div")
  root.id = "billing-ticket-print-root"
  root.className = "billing-ticket-measuring"
  root.setAttribute("aria-hidden", "true")
  const paper = source.cloneNode(true) as HTMLElement
  root.append(paper)
  const pageStyle = document.createElement("style")
  pageStyle.media = "print"
  pageStyle.dataset.billingTicketPage = ""
  const dispose = () => {
    root.remove()
    pageStyle.remove()
  }
  document.body.append(root)
  try {
    // Start layout/font loading on the isolated copy before reading its final height.
    paper.getBoundingClientRect()
    if (document.fonts) await document.fonts.ready
    const heightPx = Math.max(paper.getBoundingClientRect().height, paper.scrollHeight)
    if (!Number.isFinite(heightPx) || heightPx <= 0) throw new Error("No se pudo medir el ticket para imprimirlo.")
    // 4 mm top + 4 mm bottom, plus 1 mm for rounding in Chromium's print layout.
    const pageHeightMm = Math.ceil((heightPx * 25.4 / 96 + 9) * 10) / 10
    pageStyle.textContent = `@page eagle-thermal-ticket { size: 80mm ${pageHeightMm}mm; margin: 4mm; }`
    document.head.append(pageStyle)
    root.dataset.pageHeightMm = String(pageHeightMm)
    root.classList.remove("billing-ticket-measuring")
    return { pageHeightMm, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}
