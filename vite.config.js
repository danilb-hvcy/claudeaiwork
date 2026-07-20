import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  // Relative asset paths so the built file works when opened directly (file://)
  // or hosted from any sub-path.
  base: './',
  // viteSingleFile inlines all JS + CSS into a single dist/index.html so it can
  // be double-clicked or dropped on any static host — no dev server needed.
  plugins: [react(), viteSingleFile()],
  server: {
    port: 3000,
    open: true,
  },
})
