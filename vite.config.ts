import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // ให้ asset path เป็น relative — ใช้ deploy ได้ทั้ง root domain และ GitHub Pages project path (/AIR-AutoAC-Web/) โดยไม่ต้องแก้ค่านี้อีก
})
