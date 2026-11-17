import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 默认相对路径，构建产物可直接 file:// 双击打开；服务端部署时用 VITE_BASE_PATH 覆盖
  base: process.env.VITE_BASE_PATH || './',
});
