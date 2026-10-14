import { defineStore } from 'pinia'

import {
  getMailLog,
  getMessages,
  getPreferences,
  getUnreadCount,
  markRead as markReadRequest,
  updatePreferences,
} from '@/api/ask/mail.js'

/**
 * 消息中心
 *
 * ## 两条独立的数据线
 *
 * 1. **未读数**：顶栏角标常驻，登录后由 `App.vue` 拉一次，打开用户下拉时再顺手刷新。
 *    它只有一个数字，因此单独留一个动作 —— 刷新角标不该顺带把整个列表拉一遍。
 * 2. **列表 / 偏好 / 台账**：进入 `/mail` 才需要，按页签懒加载。
 *
 * ## 为什么错误不抛出去
 *
 * 与其它账号级 store 一致：把错误写进 state 供页面展示，动作本身不 reject。
 * 页面因此不需要为每个调用写 try/catch，也不会出现「忘了 catch 导致控制台
 * 一条未处理的 Promise 拒绝」。
 */
export const useMailStore = defineStore('mail', {
  state: () => ({
    // ── 站内通知 ──────────────────────────────────────────────
    list: [],
    unreadCount: 0,
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    loadingMessages: false,
    messagesError: '',
    marking: false,

    // ── 通知偏好 ──────────────────────────────────────────────
    preferences: null,
    emailConfigured: false,
    emailMasked: '',
    loadingPreferences: false,
    savingPreferences: false,
    preferencesError: '',
    preferencesSaved: false,

    // ── 邮件台账 ──────────────────────────────────────────────
    log: [],
    logStats: { queued: 0, sent: 0, failed: 0 },
    logPage: 1,
    logTotal: 0,
    logTotalPages: 1,
    loadingLog: false,
    logError: '',
  }),

  getters: {
    hasUnread: (state) => state.unreadCount > 0,
    /** 角标文案：超过两位数就收敛成 99+，否则顶栏会被撑开 */
    unreadLabel: (state) => (state.unreadCount > 99 ? '99+' : String(state.unreadCount)),
    hasMessages: (state) => state.list.length > 0,
    hasPrev: (state) => state.page > 1,
    hasNext: (state) => state.page < state.totalPages,
    hasLogPrev: (state) => state.logPage > 1,
    hasLogNext: (state) => state.logPage < state.logTotalPages,
    emailEnabled: (state) => Boolean(state.preferences?.email_enabled),
  },

  actions: {
    /**
     * 刷新未读数（顶栏角标）
     *
     * 失败默认静默：角标是装饰性信息，一次失败的网络请求不该弹提示，
     * 更不该把已经拿到的数字清成 0 —— 那会让用户以为「消息突然没了」。
     */
    async fetchUnreadCount({ silent = true } = {}) {
      try {
        const { data } = await getUnreadCount()
        this.unreadCount = Number(data?.unread ?? 0)
      } catch (error) {
        if (!silent) this.messagesError = error?.message || '获取未读数失败'
      }
      return this.unreadCount
    },

    /**
     * 拉取通知列表
     * @param {{ page?: number }} options 传 page 时先切页再请求
     */
    async fetchMessages({ page } = {}) {
      if (page) this.page = page
      this.loadingMessages = true
      this.messagesError = ''
      try {
        const { data } = await getMessages({ page: this.page, limit: this.limit })
        this.list = Array.isArray(data?.list) ? data.list : []
        this.unreadCount = Number(data?.unread ?? 0)
        this.total = Number(data?.pagination?.total ?? 0)
        this.totalPages = Number(data?.pagination?.total_pages ?? 1) || 1
      } catch (error) {
        // 列表清空但**页码保留**：失败时把用户弹回第一页更让人困惑
        this.list = []
        this.total = 0
        this.totalPages = 1
        this.messagesError = error?.message || '获取通知失败'
      } finally {
        this.loadingMessages = false
      }
    },

    /**
     * 标记已读
     * @param {number[]|null} ids 省略 = 全部
     * @returns {Promise<number|null>} 实际更新的条数；失败返回 null
     */
    async markRead(ids = null) {
      // 连点保护：重复请求除了浪费往返，还会让「全部标为已读」的返回条数错乱
      if (this.marking) return null
      this.marking = true
      try {
        const { data } = await markReadRequest(ids)
        const updated = Number(data?.updated ?? 0)
        this.unreadCount = Number(data?.unread ?? 0)

        // 本地同步已读样式：不重新拉列表，避免刚读完的一屏闪一下
        if (updated > 0) {
          const wanted = ids ? new Set(ids.map(Number)) : null
          this.list = this.list.map((item) => {
            if (wanted && !wanted.has(Number(item.id))) return item
            return item.is_read ? item : { ...item, is_read: true }
          })
        }
        return updated
      } catch (error) {
        this.messagesError = error?.message || '标记已读失败'
        return null
      } finally {
        this.marking = false
      }
    },

    /** 拉取通知偏好 */
    async fetchPreferences() {
      this.loadingPreferences = true
      this.preferencesError = ''
      try {
        const { data } = await getPreferences()
        this.preferences = data?.preferences || null
        this.emailConfigured = Boolean(data?.email_configured)
        this.emailMasked = data?.email_masked || ''
      } catch (error) {
        this.preferences = null
        this.preferencesError = error?.message || '获取通知偏好失败'
      } finally {
        this.loadingPreferences = false
      }
    },

    /**
     * 保存通知偏好（只提交改动项）
     * @param {object} patch 例如 `{ order_enabled: false }`
     * @returns {Promise<boolean>} 是否成功
     */
    async savePreferences(patch) {
      if (this.savingPreferences) return false
      this.savingPreferences = true
      this.preferencesError = ''
      try {
        const { data } = await updatePreferences(patch)
        this.preferences = data?.preferences || this.preferences
        this.preferencesSaved = true
        return true
      } catch (error) {
        this.preferencesError = error?.message || '保存通知偏好失败'
        return false
      } finally {
        this.savingPreferences = false
      }
    },

    /** 拉取邮件台账 */
    async fetchMailLog({ page } = {}) {
      if (page) this.logPage = page
      this.loadingLog = true
      this.logError = ''
      try {
        const { data } = await getMailLog({ page: this.logPage, limit: this.limit })
        this.log = Array.isArray(data?.list) ? data.list : []
        this.logStats = {
          queued: Number(data?.stats?.queued ?? 0),
          sent: Number(data?.stats?.sent ?? 0),
          failed: Number(data?.stats?.failed ?? 0),
        }
        this.logTotal = Number(data?.pagination?.total ?? 0)
        this.logTotalPages = Number(data?.pagination?.total_pages ?? 1) || 1
      } catch (error) {
        this.log = []
        this.logStats = { queued: 0, sent: 0, failed: 0 }
        this.logTotal = 0
        this.logTotalPages = 1
        this.logError = error?.message || '获取邮件记录失败'
      } finally {
        this.loadingLog = false
      }
    },

    /**
     * 清空所有账号级数据。
     *
     * 由 `App.vue` 在「换号 / 登出」时调用（与购物车、收藏、会员概览同一时机）：
     * 未读数与偏好都属于**上一个账号**，留着会把 A 的角标显示给 B。
     */
    reset() {
      this.list = []
      this.unreadCount = 0
      this.page = 1
      this.total = 0
      this.totalPages = 1
      this.loadingMessages = false
      this.messagesError = ''
      this.marking = false

      this.preferences = null
      this.emailConfigured = false
      this.emailMasked = ''
      this.loadingPreferences = false
      this.savingPreferences = false
      this.preferencesError = ''
      this.preferencesSaved = false

      this.log = []
      this.logStats = { queued: 0, sent: 0, failed: 0 }
      this.logPage = 1
      this.logTotal = 0
      this.logTotalPages = 1
      this.loadingLog = false
      this.logError = ''
    },
  },
})
