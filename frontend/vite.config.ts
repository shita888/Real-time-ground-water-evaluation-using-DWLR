import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [ tailwindcss(),react()],
  resolve: {
    alias: {
     "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/forecast": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/history": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/stations": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/statistics": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/latest": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
})
