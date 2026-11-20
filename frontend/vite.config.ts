import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const certDir = resolve(import.meta.dirname, ".certs")
const certFile = resolve(certDir, "localhost.pem")
const keyFile = resolve(certDir, "localhost-key.pem")
const https =
  existsSync(certFile) && existsSync(keyFile)
    ? { cert: readFileSync(certFile), key: readFileSync(keyFile) }
    : undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    https,
    proxy: {
      "/api": {
        target: process.env.API_URL ?? "http://127.0.0.1:3000",
        changeOrigin: false,
      },
    },
  },
  preview: {
    https,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
})
