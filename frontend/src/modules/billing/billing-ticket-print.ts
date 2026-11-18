export interface TicketPrintJob {
  pageHeightMm: number
  dispose: () => void
}

export async function prepareTicketLayout(source: HTMLElement, layout: "preview" | "raster") {
  const root = document.createElement("div")
  root.className = `billing-ticket-output billing-ticket-output--${layout} billing-ticket-measuring`
  root.setAttribute("aria-hidden", "true")
  const paper = source.cloneNode(true) as HTMLElement
  root.append(paper)
  document.body.append(root)
  try {
    // Start layout/font loading on the isolated copy before reading its final height.
    paper.getBoundingClientRect()
    const logo = paper.querySelector<HTMLImageElement>(".billing-ticket-logo")
    await Promise.all([
      document.fonts.ready,
      logo?.decode().catch(() => logo.remove()),
    ])
    return { root, paper }
  } catch (error) {
    root.remove()
    throw error
  }
}

// The 80 mm preview already includes its own horizontal inset.
export async function prepareTicketPrint(source: HTMLElement): Promise<TicketPrintJob> {
  const { root, paper } = await prepareTicketLayout(source, "preview")
  const pageStyle = document.createElement("style")
  pageStyle.media = "print"
  pageStyle.dataset.billingTicketPage = ""
  const dispose = () => {
    root.remove()
    pageStyle.remove()
  }
  try {
    const heightPx = Math.max(paper.getBoundingClientRect().height, paper.scrollHeight)
    if (!Number.isFinite(heightPx) || heightPx <= 0) throw new Error("No se pudo medir el ticket para imprimirlo.")
    // Allow 2 mm of feed on each end and 1 mm for Chromium's page rounding.
    const pageHeightMm = Math.ceil((heightPx * 25.4 / 96 + 5) * 10) / 10
    pageStyle.textContent = `@page eagle-thermal-ticket { size: 80mm ${pageHeightMm}mm; margin: 2mm 0; }`
    document.head.append(pageStyle)
    root.id = "billing-ticket-print-root"
    root.classList.remove("billing-ticket-measuring")
    return { pageHeightMm, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}
