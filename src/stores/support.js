import { defineStore } from 'pinia'

import { createThread, getThread, getThreads, reply as replyRequest } from '@/api/ask/support.js'

import { supportUnreadLabel } from '@/constants/support.js'

/**
 * 客服中心
 *
 * ## 为什么和消息中心一样「错误不抛出去」
 *
 * 与其它账号级 store 一致：错误写进 state 给页面展示，动作本身不 reject。
 * 客服页有三块独立区域（提交结果 / 会话列表 / 会话详情），各自有自己的
 * 错误字段，因此一处失败不会把另外两块的界面弄脏。
 *
 * ## 回执号是唯一凭据
 *
 * 会话对外只有 `thread_no`。当前打开的会话用 `currentNo` 单独存一份字符串，
 * 而**不是**只靠 `current` 对象 —— 提交成功后详情还没拉回来时，页面要能立刻
 * 展示「你的回执号是 …」，也要能凭它去 `/support?thread=` 深链。
 *
 * ## 客服与消息中心的关系
 *
 * 站内通知的 `link` 指向 `/support?thread=<回执号>`（见服务端 §4.24 的通知接线表），
 * 因此这个 store 必须支持「先按回执号打开详情」——即 `fetchThread(no)` 是入口，
 * 不依赖列表先加载过。
 */
export const useSupportStore = defineStore('support', {
  state: () => ({
    // ── 我的会话列表 ──────────────────────────────────────────
    threads: [],
    threadsPage: 1,
    threadsLimit: 10,
    threadsTotal: 0,
    threadsTotalPages: 1,
    threadsUnread: 0,
    loadingThreads: false,
    threadsError: '',

    // ── 会话详情 ──────────────────────────────────────────────
    /** 当前打开的回执号（提交成功后也会被写进来，此时 current 可能还是 null） */
    currentNo: '',
    current: null,
    messages: [],
    loadingThread: false,
    threadError: '',

    // ── 提交反馈 ──────────────────────────────────────────────
    creating: false,
    /** 提交成功后的服务端回包 `{ thread_no, message_id, status }` */
    created: null,
    createError: '',

    // ── 追问 ──────────────────────────────────────────────────
    replying: false,
    replyError: '',
    /** 最近一次追问是否成功（用于页面上「已发送」这类即时反馈） */
    replySent: false,
  }),

  getters: {
    hasThreads: (state) => state.threads.length > 0,
    threadsHasPrev: (state) => state.threadsPage > 1,
    threadsHasNext: (state) => state.threadsPage < state.threadsTotalPages,
    hasThreadsUnread: (state) => state.threadsUnread > 0,
    threadsUnreadLabel: (state) => supportUnreadLabel(state.threadsUnread),

    /** 提交成功拿到回执号了吗（页面据此把表单切成「已受理」） */
    hasCreated: (state) => Boolean(state.created?.thread_no),
    createdThreadNo: (state) => state.created?.thread_no || '',

    /** 详情是否已打开（详情面板与列表面板互斥） */
    hasCurrent: (state) => Boolean(state.currentNo),
    hasMessages: (state) => state.messages.length > 0,
    /** 会话状态（未打开时为空串，页面据此不渲染状态标签） */
    currentStatus: (state) => state.current?.status || '',
    /** 联系邮箱：注册用户由服务端回填账号邮箱，游客是自己填的那个 */
    currentEmail: (state) => state.current?.contact_email || '',
  },

  actions: {
    /**
     * 提交反馈
     *
     * @returns {Promise<string|null>} 成功返回回执号，失败返回 null（原因在 createError）
     *
     * 连点保护与「标记已读」同理：重复提交会**真的**多开一条会话，还会吃掉
     * 24 小时 5 次的额度 —— 那是用户自己的损失，必须挡在本地。
     */
    async createThread(payload) {
      if (this.creating) return null
      this.creating = true
      this.createError = ''
      try {
        const { data } = await createThread(payload)
        this.created = data || null
        this.currentNo = data?.thread_no || ''
        return this.currentNo || null
      } catch (error) {
        this.created = null
        // 服务端的 429 / 400 文案比前端能编的任何一句都准确（含剩余额度说明），原样展示
        this.createError = error?.message || '提交失败，请稍后再试'
        return null
      } finally {
        this.creating = false
      }
    },

    /** 拉取我的会话列表 */
    async fetchThreads({ page } = {}) {
      if (page) this.threadsPage = page
      this.loadingThreads = true
      this.threadsError = ''
      try {
        const { data } = await getThreads({ page: this.threadsPage, limit: this.threadsLimit })
        this.threads = Array.isArray(data?.list) ? data.list : []
        this.threadsUnread = Number(data?.unread ?? 0)
        this.threadsTotal = Number(data?.pagination?.total ?? 0)
        this.threadsTotalPages = Number(data?.pagination?.total_pages ?? 1) || 1
      } catch (error) {
        // 清列表但保留页码：失败后把用户弹回第一页比停在他看的那页更困惑
        this.threads = []
        this.threadsTotal = 0
        this.threadsTotalPages = 1
        this.threadsUnread = 0
        this.threadsError = error?.message || '获取会话列表失败'
      } finally {
        this.loadingThreads = false
      }
    },

    /**
     * 打开一条会话（含全部消息）
     * @param {string} threadNo 回执号
     * @returns {Promise<boolean>}
     *
     * 404 `THREAD_NOT_FOUND` 同时表示「不存在」与「不是你的」——服务端刻意不区分
     * （否则回执号就成了枚举接口）。页面因此只说「没找到这条会话」，
     * 不提示「可能不是你的」这种既能被枚举又无助益的话。
     */
    async fetchThread(threadNo) {
      const no = String(threadNo || '').trim()
      if (!no) return false
      this.currentNo = no
      this.loadingThread = true
      this.threadError = ''
      try {
        const { data } = await getThread(no)
        this.current = data?.thread || null
        this.messages = Array.isArray(data?.messages) ? data.messages : []
        return true
      } catch (error) {
        this.current = null
        this.messages = []
        this.threadError =
          error?.code === 'THREAD_NOT_FOUND'
            ? '没找到这条会话，请检查回执号是否正确'
            : error?.message || '获取会话详情失败'
        return false
      } finally {
        this.loadingThread = false
      }
    },

    /**
     * 追问
     *
     * 成功后**重新拉一次详情**而不是本地拼一条消息：服务端会同时改会话状态
     * （推回 `open`）与 `message_count`，本地拼出来的那条会与后端的数字对不上。
     *
     * @returns {Promise<boolean>}
     */
    async reply(body) {
      if (this.replying) return false
      const no = this.currentNo
      if (!no) return false
      this.replying = true
      this.replyError = ''
      this.replySent = false
      try {
        await replyRequest(no, body)
        await this.fetchThread(no)
        this.replySent = true
        return true
      } catch (error) {
        this.replyError = error?.message || '发送失败，请稍后再试'
        return false
      } finally {
        this.replying = false
      }
    },

    /** 关掉详情、回到列表（不动已加载的列表数据） */
    closeThread() {
      this.currentNo = ''
      this.current = null
      this.messages = []
      this.threadError = ''
      this.replyError = ''
      this.replySent = false
    },

    /** 提交成功后的「再提一条」：只清提交结果，不动列表 */
    clearCreated() {
      this.created = null
      this.currentNo = ''
      this.createError = ''
    },

    /** 换号 / 登出：全量恢复初值（与 mail store 的 reset 同一职责） */
    reset() {
      this.threads = []
      this.threadsPage = 1
      this.threadsTotal = 0
      this.threadsTotalPages = 1
      this.threadsUnread = 0
      this.loadingThreads = false
      this.threadsError = ''

      this.currentNo = ''
      this.current = null
      this.messages = []
      this.loadingThread = false
      this.threadError = ''

      this.creating = false
      this.created = null
      this.createError = ''

      this.replying = false
      this.replyError = ''
      this.replySent = false
    },
  },
})
