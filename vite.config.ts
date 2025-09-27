import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración para dominio personalizado: tracking.beloura.shop
export default defineConfig({
  plugins: [react()],
  base: '/', // porque usas CNAME con dominio personalizado
})
