import { useMemo } from "react"
import QRCode from "qrcode"

/**
 * Generates a real, ISO/IEC 18004 compliant QR Code rendered as crisp SVG.
 * Scannable directly from any smartphone camera (iOS / Android).
 */
export function DemoQrSvg({ value, size = 132 }: { value: string; size?: number }) {
  const qrData = useMemo(() => {
    const content = value.trim() || "EAGLE-GAMING-POS"
    const qr = QRCode.create(content, { errorCorrectionLevel: "M" })
    const count = qr.modules.size
    const quietZone = 4
    const total = count + quietZone * 2
    const pathParts: string[] = []

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.modules.get(r, c)) {
          pathParts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`)
        }
      }
    }

    return { total, path: pathParts.join("") }
  }, [value])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${qrData.total} ${qrData.total}`}
      role="img"
      aria-label="Código QR escaneable del comprobante"
      className="billing-qr-graphic block rounded-lg border border-zinc-200 bg-white"
      shapeRendering="crispEdges"
    >
      <rect width={qrData.total} height={qrData.total} fill="#ffffff" />
      <path d={qrData.path} fill="#000000" />
    </svg>
  )
}

/**
 * Standard Code 128 pattern table (indices 0..106).
 * Each string represents alternating bar and space widths (11 modules each; stop 106 is 13 modules).
 */
const CODE128_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
]

/**
 * Generates a real, spec-compliant Code 128B Barcode rendered as crisp SVG.
 * Scannable by POS laser scanners and mobile barcode readers.
 */
export function DemoBarcodeSvg({ value }: { value: string }) {
  const barcode = useMemo(() => {
    const clean = value.replace(/[^\x20-\x7E]/g, "").slice(0, 24) || "EAGLE-0001"
    const startCodeB = 104
    const codes: number[] = [startCodeB]
    let checksum = startCodeB

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i) - 32
      codes.push(code)
      checksum += code * (i + 1)
    }

    codes.push(checksum % 103)
    codes.push(106) // Stop pattern

    const quietZone = 10
    let x = quietZone
    const rects: { x: number; w: number }[] = []

    for (const code of codes) {
      const pattern = CODE128_PATTERNS[code]
      for (let i = 0; i < pattern.length; i++) {
        const w = Number(pattern[i])
        if (i % 2 === 0) {
          rects.push({ x, w })
        }
        x += w
      }
    }

    return { width: x + quietZone, rects, label: clean }
  }, [value])

  return (
    <div className="billing-barcode-graphic flex flex-col items-center">
      <svg
        viewBox={`0 0 ${barcode.width} 42`}
        className="h-10 w-full max-w-[230px] rounded bg-white"
        role="img"
        aria-label={`Código de barras Code 128 del comprobante ${barcode.label}`}
        shapeRendering="crispEdges"
      >
        <rect width={barcode.width} height={42} fill="#ffffff" />
        {barcode.rects.map((bar, idx) => (
          <rect key={idx} x={bar.x} y={4} width={bar.w} height={34} fill="#000000" />
        ))}
      </svg>
      <span className="mt-0.5 font-mono text-[9px] tracking-[0.22em] text-zinc-500">
        {barcode.label}
      </span>
    </div>
  )
}

export function EagleCrestSvg({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="10" fill="#141419" />
      <path
        d="M9 14.5L20 9L31 14.5L26.5 19.5L30 26L20 31L10 26L13.5 19.5L9 14.5Z"
        stroke="#ed1450"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15 18.5L20 15.5L25 18.5L20 25L15 18.5Z"
        fill="#ed1450"
      />
    </svg>
  )
}

export function ThermalTearEdgeSvg({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block h-2.5 w-full ${flip ? "rotate-180" : ""}`}
    >
      <path
        d="M0 10 L8 0 L16 10 L24 0 L32 10 L40 0 L48 10 L56 0 L64 10 L72 0 L80 10 L88 0 L96 10 L104 0 L112 10 L120 0 L128 10 L136 0 L144 10 L152 0 L160 10 L168 0 L176 10 L184 0 L192 10 L200 0 L208 10 L216 0 L224 10 L232 0 L240 10 L248 0 L256 10 L264 0 L272 10 L280 0 L288 10 L296 0 L304 10 L312 0 L320 10 Z"
        fill="#ffffff"
      />
    </svg>
  )
}
