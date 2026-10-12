<template>
  <div class="page-shell page-shell--narrow points-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">积分中心</h1>
      <p class="page-shell-desc">签到、消费与任务都能获得积分，100 积分可抵 ¥1</p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="u-card points-state">
      <AppIcon name="landmark" class="points-state-icon" />
      <p class="points-state-title">请先登录账号</p>
      <p class="points-state-desc">登录后可查看积分余额与明细</p>
      <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看积分')">
        立即登录
      </button>
    </div>

    <template v-else>
      <div v-if="pointsStore.loadingAccount && !pointsStore.account" class="u-card points-skeleton">
        <span class="u-skeleton points-skeleton-line points-skeleton-line--lg"></span>
        <span class="u-skeleton points-skeleton-line"></span>
      </div>

      <div v-else-if="pointsStore.error" class="u-card points-error" role="alert">
        <AppIcon name="alert-triangle" />
        <span>{{ pointsStore.error }}</span>
        <button type="button" class="u-btn" @click="pointsStore.fetchAccount()">重试</button>
      </div>

      <template v-else>
        <!-- ① 余额大字。0 分时不显示「0 积分」，而是给获取路径 ——
             「暂无数据 ≠ 加载中」，也不该是「你有 0 元」这种没有信息量的陈述 -->
        <section class="u-card points-balance">
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
              <router-link v-else :to="{ name: 'Home' }" class="u-btn">去逛逛商品</router-link>
            </div>
          </template>
        </section>

        <!-- ② 即将过期：没有将过期的批次时**整块不渲染**（键可能不存在） -->
        <section v-if="pointsStore.expireSoon" class="u-card points-expiring">
          <AppIcon name="clock" />
          <span>
            <strong>{{ pointsStore.expireSoon.points }}</strong> 积分将于
            {{ formatDate(pointsStore.expireSoon.expire_at) }} 到期，请尽快使用
          </span>
        </section>

        <!-- ③ 构成与倍率 -->
        <section class="points-stats">
          <div class="u-card points-stat">
            <span class="points-stat-label">本年度获得</span>
            <span class="points-stat-value">{{ summaryEarned }}</span>
          </div>
          <div class="u-card points-stat">
            <span class="points-stat-label">本年度消耗</span>
            <span class="points-stat-value">{{ summarySpent }}</span>
          </div>
          <div class="u-card points-stat">
            <span class="points-stat-label">积分倍率</span>
            <span class="points-stat-value">×{{ pointsStore.multiplier }}</span>
            <span class="points-stat-hint">{{ pointsStore.isMember ? '会员加成生效中' : '开通会员，消费积分 ×2' }}</span>
          </div>
        </section>

        <!-- ④ 快捷入口：只渲染已存在的路由，未落地的为禁用态（不死链） -->
        <nav class="points-shortcuts">
          <template v-for="entry in shortcuts" :key="entry.name">
            <router-link v-if="entry.available" :to="{ name: entry.name }" class="u-card points-shortcut">
              <AppIcon :name="entry.icon" />
              <span>{{ entry.label }}</span>
            </router-link>
            <span v-else class="u-card points-shortcut is-disabled" aria-disabled="true">
              <AppIcon :name="entry.icon" />
              <span>{{ entry.label }}</span>
              <span class="points-shortcut-soon">即将上线</span>
            </span>
          </template>
        </nav>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 积分中心（`/points`）—— 方案 §P0-3
 *
 * 三条纪律：
 *   1. **0 分不显示「0 积分」**，而是给「还没有积分，去签到或下单获取」——
 *      与「暂无数据 ≠ 加载中」是同一条思路：空态要给下一步动作；
 *   2. **`expire_soon` 不存在表示「没有将过期的批次」**（不是 0），
 *      因此用真值判断整块渲染，不去比大小；
 *   3. **余额一律用服务端给的数字**（写接口返回整份快照），不本地加减。
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'
import { usePointsStore } from '@/stores/points.js'
import { useUserStore } from '@/stores/user.js'
import { formatPointsValue } from '@/constants/member.js'

const pointsStore = usePointsStore()
const userStore = useUserStore()
const router = useRouter()

/** 「本年度获得/消耗」来自明细接口的 summary；还没拉过明细时显示 0 而不是空白 */
const summaryEarned = computed(() => pointsStore.summary?.earned ?? 0)
const summarySpent = computed(() => pointsStore.summary?.spent ?? 0)

/** 日历还没拉过时，只要不是明确「今天已签」就认为可签到（按钮点下去服务端会兜底） */
const checkinAvailable = computed(() => !pointsStore.todayChecked)

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function goCheckin() {
  if (router.hasRoute('Checkin')) router.push({ name: 'Checkin' })
}

/** 可用性由路由表推断，不手写布尔（手写会忘了改，入口永远停在「即将上线」） */
const SHORTCUTS = [
  { name: 'PointsHistory', label: '积分明细', icon: 'file' },
  { name: 'Checkin', label: '每日签到', icon: 'check-circle' },
  { name: 'Coupons', label: '我的优惠券', icon: 'ticket' },
  { name: 'Member', label: '会员中心', icon: 'star' },
]

const shortcuts = computed(() =>
  SHORTCUTS.map((entry) => ({ ...entry, available: router.hasRoute(entry.name) }))
)

onMounted(async () => {
  if (!userStore.isLoggedIn) return
  await pointsStore.fetchAccount()
  // 明细里的 summary 用于「本年度」两项，取一页即可（不需要翻页）
  if (!pointsStore.history.length) pointsStore.fetchHistory()
})
</script>

<style scoped>
.points-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 空态 */
.points-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 5);
  text-align: center;
}
.points-state-icon {
  font-size: var(--fs-h2);
  color: var(--accent);
}
.points-state-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.points-state-desc {
  margin: 0;
  color: var(--text-muted);
}

/* 骨架与错误 */
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
.points-error {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
  color: var(--danger);
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
</style>
