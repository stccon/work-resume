import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron"
import electronRenderer from "vite-plugin-electron-renderer"
import path from "path"

const alias = {
  "@": path.resolve(__dirname, "./src"),
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          resolve: { alias },
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["@opencode-ai/sdk"],
            },
          },
        },
      },
      {
        entry: "electron/preload.ts",
        onstart(args) {
          args.reload()
        },
        vite: {
          resolve: { alias },
          build: {
            outDir: "dist-electron",
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias,
  },
})

