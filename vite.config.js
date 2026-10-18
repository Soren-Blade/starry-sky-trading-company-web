import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 后端地址：优先取显式配置的 VITE_API_TARGET，否则回退到 VITE_API_BASE_URL / 本地 8080
  const apiTarget = env.VITE_API_TARGET || env.VITE_API_BASE_URL || 'http://localhost:8080'

  return {
    /*
     * 这里原先挂了一个 `unplugin-vue-components` + `AntDesignVueResolver`，
     * 用来给模板里的 `<a-table>` / `<a-tag>` / `<a-button>` 做按需自动注册。
     * 这三处已全部替换为项目自有的 `.u-table` / `.u-tag` / 原生 `<button>`，
     * 项目里不再有任何 `<a-*>` 标签 —— 自动注册器因此一并移除，
     * 顺带省掉一个构建期依赖（unplugin-vue-components）。
     */
    plugins: [vue()],

    server: {
      hmr: true,
      port: 5173,
      strictPort: false,
      // 联调代理：把 VITE_API_BASE_URL 留空（或代码里走相对路径）时，
      // 前端请求会经由这里转发到后端，规避跨域并让 Cookie 落在同一 origin。
      //
      // 注意：`/user` 下既有后端接口也有**前端路由**（/user/kami、/user/orders…），
      // 因此这里只能逐个列出具体接口，不能图省事写 `'/user'`。
      // 同理，新增后端前缀时必须在这里补一条 —— 漏了不会报错，
      // 只会让该接口在 dev 下打到 dev server 自己（404）。
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
        '/cartApi': { target: apiTarget, changeOrigin: true },
        '/orderApi': { target: apiTarget, changeOrigin: true },
        '/favoriteApi': { target: apiTarget, changeOrigin: true },
        // v1.1.0 新增的三个前缀（会员 / 积分 / 优惠券）。漏配的后果见上方注释：
        // dev 下请求会打到 dev server 自己，拿到 index.html，前端把它报成网络错误。
        '/memberApi': { target: apiTarget, changeOrigin: true },
        '/pointsApi': { target: apiTarget, changeOrigin: true },
        '/couponApi': { target: apiTarget, changeOrigin: true },
        // v1.3.0 新增的两个前缀（消息中心 / 客服中心）。`verify:dev` 会静态比对
        // 「源码里出现的 API 路径」与「这里的代理表」，漏配会直接失败（DEV_PROBE 17/17）。
        // `/mailCron` 只有运维定时器会用，浏览器不发，故不代理。
        '/mailApi': { target: apiTarget, changeOrigin: true },
        '/supportApi': { target: apiTarget, changeOrigin: true },
        // v1.5.0 新增的前缀（任务中心）。同样会被 `verify:dev` 静态比对，
        // 漏配的后果见上方注释。
        '/taskApi': { target: apiTarget, changeOrigin: true },
        // v1.6.0 新增的两个前缀（邀请中心 / 首页人格位）。同样会被 `verify:dev`
        // 静态比对，漏配的后果见上方注释。
        '/inviteApi': { target: apiTarget, changeOrigin: true },
        '/heroApi': { target: apiTarget, changeOrigin: true },
        // 用户上传的文件（头像）。**必须代理**：`avatar_url` 存的是
        // `/uploads/avatars/xxx.webp` 这样的相对路径，不代理的话 dev 下
        // 会打到 dev server 自己（404），表现为「上传成功但头像不显示」。
        '/uploads': { target: apiTarget, changeOrigin: true },
        // v1.7.0 新增：个人操作日志导出（读 `sstc.tool_usage` 里本人的记录）。
        // 它刻意与 `/userApi` 分前缀（守卫不同：只认注册账号），因此这里必须单列。
        '/userLogsApi': { target: apiTarget, changeOrigin: true },
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
