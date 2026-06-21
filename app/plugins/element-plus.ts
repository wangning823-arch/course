import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

export default defineNuxtPlugin((nuxtApp) => {
  // 注册 Element Plus
  nuxtApp.vueApp.use(ElementPlus, {
    locale: zhCn,
  })

  // 动态注册所有图标
  import('@element-plus/icons-vue').then((icons) => {
    for (const [key, component] of Object.entries(icons)) {
      nuxtApp.vueApp.component(key, component)
    }
  })
})
