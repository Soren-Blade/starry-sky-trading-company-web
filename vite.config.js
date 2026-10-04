import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 后端地址：优先取显式配置的 VITE_API_TARGET，否则回退到 VITE_API_BASE_URL / 本地 8080
  const apiTarget = env.VITE_API_TARGET || env.VITE_API_BASE_URL || 'http://localhost:8080'

  return {
    plugins: [
      vue(),
      Components({
        resolvers: [
          AntDesignVueResolver({
            importStyle: false, // css in js
          }),
        ],
      }),
    ],

    server: {
      hmr: true,
      port: 5173,
      strictPort: false,
      // 联调代理：把 VITE_API_BASE_URL 留空（或代码里走相对路径）时，
      // 前端请求会经由这里转发到后端，规避跨域并让 Cookie 落在同一 origin。
      proxy: {
        '/user/login': { target: apiTarget, changeOrigin: true },
        '/user/register': { target: apiTarget, changeOrigin: true },
        '/user/visitorLogin': { target: apiTarget, changeOrigin: true },
        '/user/refreshToken': { target: apiTarget, changeOrigin: true },
        '/userApi': { target: apiTarget, changeOrigin: true },
        '/shop': { target: apiTarget, changeOrigin: true },
        '/class': { target: apiTarget, changeOrigin: true },
        '/toolApi': { target: apiTarget, changeOrigin: true },
        '/kamiApi': { target: apiTarget, changeOrigin: true },
        '/userBackend': { target: apiTarget, changeOrigin: true },
        '/health': { target: apiTarget, changeOrigin: true },
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    build: {
      // 生产产物目录（Vercel 侧需与此一致）
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
  }
})
