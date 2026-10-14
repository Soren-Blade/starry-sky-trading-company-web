<template>
  <div class="page-shell page-shell--narrow member-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">会员中心</h1>
      <p class="page-shell-desc">
        等级、成长值与八项权益都在这里；权益数值按当前生效等级显示，未解锁的项给出解锁条件。
      </p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card member-state">
      <AppIcon name="star" class="member-state-icon" aria-hidden="true" />
      <p class="member-state-title">请先登录账号</p>
      <p class="member-state-desc">登录后可查看会员等级、成长值与权益数值</p>
      <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看会员中心')">
        立即登录
      </button>
    </div>

    <template v-else>
      <div v-if="memberStore.loadingOverview && !memberStore.overview" class="ui-card member-skeleton">
        <span v-for="n in 3" :key="n" class="u-skeleton member-skeleton-line"></span>
      </div>

      <div v-else-if="memberStore.error" class="ui-card member-error" role="alert">
        <AppIcon name="alert-triangle" aria-hidden="true" />
        <span>{{ memberStore.error }}</span>
        <button type="button" class="u-btn-secondary" @click="memberStore.fetchOverview()">重试</button>
      </div>

      <template v-else>
        <!-- ① 身份区：等级、到期倒计时、续费/开通入口 -->
        <section class="ui-card member-identity">
          <div class="member-identity-main">
            <span class="u-tag member-identity-tag" :class="{ 'u-tag--accent': memberStore.isMember }">
              {{ identityTag }}
            </span>
            <p class="member-identity-title">
              {{ memberStore.isMember ? '会员生效中' : '尚未开通会员' }}
            </p>
            <p class="member-identity-expiry" :class="{ 'is-warning': expiringSoon }">
              <template v-if="memberStore.isMember">
                到期 {{ formatDate(overview.expires_at) }}（剩余 {{ overview.days_left }} 天）
              </template>
              <template v-else> 开通会员即可解锁八项权益，成长值到账即时生效 </template>
            </p>
          </div>
          <div class="member-identity-actions">
            <router-link
              v-if="memberPlansAvailable"
              :to="{ name: 'MemberPlans' }"
              class="u-btn-primary"
            >
              {{ memberStore.isMember ? '续费会员' : '开通会员' }}
            </router-link>
            <router-link :to="{ name: 'MemberBenefits' }" class="u-btn-secondary">权益详解</router-link>
          </div>
        </section>

        <!-- ② 资产概览：三卡就地显示数值，不写「去查看」 -->
        <section class="member-assets" aria-label="资产概览">
          <router-link :to="{ name: 'Points' }" class="ui-card member-asset">
            <span class="member-asset-label">积分</span>
            <span class="member-asset-value">{{ overview.points ?? 0 }}</span>
            <span class="member-asset-hint">可抵 ¥{{ formatPointsValue(overview.points ?? 0) }}</span>
            <span v-if="pointsTodo" class="member-asset-tip">{{ pointsTodo }}</span>
            <span class="member-asset-link">查看明细</span>
          </router-link>

          <router-link :to="{ name: 'Coupons' }" class="ui-card member-asset">
            <span class="member-asset-label">优惠券</span>
            <span class="member-asset-value">{{ overview.coupons ?? 0 }}<span class="member-asset-unit">张</span></span>
            <span class="member-asset-hint">可用于下单抵扣</span>
            <span v-if="couponTodo" class="member-asset-tip">{{ couponTodo }}</span>
            <span class="member-asset-link">查看券包</span>
          </router-link>

          <div class="ui-card member-asset">
            <span class="member-asset-label">会员到期日</span>
            <span class="member-asset-value member-asset-value--date">{{ expiryValue }}</span>
            <span class="member-asset-hint">{{ expiryHint }}</span>
            <span v-if="memberTodo" class="member-asset-tip">{{ memberTodo }}</span>
            <router-link
              v-if="memberPlansAvailable"
              :to="{ name: 'MemberPlans' }"
              class="member-asset-link"
            >
              {{ memberStore.isMember ? '去续费' : '去开通' }}
            </router-link>
          </div>
        </section>

        <!-- ③ 成长值进度：门槛与还差多少都来自服务端，前端只算百分比 -->
        <section class="ui-card member-growth">
          <div class="member-growth-head">
            <h2 class="member-section-title">成长值进度</h2>
            <router-link :to="{ name: 'MemberGrowth' }" class="member-growth-link">成长值明细</router-link>
          </div>
          <p class="member-growth-num">
            当前成长值 <strong>{{ overview.growth ?? 0 }}</strong>
          </p>
          <template v-if="hasNext">
            <div
              class="member-growth-track"
              role="progressbar"
              :aria-valuemin="0"
              :aria-valuemax="100"
              :aria-valuenow="growthPercent"
              :aria-valuetext="`已攒 ${overview.growth}，还差 ${overview.growth_to_next}`"
            >
              <span class="member-growth-fill" :style="{ width: growthPercent + '%' }"></span>
            </div>
            <p class="member-growth-hint">
              距离 {{ overview.next_level_name }}（门槛 {{ growthNextThreshold }}）还差
              {{ overview.growth_to_next }} 成长值
            </p>
          </template>
          <p v-else-if="memberStore.isMember" class="member-growth-hint">
            成长值只升不降、长期有效；已是最高等级，继续累计不影响权益。
          </p>
          <!-- 非会员同样没有 next_level，但这里不能复用满级那句 —— 0 成长值的人
               被告知「已是最高等级」是直接说反。分开写，两者的下一步动作也不同。 -->
          <p v-else class="member-growth-hint">
            成长值只升不降、长期有效；开通会员后按成长值门槛定档，到账即时生效。
          </p>
        </section>

        <!-- ④ 权益卡区：八张卡显示当前值；未解锁显示「V{n} 解锁」而不是 0 -->
        <section class="member-benefits" aria-labelledby="member-benefits-title">
          <h2 id="member-benefits-title" class="member-section-title">我的权益</h2>
          <ul class="member-benefit-grid">
            <li
              v-for="item in benefitCards"
              :key="item.key"
              class="ui-card member-benefit"
              :class="{ 'is-locked': !item.unlocked }"
            >
              <div class="member-benefit-head">
                <AppIcon :name="item.icon" class="member-benefit-icon" aria-hidden="true" />
                <span class="member-benefit-name">{{ item.name }}</span>
              </div>
              <p class="member-benefit-value">{{ item.displayText }}</p>
              <p class="member-benefit-foot">{{ item.footText }}</p>
            </li>
          </ul>
        </section>

        <!-- ⑤ 下一档预告：再赚 N 成长值到 V{n}，并列出下一档会变好的项 -->
        <section class="ui-card member-next" aria-labelledby="member-next-title">
          <h2 id="member-next-title" class="member-section-title">下一档预告</h2>
          <template v-if="nextTier">
            <p class="member-next-title">
              再赚 <strong>{{ nextTier.toNext }}</strong> 成长值到 {{ nextTier.name }}
              <span v-if="nextTier.threshold !== null" class="member-next-sub">（门槛 {{ nextTier.threshold }}）</span>
            </p>
            <ul v-if="nextUpgrades.length" class="member-next-list">
              <li v-for="item in nextUpgrades" :key="item.key" class="member-next-item">
                <AppIcon :name="item.icon" class="member-next-icon" aria-hidden="true" />
                <span class="member-next-name">{{ item.name }}</span>
                <span class="member-next-value">{{ item.valueText }} → {{ item.nextText }}</span>
              </li>
            </ul>
            <router-link :to="{ name: 'MemberBenefits', hash: '#levels' }" class="u-btn-secondary">
              看完整对照表
            </router-link>
          </template>
          <template v-else>
            <p class="member-next-empty">
              开通会员后，八项权益立即按生效等级下发；成长值跨过门槛也会即时升级。
            </p>
            <router-link
              v-if="memberPlansAvailable"
              :to="{ name: 'MemberPlans' }"
              class="u-btn-secondary"
            >
              查看套餐
            </router-link>
          </template>
        </section>

        <!-- ⑥ 快捷入口：全部指向已存在的路由，不留「即将上线」占位 -->
        <nav class="member-shortcuts" aria-label="快捷入口">
          <router-link
            v-for="entry in shortcuts"
            :key="entry.label"
            :to="entry.to"
            class="ui-card member-shortcut"
          >
            <AppIcon :name="entry.icon" aria-hidden="true" />
            <span>{{ entry.label }}</span>
          </router-link>
        </nav>

        <!-- ⑦ 底部链接到权益详解 -->
        <p class="page-note member-footer">
          想看清每一项权益的逐档数值？
          <router-link :to="{ name: 'MemberBenefits' }">查看权益详解</router-link>
          ，或
          <router-link :to="{ name: 'MemberBenefits', hash: '#rules' }">阅读规则与常见问题</router-link>
          。
        </p>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 会员中心枢纽（`/member`）—— 方案 §3.3 / 实施计划 M1
 *
 * 七区块：① 身份区 ② 资产概览三卡 ③ 成长值进度 ④ 权益卡区
 *         ⑤ 下一档预告 ⑥ 快捷入口 ⑦ 底部链接到权益详解
 *
 * 三条纪律：
 *   1. **数值只用服务端给的**：概览的 `points` / `coupons` / `expires_at` / `growth`，
 *      权益卡用 `benefits[].value`，下一档用 `value.next` + `value.next_level`。
 *      页面里不出现写死的「×2.5」「95 折」。
 *   2. **未解锁 ≠ 0**：`value` 键缺席时显示「V{n} 解锁」（`formatBenefitValue` 兜底）。
 *   3. **不新增后端调用**：资产三卡全部取自已拉取的 `getOverview`；
 *      `getPlans` 只在需要下一档门槛且尚未加载时补一次。
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'
import {
  MEMBER_BENEFITS,
  MEMBER_BENEFIT_MAP,
  MEMBER_EXPIRING_DAYS,
  formatBenefitNext,
  formatBenefitValue,
  formatPointsValue,
} from '@/constants/member.js'
import { useMemberStore } from '@/stores/member.js'
import { useUserStore } from '@/stores/user.js'

const memberStore = useMemberStore()
const userStore = useUserStore()
const router = useRouter()

const overview = computed(() => memberStore.overview || {})

const identityTag = computed(() => memberStore.levelName || '非会员')

const expiringSoon = computed(
  () => memberStore.isMember && (overview.value.days_left ?? 0) <= MEMBER_EXPIRING_DAYS
)

const memberPlansAvailable = computed(() => router.hasRoute('MemberPlans'))

/** 待办提醒来自概览的 `todos`，按类型取文案，不额外请求任何接口 */
function todoText(type) {
  const todo = (memberStore.todos || []).find((item) => item.type === type)
  if (!todo) return ''
  return todo.count ? `${todo.text}（${todo.count}）` : todo.text
}
const memberTodo = computed(() => todoText('member_expiring'))
const couponTodo = computed(() => todoText('coupon_expiring'))
const pointsTodo = computed(() => todoText('points_expiring'))

/** 满级或非会员时后端会整块拿掉 next_level / growth_to_next —— 用 undefined 判断，不比大小 */
const hasNext = computed(
  () => overview.value.next_level != null && overview.value.growth_to_next != null
)

const growthPercent = computed(() => {
  const growth = overview.value.growth ?? 0
  const toNext = overview.value.growth_to_next ?? 0
  const total = growth + toNext
  if (total <= 0) return 0
  return Math.round((growth / total) * 100)
})

/** 下一档门槛：优先用 getPlans 的 levels[]，取不到就退回「当前成长值 + 还差多少」 */
const growthNextThreshold = computed(() => {
  const o = overview.value
  const fromPlans = (memberStore.levels || []).find((level) => level.level === o.next_level)
  if (fromPlans && fromPlans.growth_threshold != null) return fromPlans.growth_threshold
  return (o.growth ?? 0) + (o.growth_to_next ?? 0)
})

const nextTier = computed(() => {
  const o = overview.value
  if (!o.next_level) return null
  return {
    name: o.next_level_name || o.next_level,
    threshold: growthNextThreshold.value,
    toNext: o.growth_to_next ?? 0,
  }
})

/** 未登录/概览缺失时按「全部未解锁」渲染，页面不留白 */
const remoteBenefits = computed(() => {
  const list = memberStore.benefits
  if (list && list.length) return list
  return MEMBER_BENEFITS.map((item) => ({
    key: item.key,
    unlocked: false,
    required_level: item.requiredLevel,
  }))
})

const benefitCards = computed(() =>
  remoteBenefits.value.map((remote) => {
    const meta = MEMBER_BENEFIT_MAP[remote.key] || {}
    const valueText = formatBenefitValue(remote.value, meta.tierLabels)
    const nextText = formatBenefitNext(remote.value, meta.tierLabels)
    return {
      key: remote.key,
      name: meta.name || remote.key,
      desc: meta.desc || '',
      icon: meta.icon || 'info',
      unlocked: Boolean(remote.unlocked),
      valueText,
      nextText,
      displayText: remote.unlocked ? valueText || '已解锁' : requiredLabel(remote.required_level),
      footText: remote.unlocked
        ? nextText
          ? `下一档 ${nextText}`
          : '已达最高档'
        : meta.desc || '',
    }
  })
)

/** 下一档会变好的项：`value.next` 存在且与当前值不同 */
const nextUpgrades = computed(() =>
  benefitCards.value
    .filter((item) => item.unlocked && item.nextText && item.nextText !== item.valueText)
    .map((item) => ({
      key: item.key,
      name: item.name,
      icon: item.icon,
      valueText: item.valueText,
      nextText: item.nextText,
    }))
)

function requiredLabel(level) {
  if (!level || level === 'none') return '未解锁'
  return `V${String(level).replace(/^v/i, '')} 解锁`
}

function formatDate(value) {
  if (!value) return '——'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '——'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const expiryValue = computed(() => {
  if (!memberStore.isMember) return '尚未开通'
  return formatDate(overview.value.expires_at)
})

const expiryHint = computed(() => {
  if (!memberStore.isMember) return '开通后立即生效'
  if (overview.value.days_left == null) return '到期时间以服务端为准'
  return `剩余 ${overview.value.days_left} 天`
})

/** 可用性由路由表推断，不手写布尔（手写会忘了改，入口会指向 404） */
const SHORTCUTS = [
  { label: '每日签到', icon: 'check-circle', to: { name: 'UserCheckin' } },
  { label: '我的优惠券', icon: 'ticket', to: { name: 'Coupons' } },
  { label: '积分明细', icon: 'file', to: { name: 'Points', query: { tab: 'history' } } },
  { label: '消息中心', icon: 'mail', to: { name: 'Mail' } },
  { label: '会员套餐', icon: 'credit-card', to: { name: 'MemberPlans' } },
  { label: '权益详解', icon: 'book-open', to: { name: 'MemberBenefits' } },
]

const shortcuts = computed(() => SHORTCUTS.filter((entry) => router.hasRoute(entry.to.name)))

onMounted(() => {
  if (!userStore.isLoggedIn) return
  memberStore.fetchOverview()
  // 下一档门槛要读 levels[]；已加载过就不再请求
  if (!memberStore.hasLevels) memberStore.fetchPlans({ silent: true })
})
</script>

<style scoped>
.member-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 骨架 / 错误 */
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
  color: var(--accent);
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
.member-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 3);
}
.member-skeleton-line {
  height: calc(var(--space-unit) * 3);
  border-radius: var(--radius-media);
}
.member-error {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
  color: var(--danger);
}

.member-section-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}

/* ① 身份区 */
.member-identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 3);
}
.member-identity-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  min-width: 0;
}
.member-identity-tag {
  align-self: flex-start;
}
.member-identity-title {
  margin: 0;
  font-size: var(--fs-h2);
  font-weight: var(--fw-heading);
}
.member-identity-expiry {
  margin: 0;
  color: var(--text-muted);
}
.member-identity-expiry.is-warning {
  color: var(--warning);
}
.member-identity-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-unit);
}

/* ② 资产概览 */
.member-assets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: calc(var(--space-unit) * 2);
}
.member-asset {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 2);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--transition-interactive);
}
a.member-asset:hover {
  border-color: var(--accent);
}
.member-asset-label {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.member-asset-value {
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  color: var(--accent);
}
.member-asset-unit {
  margin-left: var(--space-unit);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  color: var(--text-muted);
}
.member-asset-value--date {
  font-size: var(--fs-h3);
}
.member-asset-hint {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.member-asset-tip {
  font-size: var(--fs-label);
  color: var(--warning);
}
.member-asset-link {
  margin-top: auto;
  font-size: var(--fs-label);
  color: var(--accent);
}

/* ③ 成长值进度 */
.member-growth {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 3);
}
.member-growth-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-unit);
}
.member-growth-link {
  font-size: var(--fs-label);
  color: var(--accent);
}
.member-growth-num {
  margin: 0;
}
.member-growth-track {
  position: relative;
  height: calc(var(--space-unit) * 1);
  overflow: hidden;
  background: var(--divider);
  border-radius: var(--radius-pill);
}
.member-growth-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width var(--transition-interactive);
}
.member-growth-hint {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* ④ 权益卡区 */
.member-benefits {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}
.member-benefit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
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
.member-benefit.is-locked {
  opacity: 0.72;
}
.member-benefit-head {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
}
.member-benefit-icon {
  font-size: var(--fs-h3);
  color: var(--accent);
}
.member-benefit-name {
  font-weight: var(--fw-heading);
}
.member-benefit-value {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
}
.member-benefit.is-locked .member-benefit-value {
  font-family: var(--font-body);
  font-size: var(--fs-body);
  color: var(--text-muted);
}
.member-benefit-foot {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* ⑤ 下一档预告 */
.member-next {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 3);
}
.member-next-title {
  margin: 0;
}
.member-next-sub {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.member-next-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
  padding: 0;
  list-style: none;
}
.member-next-item {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
}
.member-next-icon {
  color: var(--accent);
}
.member-next-name {
  color: var(--text-muted);
}
.member-next-value {
  font-family: var(--font-mono);
}
.member-next-empty {
  margin: 0;
  color: var(--text-muted);
}

/* ⑥ 快捷入口 */
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

/* ⑦ 底部 */
.member-footer {
  margin: 0;
}
</style>
