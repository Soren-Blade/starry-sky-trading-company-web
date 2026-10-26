import { defineStore } from 'pinia'

/**
 * 提示框（Toast）
 *
 * ## 为什么不用 ant-design-vue 的 `message`
 *
 * 提示框的形态由设计系统 EC 的 `.ec-toast` 决定：**顶部居中、无操作按钮、
 * 成功 2s / 错误 3s 自动消失、最多同时 3 条**。antd 的 `message` 位置与节奏
 * 由它自己的样式表固定，且完全不消费本项目的设计令牌（明暗两套下都长一个样），
 * 因此这里自建一个只有几十行的提示框，样式全部走 `--ec-*` 令牌。
 *
 * ## 计时状态为什么不放进 state
 *
 * `setTimeout` 的返回值与「已过去多少毫秒」是纯粹的副作用簿记，
 * 放进 Pinia state 会被 Vue 递归代理，既没必要也容易在 devtools 里刷屏。
 * 状态只保留渲染需要的字段，计时簿记放模块级 Map。
 */

/** 通用兜底时长（EC 规范里错误类为 3s） */
export const TOAST_DURATION = 3000

/**
 * 按类型区分时长（EC：成功 2s、错误 3s）。
 *
 * 成功提示读起来比错误快，2s 足够；错误要多留 1s 让人读完。
 * 规范没为 warning / info 单独给值，沿用 3s 与错误对齐。
 */
export const TOAST_DURATION_BY_TYPE = {
  success: 2000,
  warning: TOAST_DURATION,
  error: TOAST_DURATION,
  info: TOAST_DURATION,
}

/** 同时最多显示几条（EC：最多 3 条），超出时挤掉最早的一条，避免刷屏 */
export const TOAST_MAX = 3

/** id → { timer, remaining, startedAt } */
const timers = new Map()
let nextId = 1

/**
 * 提示类型 → **AppIcon 的图标名**（不再是 emoji）。
 *
 * 界面统一成线性单色图标：颜色由 currentColor 跟随主题，
 * 语义色由 ToastHost 的 `.ec-toast` 修饰类决定（成功/危险走 EC，warning/info 用同一套语义色补齐）。
 */
const ICONS = {
  success: 'check-circle',
  warning: 'alert-triangle',
  error: 'ban',
  info: 'info',
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    /** { id, type, text, duration } —— 只放渲染需要的字段 */
    items: [],
  }),

  actions: {
    /**
     * @param {string} text 文案
     * @param {'success'|'warning'|'error'|'info'} [type]
     * @param {number} [duration] 毫秒；不传时按类型取 EC 规范值，<= 0 表示不自动消失
     * @returns {number|null} 提示框 id
     */
    push(text, type = 'info', duration = TOAST_DURATION_BY_TYPE[type] ?? TOAST_DURATION) {
      const message = String(text ?? '').trim()
      if (!message) return null

      const id = nextId++
      this.items.push({
        id,
        type: ICONS[type] ? type : 'info',
        text: message,
        duration,
      })

      while (this.items.length > TOAST_MAX) {
        this.dismiss(this.items[0].id)
      }

      this.start(id)
      return id
    },

    success(text, duration) {
      return this.push(text, 'success', duration)
    },

    warning(text, duration) {
      return this.push(text, 'warning', duration)
    },

    error(text, duration) {
      return this.push(text, 'error', duration)
    },

    info(text, duration) {
      return this.push(text, 'info', duration)
    },

    /** 启动自动消失计时 */
    start(id) {
      const item = this.items.find((entry) => entry.id === id)
      if (!item || item.duration <= 0) return
      if (typeof setTimeout === 'undefined') return

      const startedAt = Date.now()
      const record = timers.get(id) || { remaining: item.duration }
      const timer = setTimeout(() => this.dismiss(id), record.remaining)
      timers.set(id, { timer, remaining: record.remaining, startedAt })
    },

    /** 悬停暂停：记下剩余时间并清掉定时器 */
    pause(id) {
      const record = timers.get(id)
      if (!record?.timer) return
      clearTimeout(record.timer)
      record.remaining = Math.max(0, record.remaining - (Date.now() - record.startedAt))
      record.timer = null
      timers.set(id, record)
    },

    /** 移出暂停：按剩余时间继续 */
    resume(id) {
      const item = this.items.find((entry) => entry.id === id)
      const record = timers.get(id)
      if (!item || item.duration <= 0) return
      if (record?.timer) return
      if (record && record.remaining <= 0) {
        this.dismiss(id)
        return
      }
      this.start(id)
    },

    dismiss(id) {
      const index = this.items.findIndex((item) => item.id === id)
      const record = timers.get(id)
      if (record?.timer) clearTimeout(record.timer)
      timers.delete(id)
      if (index !== -1) this.items.splice(index, 1)
    },

    clear() {
      for (const record of timers.values()) {
        if (record.timer) clearTimeout(record.timer)
      }
      timers.clear()
      this.items = []
    },

    icon(type) {
      return ICONS[type] || ICONS.info
    },
  },
})
