<template>
  <div class="page-shell page-shell--narrow member-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">会员中心</h1>
      <p class="page-shell-desc">查看会员等级、成长进度与六项权益</p>
    </header>

    <!-- 未登录：给登录引导而不是空数据（与工具页在无身份时的做法一致） -->
    <div v-if="!userStore.isLoggedIn" class="ui-card member-state">
      <AppIcon name="user" class="member-state-icon" />
      <p class="member-state-title">请先登录账号</p>
      <p class="member-state-desc">登录后可查看会员等级、积分与优惠券</p>
      <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看会员中心')">
        立即登录
      </button>
    </div>

    <template v-else>
      <!-- 加载中给骨架屏而不是「暂无数据」：后者在数据回来前是错的 -->
      <div v-if="memberStore.loadingOverview && !memberStore.overview" class="ui-card member-skeleton">
        <span class="u-skeleton member-skeleton-line member-skeleton-line--lg"></span>
        <span class="u-skeleton member-skeleton-line"></span>
      </div>

      <div v-else-if="memberStore.error" class="ui-card member-error" role="alert">
        <AppIcon name="alert-triangle" />
        <span>{{ memberStore.error }}</span>
        <button type="button" class="u-btn-secondary" @click="memberStore.fetchOverview()">重试</button>
      </div>

      <template v-else>
        <!-- ① 身份卡 -->
        <section class="ui-card member-identity">
          <div class="member-identity-main">
            <span class="u-tag member-badge" :class="{ 'u-tag--accent': memberStore.isMember }">
              <AppIcon :name="memberStore.isMember ? 'star' : 'user'" />
              {{ levelLabel }}
            </span>
            <p class="member-nickname">{{ userStore.userInfo?.nickname || '星辰会员' }}</p>
          </div>

          <div class="member-identity-meta">
            <template v-if="memberStore.isMember && memberStore.overview.days_left !== undefined">
              <span class="member-meta-item" :class="{ 'is-warning': isExpiringSoon }">
                <AppIcon name="clock" />
                剩余 {{ memberStore.overview.days_left }} 天
              </span>
              <span v-if="isExpiringSoon" class="member-warning-text">
                会员即将到期，建议及时续费
              </span>
            </template>
            <template v-else>
              <span class="member-meta-item">
                <AppIcon name="info" />
                尚未开通会员
              </span>
            </template>
          </div>

          <div class="member-identity-cta">
            <!-- 套餐页尚未落地：给禁用按钮而不是死链（点进去 404 更糟）。
                 available 由路由表推断，页面落地后自动变可点。 -->
            <button v-if="plansAvailable" type="button" class="u-btn-primary" @click="goPlans">
              {{ memberStore.isMember ? '续费会员' : '开通会员' }}
            </button>
            <button v-else type="button" class="u-btn-secondary" disabled title="套餐页即将上线">
              {{ memberStore.isMember ? '续费会员' : '开通会员' }}（即将上线）
            </button>
          </div>
        </section>

        <!-- ② 成长值进度（非会员没有「下一级」，整块不渲染） -->
        <section
          v-if="memberStore.isMember && memberStore.overview.growth_to_next !== undefined"
          class="ui-card member-growth"
        >
          <div class="member-growth-head">
            <span class="member-growth-title">成长值</span>
            <span class="member-growth-num">{{ memberStore.overview.growth }} / {{ nextThreshold }}</span>
          </div>
          <div
            class="member-growth-bar"
            role="progressbar"
            :aria-valuenow="memberStore.overview.growth"
            aria-valuemin="0"
            :aria-valuemax="nextThreshold"
          >
            <span class="member-growth-fill" :style="{ width: `${growthPercent}%` }"></span>
          </div>
          <p class="member-growth-tip">
            再消费得 {{ memberStore.overview.growth_to_next }} 成长值即可升级到 {{ memberStore.overview.next_level_name }}
            <router-link v-if="growthAvailable" :to="{ name: 'Growth' }" class="member-growth-link">
              查看成长值明细
            </router-link>
          </p>
        </section>

        <!-- ③ 六项权益矩阵：文案来自 constants（唯一实例），解锁状态来自后端 -->
        <section class="member-benefits">
          <div class="member-section-head">
            <h2 class="member-section-title">我的权益</h2>
            <span class="member-section-hint">已解锁 {{ unlockedCount }} / {{ benefits.length }} 项</span>
          </div>
          <ul class="member-benefit-grid">
            <li
              v-for="item in benefits"
              :key="item.key"
              class="ui-card member-benefit"
              :class="{ 'is-locked': !item.unlocked }"
            >
              <span class="member-benefit-icon"><AppIcon :name="item.icon" /></span>
              <span class="member-benefit-name">{{ item.name }}</span>
              <span class="member-benefit-desc">{{ item.desc }}</span>
              <span v-if="item.unlocked" class="member-benefit-state is-on">
                <AppIcon name="check-circle" /> 已解锁
              </span>
              <span v-else class="member-benefit-state">
                <AppIcon name="arrow-up" /> 升级到{{ requiredLevelName(item.requiredLevel) }}解锁
              </span>
            </li>
          </ul>
        </section>

        <!-- ④ 待办提醒：通常 ≤3 条，堆叠即可，不做轮播 -->
        <section v-if="memberStore.todos.length" class="ui-card member-todos">
          <h2 class="member-section-title">待办提醒</h2>
          <ul>
            <li v-for="todo in memberStore.todos" :key="todo.type" class="member-todo">
              <AppIcon :name="todoIcon(todo.type)" />
              <span>{{ todo.text }}</span>
            </li>
          </ul>
        </section>

        <!-- ⑤ 快捷入口四宫格：只渲染已存在的路由，未落地的为禁用态 -->
        <nav class="member-shortcuts">
          <template v-for="entry in shortcuts" :key="entry.name">
            <router-link v-if="entry.available" :to="{ name: entry.name }" class="ui-card member-shortcut">
              <AppIcon :name="entry.icon" />
              <span>{{ entry.label }}</span>
            </router-link>
            <span v-else class="ui-card member-shortcut is-disabled" aria-disabled="true">
              <AppIcon :name="entry.icon" />
              <span>{{ entry.label }}</span>
              <span class="member-shortcut-soon">即将上线</span>
            </span>
          </template>
        </nav>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 会员中心（`/member`）
 *
 * 设计要点（方案 §P0-1）：
 *   1. **非会员不隐藏页面** —— 权益矩阵渲染成「全部未解锁 + 引导开通」，
 *      比「你不是会员」的空白页更有说服力；
 *   2. **数字与首页 hero 同源** —— 都取自后端 `get_member_snapshot`，
 *      因此「还剩多少天」两处必然一致；
 *   3. **权益文案取 `constants/member.js`**（唯一实例），只把后端的解锁状态合进去。
 *      后端刻意不返回名称与描述，就是为了避免出现第二份文案事实。
 *   4. **不适用于「键不存在」** —— 非会员响应里没有 `days_left` / `growth_to_next`
 *      这些键，因此判断用 `!== undefined`，**不能用 `=== 0`**。
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'
import { useMemberStore } from '@/stores/member.js'
import { useUserStore } from '@/stores/user.js'
import {
  MEMBER_BENEFITS,
  MEMBER_EXPIRING_DAYS,
  memberLevelLabel,
  memberLevelName,
} from '@/constants/member.js'

const memberStore = useMemberStore()
const userStore = useUserStore()
const router = useRouter()

const levelLabel = computed(() => memberLevelLabel(memberStore.level) || '非会员')

/** 到期提醒阈值与 hero 文案 `member-expiring` 相同（60 天），两处必须一致 */
const isExpiringSoon = computed(() => {
  const days = memberStore.overview?.days_left
  return typeof days === 'number' && days <= MEMBER_EXPIRING_DAYS
})

/** 把后端的解锁状态合进本地文案 */
const benefits = computed(() =>
  MEMBER_BENEFITS.map((item) => {
    const remote = memberStore.benefits.find((b) => b.key === item.key)
    return { ...item, unlocked: Boolean(remote?.unlocked) }
  })
)

const unlockedCount = computed(() => benefits.value.filter((b) => b.unlocked).length)

const nextThreshold = computed(() => {
  const o = memberStore.overview
  if (!o || o.growth_to_next === undefined) return 0
  return Number(o.growth || 0) + Number(o.growth_to_next || 0)
})

const growthPercent = computed(() => {
  if (!nextThreshold.value) return 100
  const pct = (Number(memberStore.overview?.growth || 0) / nextThreshold.value) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
})

function requiredLevelName(level) {
  return memberLevelName(level) || '更高等级'
}

const TODO_ICONS = {
  member_expiring: 'clock',
  coupon_expiring: 'ticket',
  points_expiring: 'landmark',
}
function todoIcon(type) {
  return TODO_ICONS[type] || 'info'
}

/**
 * 快捷入口。`available` 由**路由表**推断而不是手写布尔 ——
 * 手写的话页面落地后很容易忘了改，入口就永远停在「即将上线」。
 */
const SHORTCUTS = [
  { name: 'Points', label: '积分中心', icon: 'landmark' },
  { name: 'Growth', label: '成长值', icon: 'flame' },
  { name: 'Coupons', label: '我的优惠券', icon: 'ticket' },
  { name: 'Checkin', label: '每日签到', icon: 'check-circle' },
  { name: 'PointsHistory', label: '积分明细', icon: 'file' },
]

const shortcuts = computed(() =>
  SHORTCUTS.map((entry) => ({ ...entry, available: router.hasRoute(entry.name) }))
)

const plansAvailable = computed(() => router.hasRoute('MemberPlans'))
const growthAvailable = computed(() => router.hasRoute('Growth'))

function goPlans() {
  if (router.hasRoute('MemberPlans')) router.push({ name: 'MemberPlans' })
}

onMounted(() => {
  if (userStore.isLoggedIn) memberStore.fetchOverview()
})
</script>

<style scoped>
.member-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 空态 */
.member-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 5);
  text-align: center;
}
.member-state-icon {
  font-size: var(--fs-h2);
  color: var(--text-muted);
}
.member-state-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.member-state-desc {
  margin: 0;
  color: var(--text-muted);
}

/* 骨架与错误 */
.member-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 3);
}
.member-skeleton-line {
  height: calc(var(--space-unit) * 2);
  border-radius: var(--radius-media);
}
.member-skeleton-line--lg {
  height: calc(var(--space-unit) * 4);
}
.member-error {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
  color: var(--danger);
}

/* 身份卡 */
.member-identity {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 3);
}
.member-identity-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
}
.member-badge {
  align-self: flex-start;
}
.member-nickname {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.member-identity-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  grid-column: 1 / -1;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.member-meta-item {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
}
.member-meta-item.is-warning {
  color: var(--warning);
}
.member-warning-text {
  font-size: var(--fs-label);
  color: var(--warning);
}
.member-identity-cta {
  grid-row: 1;
  grid-column: 2;
  align-self: center;
}

/* 成长值进度 */
.member-growth {
  padding: calc(var(--space-unit) * 3);
}
.member-growth-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-unit);
}
.member-growth-title {
  font-weight: var(--fw-heading);
}
.member-growth-num {
  font-family: var(--font-mono);
}
.member-growth-bar {
  height: var(--space-unit);
  overflow: hidden;
  background: var(--bg-surface-2);
  border-radius: var(--radius-media);
}
.member-growth-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width var(--transition-interactive);
}
.member-growth-tip {
  margin: var(--space-unit) 0 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
/* 成长值明细入口：这一行是「成长值怎么涨」的最佳落点，别让用户自己找 */
.member-growth-link {
  margin-left: var(--space-unit);
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}
.member-growth-link:hover {
  text-decoration: underline;
}

/* 权益矩阵 */
.member-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: calc(var(--space-unit) * 2);
}
.member-section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.member-section-hint {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.member-benefit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.member-benefit {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 2);
}
.member-benefit-icon {
  font-size: var(--fs-h3);
  color: var(--accent);
}
.member-benefit-name {
  font-weight: var(--fw-heading);
}
.member-benefit-desc {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.member-benefit-state {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  margin-top: auto;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.member-benefit-state.is-on {
  color: var(--success);
}
/* 未解锁降饱和但保留可见：用户需要看到「有什么可以解锁」 */
.member-benefit.is-locked {
  opacity: 0.72;
}
.member-benefit.is-locked .member-benefit-icon {
  color: var(--text-muted);
}

/* 待办 */
.member-todos {
  padding: calc(var(--space-unit) * 3);
}
.member-todos ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.member-todo {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 0.5) 0;
  color: var(--warning);
}

/* 快捷入口 */
.member-shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: calc(var(--space-unit) * 2);
}
.member-shortcut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 2);
  color: inherit;
  text-decoration: none;
  transition: color var(--transition-interactive), border-color var(--transition-interactive);
}
.member-shortcut:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.member-shortcut.is-disabled {
  opacity: 0.6;
}
.member-shortcut-soon {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 窄屏：身份卡改单列，CTA 另起一行（否则按钮文字会被压成竖排） */
@media (max-width: 575px) {
  .member-identity {
    grid-template-columns: 1fr;
  }
  .member-identity-cta {
    grid-row: auto;
    grid-column: 1;
  }
  .member-identity-cta button {
    width: 100%;
  }
}
</style>
