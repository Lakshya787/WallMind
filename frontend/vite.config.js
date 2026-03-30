import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Required for stellar-sdk: polyfills Buffer, stream, crypto etc. in the browser
    nodePolyfills({
      include: ['buffer', 'stream', 'crypto', 'util', 'events'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  assetsInclude: ['**/*.lottie'],
})