// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // 禁用 SSR（避免 Element Plus SSR 警告）
  ssr: false,

  // Element Plus 自动导入
  modules: [],

  // CSS 配置
  css: [
    'element-plus/dist/index.css',
  ],

  // 构建配置
  build: {
    transpile: ['element-plus'],
  },

  // 自动导入配置
  imports: {
    imports: [
      { name: 'defineStore', from: 'pinia' },
      { name: 'storeToRefs', from: 'pinia' },
    ],
  },

  // Vite 配置
  vite: {
    optimizeDeps: {
      include: ['element-plus', '@element-plus/icons-vue'],
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['course.wzx.homes'],
      // 内网穿透场景禁用 HMR，使用全量刷新
      hmr: false,
    },
  },
})
