import { resolve } from 'path' // Need this to resolve file paths
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'), // Path to your about page
        map: resolve(__dirname, 'map/index.html'),     // Path to your map page
      },
    },
  },
})