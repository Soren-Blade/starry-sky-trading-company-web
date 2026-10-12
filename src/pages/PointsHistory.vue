<template>
  <div class="page-shell page-shell--narrow history-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">积分明细</h1>
      <p class="page-shell-desc">每一笔积分的来去都可查，是客服核对的依据</p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="u-card history-state">
      <AppIcon name="file" class="history-state-icon" />
      <p class="history-state-title">请先登录账号</p>
      <p class="history-state-desc">登录后可查看积分明细</p>
      <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看积分明细')">
        立即登录
      </button>
    </div>

    <template v-else>
      <!-- 汇总：与积分中心同源（同一份 summary），两处数字不会打架 -->
      <section class="history-summary">
        <div class="u-card history-stat">
          <span class="history-stat-label">获得</span>
          <span class="history-stat-value is-earn">+{{ summary.earned }}</span>
        </div>
        <div class="u-card history-stat">
          <span class="history-stat-label">消耗</span>
          <span class="history-stat-value is-spend">-{{ summary.spent }}</span>
        </div>
        <div class="u-card history-stat">
          <span class="history-stat-label">当前余额</span>
          <span class="history-stat-value">{{ pointsStore.points }}</span>
          <span class="history-stat-hint">可抵 ¥{{ formatPointsValue(pointsStore.points) }}</span>
        </div>
      </section>

      <!-- 类型筛选：选项来自 constants，与后端 type 取值一一对应 -->
      <nav class="history-filter" aria-label="流水类型筛选">
        <button
          v-for="option in POINTS_LEDGER_TYPES"
          :key="option.value"
          type="button"
          class="history-filter-btn"
          :class="{ 'is-active': pointsStore.historyType === option.value }"
          :aria-pressed="pointsStore.historyType === option.value"
          @click="switchType(option.value)"
        >
          {{ option.label }}
        </button>
      </nav>

      <div v-if="pointsStore.loadingHistory && !pointsStore.history.length" class="u-card history-skeleton">
        <span v-for="n in 3" :key="n" class="u-skeleton history-skeleton-line"></span>
      </div>

      <div v-else-if="pointsStore.error" class="u-card history-error" role="alert">
        <AppIcon name="alert-triangle" />
        <span>{{ pointsStore.error }}</span>
        <button type="button" class="u-btn" @click="pointsStore.fetchHistory()">重试</button>
      </div>

      <div v-else-if="!pointsStore.history.length" class="u-card history-state">
        <AppIcon name="file" class="history-state-icon" />
        <p class="history-state-title">{{ emptyTitle }}</p>
        <p class="history-state-desc">签到、下单与任务都会在这里留下记录</p>
      </div>

      <template v-else>
        <ul class="history-list">
          <li v-for="row in pointsStore.history" :key="row.id" class="u-card history-item">
            <div class="history-item-main">
              <span class="history-item-type">{{ row.type_text }}</span>
              <span class="history-item-time">{{ formatTime(row.created_at) }}</span>
              <span v-if="row.remark" class="history-item-remark">{{ row.remark }}</span>
              <!-- 关联单号：客服核对时要能定位到具体订单 -->
              <span v-if="row.ref_order_no" class="history-item-ref">单号 {{ row.ref_order_no }}</span>
            </div>
            <div class="history-item-right">
              <span class="history-item-delta" :class="row.delta > 0 ? 'is-earn' : 'is-spend'">
                {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
              </span>
              <span class="history-item-balance">余额 {{ row.balance_after }}</span>
            </div>
          </li>
        </ul>

        <!-- 分页：只有一页时不渲染控件（避免出现点不动的按钮） -->
        <div v-if="pointsStore.totalPages > 1" class="history-pager">
          <button
            type="button"
            class="u-btn"
            :disabled="!pointsStore.hasPrev"
            @click="goPage(pointsStore.page - 1)"
          >
            上一页
          </button>
          <span class="history-pager-info">{{ pointsStore.page }} / {{ pointsStore.totalPages }}（共 {{ pointsStore.total }} 条）</span>
          <button
            type="button"
            class="u-btn"
            :disabled="!pointsStore.hasNext"
            @click="goPage(pointsStore.page + 1)"
          >
            下一页
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 积分明细（`/points/history`）—— 方案 §P0-4
 *
 * 定位是**可解释性来源**：客服申诉时要能指着某一行说清「这 50 分是怎么没的」。
 * 因此每一行都要给：类型中文、时间、关联单号、变动后余额。
 *
 * 三个纪律：
 *   1. **类型中文用服务端给的 `type_text`**（`mapLedgerRow` 已补），
 *      前端只在筛选下拉里用本地常量 —— 两处说法来自同一份定义。
 *   2. **改筛选要把页码拉回第 1 页**（store 的 `setHistoryType` 已处理），
 *      否则会停在一个不存在的页上、看到空列表。
 *   3. **`expire` 类型的流水计入列表但不计入「消耗」合计** ——
 *      它不是用户花掉的，是批次过期的账务记录。后端也是这么算的。
 */
import { computed, onMounted } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { usePointsStore } from '@/stores/points.js'
import { useUserStore } from '@/stores/user.js'
import { POINTS_LEDGER_TYPES, formatPointsValue } from '@/constants/member.js'

const pointsStore = usePointsStore()
const userStore = useUserStore()

const summary = computed(() => ({
  earned: pointsStore.summary?.earned ?? 0,
  spent: pointsStore.summary?.spent ?? 0,
}))

const emptyTitle = computed(() =>
  pointsStore.historyType === 'all' ? '还没有积分记录' : '该类型下没有记录'
)

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function switchType(type) {
  if (pointsStore.historyType === type) return
  pointsStore.setHistoryType(type)
  pointsStore.fetchHistory()
}

function goPage(page) {
  pointsStore.fetchHistory({ page })
}

onMounted(() => {
  if (!userStore.isLoggedIn) return
  pointsStore.fetchHistory({ page: 1 })
  if (!pointsStore.account) pointsStore.fetchAccount()
})
</script>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 空态 */
.history-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 5);
  text-align: center;
}
.history-state-icon {
  font-size: var(--fs-h2);
  color: var(--text-muted);
}
.history-state-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.history-state-desc {
  margin: 0;
  color: var(--text-muted);
}

/* 汇总 */
.history-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: calc(var(--space-unit) * 2);
}
.history-stat {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  padding: calc(var(--space-unit) * 2);
}
.history-stat-label {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.history-stat-value {
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
}
.history-stat-value.is-earn {
  color: var(--success);
}
.history-stat-value.is-spend {
  color: var(--warning);
}
.history-stat-hint {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 筛选 */
.history-filter {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 0.5);
}
.history-filter-btn {
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-label);
  color: var(--text-muted);
  background: none;
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-media);
  cursor: pointer;
  transition: color var(--transition-interactive), border-color var(--transition-interactive);
}
.history-filter-btn:hover {
  color: var(--text-primary);
}
.history-filter-btn.is-active {
  color: var(--accent);
  border-color: var(--accent);
}

/* 骨架与错误 */
.history-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 3);
}
.history-skeleton-line {
  height: calc(var(--space-unit) * 4);
  border-radius: var(--radius-media);
}
.history-error {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
  color: var(--danger);
}

/* 流水 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  margin: 0;
  padding: 0;
  list-style: none;
}
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2);
}
.history-item-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  min-width: 0;
}
.history-item-type {
  font-weight: var(--fw-heading);
}
.history-item-time,
.history-item-remark,
.history-item-ref {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.history-item-remark {
  overflow-wrap: anywhere;
}
.history-item-ref {
  font-family: var(--font-mono);
}
.history-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: calc(var(--space-unit) * 0.25);
  flex-shrink: 0;
}
.history-item-delta {
  font-family: var(--font-mono);
  font-size: var(--fs-price);
}
.history-item-delta.is-earn {
  color: var(--success);
}
.history-item-delta.is-spend {
  color: var(--warning);
}
.history-item-balance {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 分页 */
.history-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 2);
}
.history-pager-info {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
