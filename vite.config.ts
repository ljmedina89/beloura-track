import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dominio personalizado: tracking.beloura.shop
export default defineConfig({
  plugins: [react()],
  base: '/', // raíz porque usas CNAME
})
