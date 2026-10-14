import { defineStore } from 'pinia'

import { getTasks, claim } from '@/api/ask/task.js'

/**
 * 任务中心状态（1.5.0 M5）
 *
 * ## 纪律
 *
 * 1. **进度只认服务端**：`getTasks` 每次都会把进度现算并 upsert 回库，
 *    前端不累加、不缓存「已完成」判断；
 * 2. **`claimable_points` 用服务端给的合计**，不在本地按 `reward_points` 求和 ——
 *    合计口径（只算能领的、不含已领的）属于服务端规则，本地求和是第二份真相；
 * 3. **领奖后重新拉一次清单**：`claim` 只回被领的那条任务，可领合计与顺序
 *    都由服务端重排，本地改一条会留下不一致；
 * 4. 签到任务（`daily_checkin`）`claimable` 恒为 `false`：奖励由签到接口自己发，
 *    这里只展示状态。
 */
export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
    claimablePoints: 0,
    loaded: false,

    loading: false,
    claimingId: '',
    error: '',
  }),

  getters: {
    /** 首屏直接 `.length` 会抛 TypeError，用 getter 收口 */
    hasTasks: (state) => state.tasks.length > 0,
    /** 有奖励可领的任务数（用于页签角标之类的提示，不改状态） */
    claimableCount: (state) => state.tasks.filter((task) => task.claimable && !task.claimed).length,
  },

  actions: {
    async fetchTasks({ silent = false } = {}) {
      this.loading = true
      if (!silent) this.error = ''
      try {
        const { data } = await getTasks()
        this.tasks = data?.tasks || []
        this.claimablePoints = Number(data?.claimable_points ?? 0)
        this.loaded = true
        return data
      } catch (error) {
        this.error = error?.response?.status === 401 ? '' : (error?.message || '获取任务失败')
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * 领奖。成功后就地刷新清单（见文件头第 3 条），并把结果抛回给页面 ——
     * 页面拿 `awarded` 显示「+N 积分」，拿 `points` 同步积分账户。
     *
     * 失败（`TASK_NOT_CLAIMABLE` / `NOT_COMPLETED` / `ALREADY_CLAIMED`）不吞，
     * 交给页面提示。
     */
    async claimTask(taskId) {
      if (this.claimingId) return null
      this.claimingId = taskId
      try {
        const { data } = await claim(taskId)
        await this.fetchTasks({ silent: true })
        return data
      } finally {
        this.claimingId = ''
      }
    },

    reset() {
      this.tasks = []
      this.claimablePoints = 0
      this.loaded = false
      this.loading = false
      this.claimingId = ''
      this.error = ''
    },
  },
})
