import { prepareTicketLayout } from "./billing-ticket-print"

const serviceUrl = "http://127.0.0.1:17380"
const rasterWidth = 576

function drawText(ctx: CanvasRenderingContext2D, text: Text, bounds: DOMRect) {
  const parent = text.parentElement
  if (!parent || !text.data.trim()) return
  const style = getComputedStyle(parent)
  const range = document.createRange()
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  ctx.textBaseline = "middle"
  let start = 0
  let line: DOMRect | undefined
  for (let index = 0; index <= text.length; index++) {
    let glyph
    if (index < text.length) {
      range.setStart(text, index)
      range.setEnd(text, index + 1)
      glyph = range.getBoundingClientRect()
    }
    if (line && (!glyph || glyph.top !== line.top)) {
      ctx.fillText(text.data.slice(start, index), line.left - bounds.left, line.top - bounds.top + line.height / 2)
      line = undefined
    }
    if (!line && glyph?.width) {
      start = index
      line = glyph
    }
  }
}

async function drawGraphic(ctx: CanvasRenderingContext2D, element: HTMLImageElement | SVGSVGElement, bounds: DOMRect, scale: number) {
  const { width, height, left, top } = element.getBoundingClientRect()
  if (!width || !height) return
  let image: HTMLImageElement
  if (element instanceof HTMLImageElement) {
    image = element
    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight)
    const imageWidth = image.naturalWidth * ratio
    const imageHeight = image.naturalHeight * ratio
    ctx.drawImage(image, left - bounds.left + (width - imageWidth) / 2,
      top - bounds.top + (height - imageHeight) / 2, imageWidth, imageHeight)
    return
  } else {
    const svg = element.cloneNode(true) as SVGSVGElement
    svg.setAttribute("width", String(Math.round(width * scale)))
    svg.setAttribute("height", String(Math.round(height * scale)))
    image = new Image()
    image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
    await image.decode()
  }
  ctx.drawImage(image, left - bounds.left, top - bounds.top, width, height)
}

export async function rasterizeTicket(source: HTMLElement, test: boolean): Promise<ArrayBuffer> {
  const { root, paper } = await prepareTicketLayout(source, "raster")
  try {
    const bounds = paper.getBoundingClientRect()
    const scale = rasterWidth / bounds.width
    const bannerHeight = test ? 40 : 0
    const height = Math.ceil(bounds.height * scale) + bannerHeight
    if (!Number.isFinite(height) || height < 1 || height > 8192) throw new Error("El ticket excede el tamaño permitido para impresión directa.")
    const canvas = document.createElement("canvas")
    canvas.width = rasterWidth
    canvas.height = height
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) throw new Error("El navegador no pudo preparar el raster del ticket.")
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, rasterWidth, height)
    ctx.fillStyle = "#000"
    if (test) {
      ctx.font = "bold 22px monospace"
      ctx.textAlign = "center"
      ctx.fillText("PRUEBA DE IMPRESION DEMO", rasterWidth / 2, 27)
      ctx.textAlign = "left"
    }
    ctx.translate(0, bannerHeight)
    ctx.scale(scale, scale)
    for (const block of paper.querySelectorAll<HTMLElement>(".billing-ticket-section, .billing-ticket-item, .billing-ticket-total")) {
      const style = getComputedStyle(block)
      if (!parseFloat(style.borderTopWidth)) continue
      const rect = block.getBoundingClientRect()
      ctx.lineWidth = 1
      ctx.setLineDash(style.borderTopStyle === "dotted" ? [1, 2] : style.borderTopStyle === "dashed" ? [4, 3] : [])
      ctx.beginPath()
      ctx.moveTo(rect.left - bounds.left, rect.top - bounds.top + 0.5)
      ctx.lineTo(rect.right - bounds.left, rect.top - bounds.top + 0.5)
      ctx.stroke()
    }
    const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) drawText(ctx, walker.currentNode as Text, bounds)
    for (const graphic of paper.querySelectorAll<HTMLImageElement | SVGSVGElement>("img, svg")) {
      await drawGraphic(ctx, graphic, bounds, scale)
    }

    const pixels = ctx.getImageData(0, 0, rasterWidth, height).data
    const stride = rasterWidth / 8
    const buffer = new ArrayBuffer(4 + stride * height)
    const header = new DataView(buffer)
    header.setUint16(0, rasterWidth, true)
    header.setUint16(2, height, true)
    const raster = new Uint8Array(buffer, 4)
    for (let pixel = 0; pixel < rasterWidth * height; pixel++) {
      const red = pixels[pixel * 4]
      const green = pixels[pixel * 4 + 1]
      const blue = pixels[pixel * 4 + 2]
      if (red * 0.299 + green * 0.587 + blue * 0.114 < 170) {
        raster[pixel >> 3] |= 0x80 >> (pixel & 7)
      }
    }
    return buffer
  } finally {
    root.remove()
  }
}

export async function sendEscPosRequest(token: string, raster?: ArrayBuffer) {
  let response: Response
  try {
    response = await fetch(`${serviceUrl}/${raster ? "print" : "connect"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, ...(raster && { "Content-Type": "application/octet-stream" }) },
      body: raster,
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error("No se pudo contactar al servicio ESC/POS local. Comprueba que esté iniciado y autorice este origen.")
  }
  const payload: unknown = await response.json().catch(() => null)
  if (!payload || typeof payload !== "object" || !("message" in payload) || typeof payload.message !== "string") {
    throw new Error("El servicio ESC/POS devolvió una respuesta inesperada.")
  }
  if (!response.ok) throw new Error(payload.message)
  return payload.message
}
