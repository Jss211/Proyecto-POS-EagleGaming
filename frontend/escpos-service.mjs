import { randomBytes } from "node:crypto"
import { createServer } from "node:http"
import { createConnection, isIPv4 } from "node:net"
import { pathToFileURL } from "node:url"

const host = "127.0.0.1"
const port = 17380
const maxBody = 4 + 72 * 8192

function printerConfig(env) {
  const ip = env.ESCPOS_PRINTER_IP ?? ""
  const printerPort = Number(env.ESCPOS_PRINTER_PORT)
  const privateIp = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)
  if (!isIPv4(ip) || !privateIp || !Number.isInteger(printerPort) || printerPort < 1 || printerPort > 65535) {
    throw new Error("Configura ESCPOS_PRINTER_IP con una IPv4 privada y ESCPOS_PRINTER_PORT con el puerto TCP de la impresora.")
  }
  const origin = new URL(env.ESCPOS_ORIGIN ?? "http://localhost:5173")
  if (origin.protocol !== "http:" || !["localhost", host].includes(origin.hostname) ||
      origin.href !== origin.origin + "/") throw new Error("ESCPOS_ORIGIN debe ser un origen HTTP local sin ruta.")
  return { printer: { host: ip, port: printerPort }, origin: origin.origin }
}

export function encodeRaster(body) {
  if (body.length < 4) throw new Error("Raster incompleto.")
  const width = body.readUInt16LE(0)
  const height = body.readUInt16LE(2)
  const stride = Math.ceil(width / 8)
  if (width < 1 || width > 576 || height < 1 || height > 8192 || body.length !== 4 + stride * height) {
    throw new Error("Dimensiones o longitud del raster inválidas.")
  }
  const chunks = [Buffer.from([0x1b, 0x40])]
  for (let row = 0; row < height; row += 128) {
    const rows = Math.min(128, height - row)
    chunks.push(Buffer.from([0x1d, 0x76, 0x30, 0, stride, 0, rows, 0]),
      body.subarray(4 + row * stride, 4 + (row + rows) * stride))
  }
  chunks.push(Buffer.from([0x1b, 0x64, 3]))
  return Buffer.concat(chunks)
}

function sendToPrinter(printer, job) {
  return new Promise((resolve, reject) => {
    const socket = createConnection(printer)
    let settled = false
    const finish = error => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      socket.destroy()
      if (error) reject(error)
      else resolve()
    }
    const deadline = setTimeout(() => finish(new Error("La impresora no respondió dentro del tiempo de espera.")), 5000)
    socket.on("error", error => {
      const reason = error.code === "ECONNREFUSED" ? "La impresora rechazó la conexión TCP." :
        "No se pudo completar la comunicación TCP con la impresora."
      finish(new Error(reason))
    })
    socket.once("close", () => finish(new Error("La impresora cerró la conexión antes de completar el envío.")))
    socket.once("connect", () => {
      if (job) socket.end(job, error => finish(error ? new Error("No se pudo completar el envío TCP a la impresora.") : undefined))
      else finish()
    })
  })
}

export function createPrintService({ printer, origin, token, expectedHost = `${host}:${port}` }) {
  let busy = false
  const server = createServer({ requestTimeout: 10000, headersTimeout: 5000, connectionsCheckingInterval: 1000 }, async (req, res) => {
    const reply = (status, message) => {
      if (!res.destroyed) res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ message }))
    }
    if (req.headers.host !== expectedHost || req.headers.origin !== origin) return reply(403, "Origen local no autorizado.")
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
    const printing = req.url === "/print"
    if (!printing && req.url !== "/connect") return reply(404, "Operación desconocida.")
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST")
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type")
      return res.writeHead(204).end()
    }
    if (req.method !== "POST") return reply(405, "Método no permitido.")
    if (req.headers.authorization !== `Bearer ${token}`) return reply(401, "Clave del servicio incorrecta.")
    if (busy) return reply(409, "Hay un trabajo en curso. Espera a que termine.")

    const length = Number(req.headers["content-length"] ?? 0)
    if (!Number.isInteger(length) || length > maxBody || req.headers["transfer-encoding"] ||
        (printing ? length < 5 || req.headers["content-type"] !== "application/octet-stream" : length !== 0)) {
      return reply(400, "Cuerpo de impresión inválido.")
    }
    busy = true
    try {
      let job
      if (printing) {
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          job = encodeRaster(Buffer.concat(chunks))
        } catch (error) {
          return reply(400, error.message)
        }
      }
      await sendToPrinter(printer, job)
      reply(200, printing ? "Datos enviados por TCP. Comprueba el resultado en papel." :
        "Conexión TCP abierta. La prueba no verifica que la impresora pueda imprimir.")
    } catch (error) {
      reply(502, error.message)
    } finally {
      busy = false
    }
  })
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = printerConfig(process.env)
    const token = randomBytes(24).toString("base64url")
    const server = createPrintService({ ...config, token })
    server.on("error", error => {
      console.error(`No se pudo abrir el servicio local ESC/POS (${error.code}).`)
      process.exitCode = 1
    })
    server.listen(port, host, () => {
      console.log(`ESC/POS local en http://${host}:${port} para ${config.origin}`)
      console.log(`Clave de esta sesión: ${token}`)
    })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
