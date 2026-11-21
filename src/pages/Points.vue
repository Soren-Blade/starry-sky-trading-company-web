<template>
  <div class="page-shell page-shell--narrow points-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">{{ t('member.pointsPage.title') }}</h1>
      <p class="page-shell-desc">{{ t('member.pointsPage.description') }}</p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="landmark" class="u-mm-state-icon" />
      <p class="u-mm-state-title">{{ t('member.pointsPage.loginTitle') }}</p>
      <p class="u-mm-state-desc">{{ t('member.pointsPage.loginDesc') }}</p>
      <div class="u-mm-state-actions">
        <button type="button" class="u-btn-primary" @click="userStore.openLoginModal(t('member.pointsPage.loginPrompt'))">
          {{ t('member.pointsPage.loginCta') }}
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
          <button type="button" class="u-btn-secondary" @click="pointsStore.fetchAccount()">{{ t('member.pointsPage.retry') }}</button>
        </div>
      </div>

      <template v-else>
        <!-- 分段：概览（余额 / 构成 / 入口）与流水（可筛选、可翻页的明细）
             —— M2 起 `/points/history` 并入本页，旧地址在路由里重定向过来 -->
        <div class="ec-tabs points-tabs" role="tablist" :aria-label="t('member.pointsPage.tabsAria')">
          <button
            v-for="item in TABS"
            :key="item.value"
            type="button"
            class="ec-tabs__item"
            role="tab"
            :aria-selected="tab === item.value ? 'true' : 'false'"
            @click="switchTab(item.value)"
          >
            {{ t(`member.pointsPage.tab${item.labelKey}`) }}
          </button>
        </div>

        <section v-if="tab === 'overview'" class="u-tabs-content points-panel" :aria-label="t('member.pointsPage.overviewAria')">
          <!-- ① 余额大字。0 分时不显示「0 积分」，而是给获取路径 ——
               「暂无数据 ≠ 加载中」，也不该是「你有 0 元」这种没有信息量的陈述。
               有余额走分片的余额块（§15），没余额走四态容器（§2）——
               两者是不同语义，不再共用一套本地样式。 -->
          <section v-if="pointsStore.points > 0" class="ui-card u-mm-balance">
            <p class="u-mm-balance-num">
              {{ pointsStore.points }}
              <span class="u-mm-balance-unit">{{ t('member.pointsPage.pointsUnit') }}</span>
            </p>
            <p class="u-mm-balance-desc">{{ t('member.pointsPage.balanceDesc', { value: formatPointsValue(pointsStore.points) }) }}</p>
          </section>
          <section v-else class="ui-card u-mm-state">
            <p class="u-mm-state-title">{{ t('member.pointsPage.emptyTitle') }}</p>
            <p class="u-mm-state-desc">{{ t('member.pointsPage.emptyDesc') }}</p>
            <div class="u-mm-state-actions">
              <button v-if="checkinAvailable" type="button" class="u-btn-primary" @click="goCheckin">
                {{ t('member.pointsPage.goCheckin') }}
              </button>
              <router-link v-else :to="{ name: 'Home' }" class="u-btn-secondary">{{ t('member.pointsPage.goShop') }}</router-link>
            </div>
          </section>

          <!-- ② 即将过期：没有将过期的批次时**整块不渲染**（键可能不存在） -->
          <section v-if="pointsStore.expireSoon" class="ui-card points-expiring">
            <AppIcon name="clock" />
            <span>
              {{ t('member.pointsPage.expiring', { points: pointsStore.expireSoon.points, date: formatDate(pointsStore.expireSoon.expire_at) }) }}
            </span>
          </section>

          <!-- ③ 构成与倍率 -->
          <section class="points-stats">
            <div class="ui-card points-stat">
              <span class="points-stat-label">{{ t('member.pointsPage.statsEarned') }}</span>
              <span class="points-stat-value">{{ summaryEarned }}</span>
            </div>
            <div class="ui-card points-stat">
              <span class="points-stat-label">{{ t('member.pointsPage.statsSpent') }}</span>
              <span class="points-stat-value">{{ summarySpent }}</span>
            </div>
            <div class="ui-card points-stat">
              <span class="points-stat-label">{{ t('member.pointsPage.statsMultiplier') }}</span>
              <span class="points-stat-value">×{{ pointsStore.multiplier }}</span>
              <span class="points-stat-hint">{{ pointsStore.isMember ? t('member.pointsPage.memberBonus') : t('member.pointsPage.memberHint') }}</span>
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
                <span class="points-shortcut-soon">{{ t('member.pointsPage.comingSoon') }}</span>
              </span>
            </template>
          </nav>
        </section>

        <section v-else-if="tab === 'history'" class="u-tabs-content points-panel" :aria-label="t('member.pointsPage.historyAria')">
          <!-- 类型筛选：选项来自 constants，与后端 type 取值一一对应 -->
          <nav class="history-filter" :aria-label="t('member.pointsPage.filterAria')">
            <button
              v-for="option in POINTS_LEDGER_TYPES"
              :key="option.value"
              type="button"
              class="history-filter-btn"
              :class="{ 'is-active': pointsStore.historyType === option.value }"
              :aria-pressed="pointsStore.historyType === option.value"
              @click="switchType(option.value)"
            >
              {{ pointsTypeLabel(option.value) }}
            </button>
          </nav>

          <div v-if="pointsStore.loadingHistory && !pointsStore.history.length" class="ui-card history-skeleton">
            <span v-for="n in 3" :key="n" class="u-skeleton history-skeleton-line"></span>
          </div>

          <div v-else-if="pointsStore.error" class="ui-card u-mm-state u-mm-state--error" role="alert">
            <AppIcon name="alert-triangle" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ pointsStore.error }}</p>
            <div class="u-mm-state-actions">
              <button type="button" class="u-btn-secondary" @click="pointsStore.fetchHistory()">{{ t('member.pointsPage.retry') }}</button>
            </div>
          </div>

          <div v-else-if="!pointsStore.history.length" class="ui-card u-mm-state">
            <AppIcon name="file" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ emptyTitle }}</p>
            <p class="u-mm-state-desc">{{ t('member.pointsPage.historyEmptyDesc') }}</p>
          </div>

          <template v-else>
            <!-- 流水台账：行样式走分片 §16（分隔线成行，不再是「一条一张卡」） -->
            <ul class="ui-card u-mm-ledger">
              <li v-for="row in pointsStore.history" :key="row.id" class="u-mm-ledger-row">
                <div class="u-mm-ledger-main">
                  <span class="u-mm-ledger-type">{{ row.type_text }}</span>
                  <span class="u-mm-ledger-sub">
                    <span>{{ formatTime(row.created_at) }}</span>
                    <span v-if="row.remark">{{ row.remark }}</span>
                    <!-- 关联单号：客服核对时要能定位到具体订单 -->
                    <span v-if="row.ref_order_no" class="u-mm-ledger-ref">{{ t('member.pointsPage.refOrder', { no: row.ref_order_no }) }}</span>
                  </span>
                </div>
                <div class="u-mm-ledger-right">
                  <span
                    class="u-mm-ledger-delta"
                    :class="row.delta > 0 ? 'u-mm-ledger-delta--earn' : 'u-mm-ledger-delta--spend'"
                  >
                    {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
                  </span>
                  <span class="u-mm-ledger-balance">{{ t('member.pointsPage.balance', { value: row.balance_after }) }}</span>
                </div>
              </li>
            </ul>

            <!-- 分页：只有一页时不渲染控件（避免出现点不动的按钮） -->
            <div v-if="pointsStore.totalPages > 1" class="u-mm-pager">
              <span class="u-mm-pager-info">
                {{ t('member.pointsPage.pagerInfo', { page: pointsStore.page, total: pointsStore.totalPages, count: pointsStore.total }) }}
              </span>
              <div class="u-mm-pager-btns">
                <button
                  type="button"
                  class="u-btn-secondary"
                  :disabled="!pointsStore.hasPrev"
                  @click="goPage(pointsStore.page - 1)"
                >
                  {{ t('member.pointsPage.prev') }}
                </button>
                <button
                  type="button"
                  class="u-btn-secondary"
                  :disabled="!pointsStore.hasNext"
                  @click="goPage(pointsStore.page + 1)"
                >
                  {{ t('member.pointsPage.next') }}
                </button>
              </div>
            </div>
          </template>
        </section>

        <!-- 商城（1.5.0 M3 的服务端清单）：库存一律显示服务端实时值，
             `null` 是「不限量」而不是「没有」——两者的文案必须不一样 -->
        <section v-else-if="tab === 'mall'" class="u-tabs-content points-panel" :aria-label="t('member.pointsPage.mallAria')">
          <p class="points-panel-desc">
            {{ t('member.pointsPage.mallDesc') }}
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
              <button type="button" class="u-btn-secondary" @click="pointsStore.fetchMall()">{{ t('member.pointsPage.retry') }}</button>
            </div>
          </div>

          <div v-else-if="!pointsStore.hasMallItems" class="ui-card u-mm-state">
            <AppIcon name="ticket" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ t('member.pointsPage.mallEmptyTitle') }}</p>
            <p class="u-mm-state-desc">{{ t('member.pointsPage.mallEmptyDesc') }}</p>
          </div>

          <ul v-else class="u-mm-mall-list">
            <li v-for="item in pointsStore.mallItems" :key="item.item_id" class="u-mm-mall">
              <div class="u-mm-mall-main">
                <p class="u-mm-mall-head">
                  <AppIcon :name="item.icon" class="u-mm-mall-icon" aria-hidden="true" />
                  <span class="u-mm-mall-name">{{ item.name }}</span>
                  <span v-if="item.member_only" class="mall-tag">{{ t('member.pointsPage.mallMemberOnly') }}</span>
                </p>
                <p class="u-mm-mall-desc">{{ item.desc }}</p>
                <p class="u-mm-mall-hint">{{ mallStockText(item) }}</p>
                <p class="u-mm-mall-cost">
                  {{ item.cost }}<span class="u-mm-mall-cost-unit">{{ t('member.pointsPage.mallCostUnit') }}</span>
                </p>
                <p v-if="redeemState(item).reason" class="u-mm-mall-hint u-mm-mall-hint--warn">
                  {{ redeemState(item).reason }}
                </p>
              </div>
              <button
                type="button"
                class="u-btn-primary"
                :disabled="!redeemState(item).ok || Boolean(pointsStore.redeemingId)"
                @click="doRedeem(item)"
              >
                {{ pointsStore.redeemingId === item.item_id ? t('member.pointsPage.redeeming') : t('member.pointsPage.redeem') }}
              </button>
            </li>
          </ul>
        </section>

        <!-- 任务（1.5.0 M5）：进度由服务端每次现算，前端不累加；
             签到任务只展示状态（奖励由签到接口发），按钮给「已领」而不是藏起来 -->
        <section v-else class="u-tabs-content points-panel" :aria-label="t('member.pointsPage.tasksAria')">
          <div class="tasks-head">
            <p class="points-panel-desc">{{ t('member.pointsPage.tasksDesc') }}</p>
            <p v-if="taskStore.claimablePoints > 0" class="tasks-claimable">
              {{ t('member.pointsPage.tasksClaimable', { points: taskStore.claimablePoints }) }}
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
              <button type="button" class="u-btn-secondary" @click="taskStore.fetchTasks()">{{ t('member.pointsPage.retry') }}</button>
            </div>
          </div>

          <div v-else-if="!taskStore.hasTasks" class="ui-card u-mm-state">
            <AppIcon name="clipboard" class="u-mm-state-icon" />
            <p class="u-mm-state-title">{{ t('member.pointsPage.tasksEmptyTitle') }}</p>
            <p class="u-mm-state-desc">{{ t('member.pointsPage.tasksEmptyDesc') }}</p>
          </div>

          <ul v-else class="u-mm-task-list">
            <li
              v-for="task in taskStore.tasks"
              :key="task.task_id"
              class="u-mm-task"
              :class="{ 'u-mm-task--done': task.claimed === true }"
            >
              <AppIcon :name="task.icon" class="u-mm-task-icon" />
              <div class="u-mm-task-main">
                <p class="task-name-row">
                  <span class="u-mm-task-name">{{ task.name }}</span>
                  <span class="u-mm-task-period">{{ periodText(task.period) }}</span>
                </p>
                <p class="u-mm-task-desc">{{ task.desc }}</p>
                <p class="task-progress-row">
                  <span class="u-mm-task-bar">
                    <span
                      class="u-mm-task-bar-fill"
                      :style="{ width: progressPercent(task) + '%' }"
                    ></span>
                  </span>
                  <span class="task-progress-text">{{ task.progress }} / {{ task.target }}</span>
                  <span class="u-mm-task-reward">{{ t('member.pointsPage.taskReward', { points: task.reward_points }) }}</span>
                </p>
              </div>
              <button
                type="button"
                class="u-btn-primary u-mm-task-action"
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
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'
import { usePointsStore } from '@/stores/points.js'
import { useTaskStore } from '@/stores/task.js'
import { useToastStore } from '@/stores/toast.js'
import { useUserStore } from '@/stores/user.js'
import { POINTS_LEDGER_TYPES, formatPointsValue, pointsTypeLabel } from '@/constants/member.js'
import {
  canClaimTask,
  mallRedeemState,
  mallStockText,
  periodText,
  progressPercent,
  taskButtonHint,
  taskButtonLabel,
} from '@/utils/taskDisplay.js'

const { t } = useI18n()
const pointsStore = usePointsStore()
const taskStore = useTaskStore()
const toastStore = useToastStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

/** 分段与 URL 同形：`/points?tab=history` 可以直接分享，浏览器后退也能回到上一段 */
const TABS = [
  { value: 'overview', label: '概览', labelKey: 'Overview' },
  { value: 'history', label: '流水', labelKey: 'History' },
  { value: 'mall', label: '商城', labelKey: 'Mall' },
  { value: 'tasks', label: '任务', labelKey: 'Tasks' },
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
  pointsStore.historyType === 'all'
    ? t('member.pointsPage.historyEmptyAll')
    : t('member.pointsPage.historyEmptyType')
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
  { name: 'UserCheckin', label: '每日签到', labelKey: 'shortcutCheckin', icon: 'check-circle' },
  { name: 'Coupons', label: '我的优惠券', labelKey: 'shortcutCoupons', icon: 'ticket' },
  // 邀请中心（1.6.0）：奖励也是积分来源，放在积分中心最短路径上
  { name: 'Invite', label: '邀请有礼', labelKey: 'shortcutInvite', icon: 'users' },
  { name: 'Member', label: '会员中心', labelKey: 'shortcutMember', icon: 'star' },
  { name: 'MemberBenefits', label: '权益详解', labelKey: 'shortcutBenefits', icon: 'crown' },
]

const shortcuts = computed(() =>
  SHORTCUTS.map((entry) => ({
    ...entry,
    label: t(`member.pointsPage.${entry.labelKey}`, entry.label),
    available: router.hasRoute(entry.name),
  }))
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
      toastStore.success(t('member.pointsPage.redeemCoupon', { name: item.name }))
    } else if (data.order_no) {
      toastStore.success(t('member.pointsPage.redeemOrder', { no: data.order_no }))
    } else {
      toastStore.success(t('member.pointsPage.redeemSuccess'))
    }
  } catch (error) {
    toastStore.error(error?.response?.data?.message || t('member.pointsPage.redeemFailed'))
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
    toastStore.success(t('member.pointsPage.claimSuccess', { points: data.awarded }))
  } catch (error) {
    toastStore.error(error?.response?.data?.message || t('member.pointsPage.claimFailed'))
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

/* 余额：有余额的块见 ui-kit-member.css §15 的 .u-mm-balance，
   0 分时的空态见 §2 的 .u-mm-state —— 两者不再共用一套本地样式 */

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

/* 流水：行见 ui-kit-member.css §16 的 .u-mm-ledger，分页见 §4 的 .u-mm-pager */

/* 商城 / 任务：共用的面板说明与列表骨架 */
.points-panel-desc {
  margin: 0;
  color: var(--text-muted);
}
/* 商城条目本体（列表 / 卡片 / 图标 / 名称 / 描述 / 积分 / 库存 / 提示 / 按钮）见
   ui-kit-member.css §18 的 .u-mm-mall（575px 单列走 §26），这里只留分片未覆盖的一处：
   「会员专属」是业务标签，分片里没有对应的标签件。 */
.mall-tag {
  padding: 0 calc(var(--space-unit) * 0.5);
  font-size: var(--fs-label);
  font-weight: var(--fw-body);
  color: var(--accent);
  border: var(--stroke-width) solid var(--accent);
  border-radius: var(--radius-media);
}

/* 任务：条目本体（图标 / 名称 / 周期 / 说明 / 进度条 / 奖励 / 按钮）见
   ui-kit-member.css §17 的 .u-mm-task，这里只留分片没覆盖的两处「同行排版」 */
.task-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-unit);
  margin: 0;
}
.task-progress-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  font-size: var(--fs-label);
}
/* 分片的进度条只管外观（高度 / 轨道 / 填充），宽度由使用方给 ——
   不给宽度时它在 flex 行里会被压成 0，进度就彻底看不见了。 */
.task-progress-row .u-mm-task-bar {
  width: calc(var(--space-unit) * 12);
}
.task-progress-text {
  color: var(--text-muted);
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
</style>
