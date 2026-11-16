import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import prisma from "./config/db"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Ruta de estado de la API y de PostgreSQL
app.get("/api/health", async (_req, res) => {
  try {
    // Comprobar conexión viva con PostgreSQL en Supabase
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: "online",
      database: "PostgreSQL (Supabase) conectado exitosamente",
      system: "Eagle Gaming POS Backend",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      database: "Error conectando a PostgreSQL",
      error: error.message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Eagle Gaming POS corriendo en http://localhost:${PORT}`)
})

export default app
