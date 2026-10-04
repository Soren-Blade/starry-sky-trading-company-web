import { defineStore } from 'pinia'

/**
 * 提示框（Toast）
 *
 * ## 为什么不用 ant-design-vue 的 `message`
 *
 * 规范对提示框的要求是「右上角固定、距顶 24px、距右 24px、堆叠间距 12px、
 * 3000ms 自动消失、悬停暂停」——antd 的 `message` 只能顶部居中，
 * 位置由它自己的样式表固定，且完全不消费本项目的设计令牌（五套风格下都长一个样）。
 * 因此这里自建一个只有几十行的提示框，样式全部走令牌。
 *
 * ## 计时状态为什么不放进 state
 *
 * `setTimeout` 的返回值与「已过去多少毫秒」是纯粹的副作用簿记，
 * 放进 Pinia state 会被 Vue 递归代理，既没必要也容易在 devtools 里刷屏。
 * 状态只保留渲染需要的字段，计时簿记放模块级 Map。
 */

/** 规范值：3000ms */
export const TOAST_DURATION = 3000

/** 同时最多显示几条，超出时挤掉最早的一条，避免刷屏 */
export const TOAST_MAX = 4

/** id → { timer, remaining, startedAt } */
const timers = new Map()
let nextId = 1

const ICONS = {
  success: '✅',
  warning: '⚠️',
  error: '⛔',
  info: 'ℹ️',
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
     * @param {number} [duration] 毫秒；<= 0 表示不自动消失
     * @returns {number|null} 提示框 id
     */
    push(text, type = 'info', duration = TOAST_DURATION) {
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
