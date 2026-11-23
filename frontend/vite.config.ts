import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import fs from "fs"

const localTmp = path.resolve(__dirname, "./node_modules/.tmp-esbuild")
if (!fs.existsSync(localTmp)) {
  fs.mkdirSync(localTmp, { recursive: true })
}
process.env.TMP = localTmp
process.env.TEMP = localTmp

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: "esnext",
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
