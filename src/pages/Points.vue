<template>
  <div class="page-shell page-shell--narrow points-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">积分中心</h1>
      <p class="page-shell-desc">签到、消费与任务都能获得积分，100 积分可抵 ¥1</p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="landmark" class="u-mm-state-icon" />
      <p class="u-mm-state-title">请先登录账号</p>
      <p class="u-mm-state-desc">登录后可查看积分余额与明细</p>
      <div class="u-mm-state-actions">
        <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看积分')">
          立即登录
        </button>
      </div>
    </div>

    <template v-else>
      <div v-if="pointsStore.loadingAccount && !pointsStore.account" class="ui-card points-skeleton">
        <span class="u-skeleton points-skeleton-line points-skeleton-line--lg"></span>
        <span class="u-skeleton points-skeleton-line"></span>
      </div>

      <!-- 账户都没拉到时整页报错；流水自己的错误在流水面板里报（两件事分开重试） -->
      <div
        v-else-if="pointsStore.error && !pointsStore.account"
        class="ui-card u-mm-state u-mm-state--error"
        role="alert"
      >
        <AppIcon name="alert-triangle" class="u-mm-state-icon" />
        <p class="u-mm-state-title">{{ pointsStore.error }}</p>
        <div class="u-mm-state-actions">
          <button type="button" class="u-btn-secondary" @click="pointsStore.fetchAccount()">重试</button>
        </div>
      </div>

      <template v-else>
        <!-- 分段：概览（余额 / 构成 / 入口）与流水（可筛选、可翻页的明细）
             —— M2 起 `/points/history` 并入本页，旧地址在路由里重定向过来 -->
        <div class="u-tabs points-tabs" role="tablist" aria-label="积分中心分区">
          <button
            v-for="item in TABS"
            :key="item.value"
            type="button"
            class="u-tab"
            role="tab"
            :aria-selected="tab === item.value"
            :class="{ 'u-tab--active': tab === item.value }"
            @click="switchTab(item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <section v-if="tab === 'overview'" class="u-tabs-content points-panel" aria-label="积分概览">
          <!-- ① 余额大字。0 分时不显示「0 积分」，而是给获取路径 ——
               「暂无数据 ≠ 加载中」，也不该是「你有 0 元」这种没有信息量的陈述 -->
          <section class="ui-card points-balance">
            <template v-if="pointsStore.points > 0">
              <p class="points-balance-num">
                {{ pointsStore.points }}
                <span class="points-balance-unit">积分</span>
              </p>
              <p class="points-balance-value">可抵扣 ¥{{ formatPointsValue(pointsStore.points) }}</p>
            </template>
            <template v-else>
              <p class="points-balance-empty">还没有积分</p>
              <p class="points-balance-desc">去签到或下单即可获得积分</p>
              <div class="points-balance-actions">
                <button v-if="checkinAvailable" type="button" class="u-btn-primary" @click="goCheckin">
                  去签到
                </button>
                <router-link v-else :to="{ name: 'Home' }" class="u-btn-secondary">去逛逛商品</router-link>
              </div>
            </template>
          </section>

          <!-- ② 即将过期：没有将过期的批次时**整块不渲染**（键可能不存在） -->
          <section v-if="pointsStore.expireSoon" class="ui-card points-expiring">
            <AppIcon name="clock" />
            <span>
              <strong>{{ pointsStore.expireSoon.points }}</strong> 积分将于
              {{ formatDate(pointsStore.expireSoon.expire_at) }} 到期，请尽快使用
            </span>
          </section>

          <!-- ③ 构成与倍率 -->
          <section class="points-stats">
            <div class="ui-card points-stat">
              <span class="points-stat-label">本年度获得</span>
              <span class="points-stat-value">{{ summaryEarned }}</span>
            </div>
            <div class="ui-card points-stat">
              <span class="points-stat-label">本年度消耗</span>
              <span class="points-stat-value">{{ summarySpent }}</span>
            </div>
            <div class="ui-card points-stat">
              <span class="points-stat-label">积分倍率</span>
              <span class="points-stat-value">×{{ pointsStore.multiplier }}</span>
              <span class="points-stat-hint">{{ pointsStore.isMember ? '会员加成生效中' : '开通会员，消费积分 ×2' }}</span>
            </div>
          </section>

          <!-- ④ 快捷入口：只渲染已存在的路由，未落地的为禁用态（不死链） -->
          <nav class="points-shortcuts">
            <template v-for="entry in shortcuts" :key="entry.name">
              <router-link v-if="entry.available" :to="{ name: entry.name }" class="ui-card points-shortcut">
                <AppIcon :name="entry.icon" />
                <span>{{ entry.label }}</span>
              </router-link>
              <span v-else class="ui-card points-shortcut is-disabled" aria-disabled="true">
                <AppIcon :name="entry.icon" />
                <span>{{ entry.label }}</span>
                <span class="points-shortcut-soon">即将上线</span>
              </span>
            </template>
          </nav>
        </section>

        <section v-else-if="tab === 'history'" class="u-tabs-content points-panel" aria-label="积分流水">
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

          <div v-if="pointsStore.loadingHistory && !pointsStore.history.length" class="ui-card history-skeleton">
            <span v-for="n in 3" :key="n" class="u-skeleton history-skeleton-line"></span>
          </div>

          <div v-else-if="pointsStore.error" class="ui-card u-mm-state u-mm-state--error" role="alert">
            <AppIcon name="alert-triangle" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ pointsStore.error }}</p>
            <div class="u-mm-state-actions">
              <button type="button" class="u-btn-secondary" @click="pointsStore.fetchHistory()">重试</button>
            </div>
          </div>

          <div v-else-if="!pointsStore.history.length" class="ui-card u-mm-state">
            <AppIcon name="file" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ emptyTitle }}</p>
            <p class="u-mm-state-desc">签到、下单与任务都会在这里留下记录</p>
          </div>

          <template v-else>
            <ul class="history-list">
              <li v-for="row in pointsStore.history" :key="row.id" class="ui-card history-item">
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
                class="u-btn-secondary"
                :disabled="!pointsStore.hasPrev"
                @click="goPage(pointsStore.page - 1)"
              >
                上一页
              </button>
              <span class="history-pager-info">
                {{ pointsStore.page }} / {{ pointsStore.totalPages }}（共 {{ pointsStore.total }} 条）
              </span>
              <button
                type="button"
                class="u-btn-secondary"
                :disabled="!pointsStore.hasNext"
                @click="goPage(pointsStore.page + 1)"
              >
                下一页
              </button>
            </div>
          </template>
        </section>

        <!-- 商城（1.5.0 M3 的服务端清单）：库存一律显示服务端实时值，
             `null` 是「不限量」而不是「没有」——两者的文案必须不一样 -->
        <section v-else-if="tab === 'mall'" class="u-tabs-content points-panel" aria-label="积分商城">
          <p class="points-panel-desc">
            兑换即扣分：券类立刻进「我的优惠券」，实物类生成 0 元兑换单（在订单里发货）。
          </p>

          <div v-if="pointsStore.loadingMall && !pointsStore.hasMallItems" class="ui-card history-skeleton">
            <span v-for="n in 2" :key="n" class="u-skeleton history-skeleton-line"></span>
          </div>

          <div
            v-else-if="pointsStore.error && !pointsStore.hasMallItems"
            class="ui-card u-mm-state u-mm-state--error"
            role="alert"
          >
            <AppIcon name="alert-triangle" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ pointsStore.error }}</p>
            <div class="u-mm-state-actions">
              <button type="button" class="u-btn-secondary" @click="pointsStore.fetchMall()">重试</button>
            </div>
          </div>

          <div v-else-if="!pointsStore.hasMallItems" class="ui-card u-mm-state">
            <AppIcon name="ticket" class="u-mm-state-icon" />
            <p class="u-mm-state-title">商城暂时没有可兑换的条目</p>
            <p class="u-mm-state-desc">上新后会出现在这里</p>
          </div>

          <ul v-else class="mall-list">
            <li v-for="item in pointsStore.mallItems" :key="item.item_id" class="ui-card mall-item">
              <AppIcon :name="item.icon" class="mall-item-icon" />
              <div class="mall-item-main">
                <p class="mall-item-name">
                  {{ item.name }}
                  <span v-if="item.member_only" class="mall-item-tag">会员专属</span>
                </p>
                <p class="mall-item-desc">{{ item.desc }}</p>
                <p class="mall-item-meta">
                  <span class="mall-item-cost">{{ item.cost }} 积分</span>
                  <span class="mall-item-stock">{{ mallStockText(item) }}</span>
                </p>
                <p v-if="redeemState(item).reason" class="mall-item-hint">
                  {{ redeemState(item).reason }}
                </p>
              </div>
              <button
                type="button"
                class="u-btn-primary mall-item-btn"
                :disabled="!redeemState(item).ok || Boolean(pointsStore.redeemingId)"
                @click="doRedeem(item)"
              >
                {{ pointsStore.redeemingId === item.item_id ? '兑换中…' : '兑换' }}
              </button>
            </li>
          </ul>
        </section>

        <!-- 任务（1.5.0 M5）：进度由服务端每次现算，前端不累加；
             签到任务只展示状态（奖励由签到接口发），按钮给「已领」而不是藏起来 -->
        <section v-else class="u-tabs-content points-panel" aria-label="任务中心">
          <div class="tasks-head">
            <p class="points-panel-desc">每日与每月任务，完成后领积分奖励。</p>
            <p v-if="taskStore.claimablePoints > 0" class="tasks-claimable">
              可领 <strong>{{ taskStore.claimablePoints }}</strong> 积分
            </p>
          </div>

          <div v-if="taskStore.loading && !taskStore.hasTasks" class="ui-card history-skeleton">
            <span v-for="n in 3" :key="n" class="u-skeleton history-skeleton-line"></span>
          </div>

          <div
            v-else-if="taskStore.error && !taskStore.hasTasks"
            class="ui-card u-mm-state u-mm-state--error"
            role="alert"
          >
            <AppIcon name="alert-triangle" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ taskStore.error }}</p>
            <div class="u-mm-state-actions">
              <button type="button" class="u-btn-secondary" @click="taskStore.fetchTasks()">重试</button>
            </div>
          </div>

          <div v-else-if="!taskStore.hasTasks" class="ui-card u-mm-state">
            <AppIcon name="clipboard" class="u-mm-state-icon" />
            <p class="u-mm-state-title">暂时没有任务</p>
            <p class="u-mm-state-desc">活动上线后会出现在这里</p>
          </div>

          <ul v-else class="tasks-list">
            <li v-for="task in taskStore.tasks" :key="task.task_id" class="ui-card task-item">
              <AppIcon :name="task.icon" class="task-item-icon" />
              <div class="task-item-main">
                <p class="task-item-name">
                  {{ task.name }}
                  <span class="task-item-period">{{ periodText(task.period) }}</span>
                </p>
                <p class="task-item-desc">{{ task.desc }}</p>
                <p class="task-item-progress">
                  <span class="task-item-bar">
                    <span
                      class="task-item-bar-fill"
                      :style="{ width: progressPercent(task) + '%' }"
                    ></span>
                  </span>
                  <span class="task-item-progress-text">{{ task.progress }} / {{ task.target }}</span>
                  <span class="task-item-reward">+{{ task.reward_points }} 积分</span>
                </p>
              </div>
              <button
                type="button"
                class="u-btn-primary task-item-btn"
                :disabled="!canClaimTask(task) || Boolean(taskStore.claimingId)"
                :title="taskButtonHint(task)"
                @click="doClaim(task)"
              >
                {{ taskButtonLabel(task) }}
              </button>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 积分中心（`/points`）—— 方案 §P0-3；M2 起并入原 `/points/history` 的流水
 *
 * 分段而不是分页：积分余额、构成与明细是同一件事的三个切面，
 * 分成两个地址后「本年度获得」与「某一行 +50」永远是两份数据；
 * 合到一个页面上，两处数字来自同一份 store，且旧地址仍有重定向（不死链）。
 *
 * 四条纪律：
 *   1. **0 分不显示「0 积分」**，而是给「还没有积分，去签到或下单获取」——
 *      与「暂无数据 ≠ 加载中」是同一条思路：空态要给下一步动作；
 *   2. **`expire_soon` 不存在表示「没有将过期的批次」**（不是 0），
 *      因此用真值判断整块渲染，不去比大小；
 *   3. **余额一律用服务端给的数字**（写接口返回整份快照），不本地加减；
 *   4. **类型中文用服务端给的 `type_text`**，前端只在筛选按钮里用本地常量，
 *      两处说法来自同一份定义。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'
import { usePointsStore } from '@/stores/points.js'
import { useTaskStore } from '@/stores/task.js'
import { useToastStore } from '@/stores/toast.js'
import { useUserStore } from '@/stores/user.js'
import { POINTS_LEDGER_TYPES, formatPointsValue } from '@/constants/member.js'
import {
  canClaimTask,
  mallRedeemState,
  mallStockText,
  periodText,
  progressPercent,
  taskButtonHint,
  taskButtonLabel,
} from '@/utils/taskDisplay.js'

const pointsStore = usePointsStore()
const taskStore = useTaskStore()
const toastStore = useToastStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

/** 分段与 URL 同形：`/points?tab=history` 可以直接分享，浏览器后退也能回到上一段 */
const TABS = [
  { value: 'overview', label: '概览' },
  { value: 'history', label: '流水' },
  { value: 'mall', label: '商城' },
  { value: 'tasks', label: '任务' },
]

const TAB_VALUES = TABS.map((item) => item.value)

/** 认不出的 `tab`（旧链接、手改地址）一律回「概览」，不要渲染出一片空白 */
function normalizeTab(value) {
  return typeof value === 'string' && TAB_VALUES.includes(value) ? value : 'overview'
}

const tab = ref(normalizeTab(route.query.tab))

/** 「本年度获得/消耗」来自明细接口的 summary；还没拉过明细时显示 0 而不是空白 */
const summaryEarned = computed(() => pointsStore.summary?.earned ?? 0)
const summarySpent = computed(() => pointsStore.summary?.spent ?? 0)

/** 日历还没拉过时，只要不是明确「今天已签」就认为可签到（按钮点下去服务端会兜底） */
const checkinAvailable = computed(() => !pointsStore.todayChecked)

const emptyTitle = computed(() =>
  pointsStore.historyType === 'all' ? '还没有积分记录' : '该类型下没有记录'
)

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 切到某段时按需拉数据：**不在 `onMounted` 一口气拉四段** ——
 * 首屏就打四个接口，其中三段用户可能根本不会看。
 */
function ensureTabData(value) {
  if (value === 'history' && !pointsStore.history.length) pointsStore.fetchHistory({ page: 1 })
  if (value === 'mall' && !pointsStore.mallLoaded) pointsStore.fetchMall({ silent: true })
  if (value === 'tasks' && !taskStore.loaded) taskStore.fetchTasks({ silent: true })
}

function switchTab(value) {
  if (value === tab.value) return
  tab.value = value
  router.replace({ name: 'Points', query: value === 'overview' ? {} : { tab: value } })
  ensureTabData(value)
}

watch(
  () => route.query.tab,
  (value) => {
    const next = normalizeTab(value)
    if (next !== tab.value) {
      tab.value = next
      ensureTabData(next)
    }
  }
)

function goCheckin() {
  if (router.hasRoute('UserCheckin')) router.push({ name: 'UserCheckin' })
}

/** 改筛选要把页码拉回第 1 页（store 的 `setHistoryType` 已处理） */
function switchType(type) {
  if (pointsStore.historyType === type) return
  pointsStore.setHistoryType(type)
  pointsStore.fetchHistory()
}

function goPage(page) {
  pointsStore.fetchHistory({ page })
}

/** 可用性由路由表推断，不手写布尔（手写会忘了改，入口永远停在「即将上线」） */
const SHORTCUTS = [
  { name: 'UserCheckin', label: '每日签到', icon: 'check-circle' },
  { name: 'Coupons', label: '我的优惠券', icon: 'ticket' },
  // 邀请中心（1.6.0）：奖励也是积分来源，放在积分中心最短路径上
  { name: 'Invite', label: '邀请有礼', icon: 'users' },
  { name: 'Member', label: '会员中心', icon: 'star' },
  { name: 'MemberBenefits', label: '权益详解', icon: 'crown' },
]

const shortcuts = computed(() =>
  SHORTCUTS.map((entry) => ({ ...entry, available: router.hasRoute(entry.name) }))
)

// ── 商城（契约 §4.10–§4.11）─────────────────────────────────────────

/**
 * 兑换按钮的可点性与理由。
 *
 * 纯逻辑在 `@/utils/taskDisplay.js`（可单测），这里只负责把 store 里的
 * 「是不是会员、有多少积分」传进去 —— util 不读 store，避免出现第二个真相源。
 */
function redeemState(item) {
  return mallRedeemState(item, { isMember: pointsStore.isMember, points: pointsStore.points })
}

async function doRedeem(item) {
  if (pointsStore.redeemingId) return
  try {
    const data = await pointsStore.redeemItem(item.item_id)
    if (!data) return
    // 券类即时到账、实物类生成兑换单 —— 提示语要说清「东西去哪了」
    if (data.coupon) {
      toastStore.success(`兑换成功：「${item.name}」已放进我的优惠券`)
    } else if (data.order_no) {
      toastStore.success(`兑换成功：兑换单 ${data.order_no} 已生成，可在订单里查看`)
    } else {
      toastStore.success('兑换成功')
    }
  } catch (error) {
    toastStore.error(error?.response?.data?.message || '兑换失败，请稍后重试')
  }
}

// ── 任务（契约 §4.16–§4.17）─────────────────────────────────────────
// 文案四态与进度条算法都在 `@/utils/taskDisplay.js`，有单测钉住
// （「自动发放」只给 reward_points<=0 的签到任务，不能用 claimable 判断）。

async function doClaim(task) {
  if (taskStore.claimingId) return
  try {
    const data = await taskStore.claimTask(task.task_id)
    if (!data) return
    // 余额用服务端返回的整份快照，与签到的处理一致（不做本地 +N）
    pointsStore.applyBalance(data)
    toastStore.success(`领取成功，+${data.awarded} 积分`)
  } catch (error) {
    toastStore.error(error?.response?.data?.message || '领取失败，请稍后重试')
  }
}

onMounted(async () => {
  if (!userStore.isLoggedIn) return
  await pointsStore.fetchAccount()
  // 明细里的 summary 用于「本年度」两项，概览段也要用；取一页即可（不需要翻页）
  if (!pointsStore.history.length) pointsStore.fetchHistory()
  // 直接落在「商城」「任务」段（分享链接 / 刷新）时补拉该段数据
  ensureTabData(tab.value)
})
</script>

<style scoped>
.points-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 分段 */
.points-tabs {
  margin-bottom: 0;
}
.points-panel {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 空态 / 出错 —— 容器与文案层走共享分片 .u-mm-state（见 ui-kit-member.css §2） */

/* 骨架 */
.points-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 3);
}
.points-skeleton-line {
  height: calc(var(--space-unit) * 2);
  border-radius: var(--radius-media);
}
.points-skeleton-line--lg {
  height: calc(var(--space-unit) * 6);
}

/* 余额 */
.points-balance {
  padding: calc(var(--space-unit) * 4);
  text-align: center;
}
.points-balance-num {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-display);
  line-height: 1;
  color: var(--accent);
}
.points-balance-unit {
  font-family: var(--font-body);
  font-size: var(--fs-body);
  color: var(--text-muted);
}
.points-balance-value {
  margin: calc(var(--space-unit) * 1.5) 0 0;
  color: var(--text-muted);
}
.points-balance-empty {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.points-balance-desc {
  margin: var(--space-unit) 0 calc(var(--space-unit) * 2);
  color: var(--text-muted);
}
.points-balance-actions {
  display: flex;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
}

/* 即将过期 */
.points-expiring {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
  color: var(--warning);
}

/* 构成 */
.points-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: calc(var(--space-unit) * 2);
}
.points-stat {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 2);
}
.points-stat-label {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.points-stat-value {
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
}
.points-stat-hint {
  font-size: var(--fs-label);
  color: var(--accent);
}

/* 快捷入口 */
.points-shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: calc(var(--space-unit) * 2);
}
.points-shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 2);
  color: inherit;
  text-decoration: none;
  transition: color var(--transition-interactive), border-color var(--transition-interactive);
}
.points-shortcut:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.points-shortcut.is-disabled {
  opacity: 0.6;
}
.points-shortcut-soon {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 流水：类型筛选 */
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

/* 流水：空态 / 骨架 / 错误 */
/* 空态 / 出错见 ui-kit-member.css §2 的 .u-mm-state */
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

/* 流水：列表 */
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
  /* 必须显式写 row：行上同时挂了全局 .ui-card，它声明的是 flex-direction: column。
     只写 display: flex 会被 .ui-card 的列方向覆盖，整行竖排成「图标/内容/金额」三行。 */
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2);
}
/* 每行内容横向排版：类型 · 时间 · 说明 · 单号 一行，右侧 +35 余额 35 一行。
   全列排版会把每条记录拉到三行高，条数一多就翻不到底；横向后一屏能看更多条。
   两处都允许换行（wrap），窄屏也不会互相挤压。 */
.history-item-main {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: calc(var(--space-unit) * 1.5);
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
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: flex-end;
  gap: calc(var(--space-unit) * 1.5);
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

/* 流水：分页 */
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

/* 商城 / 任务：共用的面板说明与列表骨架 */
.points-panel-desc {
  margin: 0;
  color: var(--text-muted);
}
.mall-list,
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  margin: 0;
  padding: 0;
  list-style: none;
}
.mall-item,
.task-item {
  display: flex;
  /* 同 .history-item：卡片挂了两层类，全局 .ui-card 的 column 会盖掉这里的排版意图。 */
  flex-direction: row;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2);
}
.mall-item-icon,
.task-item-icon {
  flex-shrink: 0;
  font-size: var(--fs-h2);
  color: var(--accent);
}
.mall-item-main,
.task-item-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  flex: 1;
  min-width: 0;
}
.mall-item-name,
.task-item-name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-unit);
  margin: 0;
  font-weight: var(--fw-heading);
}
.mall-item-tag,
.task-item-period {
  padding: 0 calc(var(--space-unit) * 0.5);
  font-size: var(--fs-label);
  font-weight: var(--fw-body);
  color: var(--accent);
  border: var(--stroke-width) solid var(--accent);
  border-radius: var(--radius-media);
}
.task-item-period {
  color: var(--text-muted);
  border-color: var(--border);
}
.mall-item-desc,
.task-item-desc {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.mall-item-meta,
.task-item-progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  font-size: var(--fs-label);
}
.mall-item-cost,
.task-item-reward {
  font-family: var(--font-mono);
  color: var(--accent);
}
.mall-item-stock,
.task-item-progress-text {
  color: var(--text-muted);
}
.mall-item-hint {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--warning);
}
.mall-item-btn,
.task-item-btn {
  flex-shrink: 0;
  min-width: calc(var(--space-unit) * 10);
}

/* 任务进度条：宽度按进度内联给，这里只管外观 */
.task-item-bar {
  display: inline-block;
  width: calc(var(--space-unit) * 12);
  height: calc(var(--space-unit) * 0.75);
  overflow: hidden;
  background: var(--border);
  border-radius: var(--radius-pill);
}
.task-item-bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width var(--transition-interactive);
}
.tasks-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-unit);
}
.tasks-claimable {
  margin: 0;
  color: var(--accent);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 575px) {
  /* 极窄屏：横向那行「+35 余额 35」放不下，退回上下两行 */
  .history-item {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-unit);
  }

  .history-item-right {
    justify-content: space-between;
  }

  /* 极窄屏：图标 + 正文 + 按钮挤一行放不下，按钮独占一行 */
  .mall-item,
  .task-item {
    flex-wrap: wrap;
  }

  .mall-item-btn,
  .task-item-btn {
    width: 100%;
  }
}
</style>
