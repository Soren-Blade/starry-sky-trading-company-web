<template>
  <div class="page-shell page-shell--narrow member-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">会员中心</h1>
      <p class="page-shell-desc">
        等级、成长值与八项权益都在这里；权益数值按当前生效等级显示，未解锁的项给出解锁条件。
      </p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="star" class="u-mm-state-icon" aria-hidden="true" />
      <p class="u-mm-state-title">请先登录账号</p>
      <p class="u-mm-state-desc">登录后可查看会员等级、成长值与权益数值</p>
      <div class="u-mm-state-actions">
        <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看会员中心')">
          立即登录
        </button>
      </div>
    </div>

    <template v-else>
      <div v-if="memberStore.loadingOverview && !memberStore.overview" class="ui-card member-skeleton">
        <span v-for="n in 3" :key="n" class="u-skeleton member-skeleton-line"></span>
      </div>

      <div v-else-if="memberStore.error" class="ui-card u-mm-state u-mm-state--error" role="alert">
        <AppIcon name="alert-triangle" class="u-mm-state-icon" aria-hidden="true" />
        <p class="u-mm-state-title">{{ memberStore.error }}</p>
        <div class="u-mm-state-actions">
          <button type="button" class="u-btn-secondary" @click="memberStore.fetchOverview()">重试</button>
        </div>
      </div>

      <template v-else>
        <!-- ① 身份卡：等级/到期/成长值/入口统一交给 VipCard，数据仍只来自 getOverview -->
        <VipCard
          :level="memberStore.level"
          :name="identityName"
          :expire-at="identityExpireAt"
          :expire-hint="identityExpireHint"
          :expiring="expiringSoon"
          :growth="overview.growth ?? 0"
          :growth-max="identityGrowthMax"
          :growth-hint="identityGrowthHint"
          :actions="identityActions"
        />

        <!-- ② 资产概览：三卡就地显示数值，不写「去查看」（卡面见 ui-kit-member.css §7） -->
        <section class="u-mm-asset-grid" aria-label="资产概览">
          <router-link
            :to="{ name: 'Points' }"
            class="u-mm-asset"
            :class="{ 'u-mm-asset--empty': !(overview.points ?? 0) }"
          >
            <span class="u-mm-asset-label">积分</span>
            <span class="u-mm-asset-value">{{ overview.points ?? 0 }}</span>
            <span class="u-mm-asset-hint">可抵 ¥{{ formatPointsValue(overview.points ?? 0) }}</span>
            <span class="member-asset-link">查看明细</span>
          </router-link>

          <router-link
            :to="{ name: 'Coupons' }"
            class="u-mm-asset"
            :class="{ 'u-mm-asset--empty': !(overview.coupons ?? 0) }"
          >
            <span class="u-mm-asset-label">优惠券</span>
            <span class="u-mm-asset-value">
              {{ overview.coupons ?? 0 }}<span class="u-mm-asset-unit">张</span>
            </span>
            <span class="u-mm-asset-hint">可用于下单抵扣</span>
            <span class="member-asset-link">查看券包</span>
          </router-link>

          <div class="u-mm-asset">
            <span class="u-mm-asset-label">会员到期日</span>
            <span class="u-mm-asset-value member-asset-date">{{ expiryValue }}</span>
            <span class="u-mm-asset-hint">{{ expiryHint }}</span>
            <router-link
              v-if="memberPlansAvailable"
              :to="{ name: 'MemberPlans' }"
              class="member-asset-link"
            >
              {{ memberStore.isMember ? '去续费' : '去开通' }}
            </router-link>
          </div>
        </section>

        <!-- ②′ 待办提醒：会员到期 / 券过期 / 积分过期三类，一行一条、整条是链接
             （外观见 ui-kit-member.css §19）。没有待办时整块不渲染 ——
             「暂无待办」的占位只会占掉首屏最贵的位置。 -->
        <ul v-if="todos.length" class="u-mm-todo-list" aria-label="待办提醒">
          <li v-for="item in todos" :key="item.type">
            <router-link :to="item.to" class="u-mm-todo">
              <AppIcon :name="item.icon" class="u-mm-todo-icon" aria-hidden="true" />
              <span class="u-mm-todo-text">{{ item.text }}</span>
              <span class="u-mm-todo-link">{{ item.action }}</span>
            </router-link>
          </li>
        </ul>

        <!-- ③ 成长值进度：门槛与还差多少都来自服务端，前端只算百分比（外观见 §8） -->
        <section class="ui-card u-mm-growth">
          <div class="u-mm-growth-head">
            <h2 class="member-section-title">成长值进度</h2>
            <router-link :to="{ name: 'MemberGrowth' }" class="member-growth-link">成长值明细</router-link>
          </div>
          <p class="member-growth-value">
            <span class="u-mm-growth-hint">当前成长值</span>
            <strong class="u-mm-growth-num">{{ overview.growth ?? 0 }}</strong>
          </p>
          <template v-if="hasNext">
            <div
              class="u-mm-growth-track"
              role="progressbar"
              :aria-valuemin="0"
              :aria-valuemax="100"
              :aria-valuenow="growthPercent"
              :aria-valuetext="`已攒 ${overview.growth}，还差 ${overview.growth_to_next}`"
            >
              <div class="u-mm-growth-fill" :style="{ width: growthPercent + '%' }"></div>
            </div>
            <p class="u-mm-growth-hint">
              距离 {{ overview.next_level_name }}（门槛 {{ growthNextThreshold }}）还差
              {{ overview.growth_to_next }} 成长值
            </p>
          </template>
          <p v-else-if="memberStore.isMember" class="u-mm-growth-hint">
            成长值只升不降、长期有效；已是最高等级，继续累计不影响权益。
          </p>
          <!-- 非会员同样没有 next_level，但这里不能复用满级那句 —— 0 成长值的人
               被告知「已是最高等级」是直接说反。分开写，两者的下一步动作也不同。 -->
          <p v-else class="u-mm-growth-hint">
            成长值只升不降、长期有效；开通会员后按成长值门槛定档，到账即时生效。
          </p>
        </section>

        <!-- ④ 权益卡区：八张卡显示当前值；未解锁显示「V{n} 解锁」而不是 0 -->
        <section class="member-benefits" aria-labelledby="member-benefits-title">
          <h2 id="member-benefits-title" class="member-section-title">我的权益</h2>
          <ul class="u-mm-benefit-grid">
            <li
              v-for="item in benefitCards"
              :key="item.key"
              class="u-mm-benefit"
              :class="{ 'u-mm-benefit--locked': !item.unlocked }"
            >
              <AppIcon :name="item.icon" class="u-mm-benefit-icon" aria-hidden="true" />
              <span class="u-mm-benefit-name">{{ item.name }}</span>
              <p class="u-mm-benefit-value">{{ item.displayText }}</p>
              <p class="u-mm-benefit-next">{{ item.footText }}</p>
            </li>
          </ul>
        </section>

        <!-- ⑤ 下一档预告：再赚 N 成长值到 V{n}，并列出下一档会变好的项。
             条目本身是 §9 的权益格（名称 / 当前值 / 下一档），所以这一节不套卡片。 -->
        <section class="member-next" aria-labelledby="member-next-title">
          <h2 id="member-next-title" class="member-section-title">下一档预告</h2>
          <template v-if="nextTier">
            <p class="member-next-title">
              再赚 <strong>{{ nextTier.toNext }}</strong> 成长值到 {{ nextTier.name }}
              <span v-if="nextTier.threshold !== null" class="member-next-sub">（门槛 {{ nextTier.threshold }}）</span>
            </p>
            <ul v-if="nextUpgrades.length" class="u-mm-benefit-grid member-next-list">
              <li v-for="item in nextUpgrades" :key="item.key" class="u-mm-benefit">
                <AppIcon :name="item.icon" class="u-mm-benefit-icon" aria-hidden="true" />
                <span class="u-mm-benefit-name">{{ item.name }}</span>
                <p class="u-mm-benefit-value">{{ item.valueText }}</p>
                <p class="u-mm-benefit-next">
                  下一档 <em class="u-mm-benefit-next-em">{{ item.nextText }}</em>
                </p>
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
import VipCard from '@/components/VipCard.vue'
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

const expiringSoon = computed(
  () => memberStore.isMember && (overview.value.days_left ?? 0) <= MEMBER_EXPIRING_DAYS
)

const memberPlansAvailable = computed(() => router.hasRoute('MemberPlans'))

/** 待办提醒来自概览的 `todos`，按类型取文案，不额外请求任何接口 */
const TODO_META = {
  member_expiring: { icon: 'crown', action: '去续费', to: { name: 'MemberPlans' } },
  coupon_expiring: { icon: 'ticket', action: '查看券包', to: { name: 'Coupons' } },
  points_expiring: { icon: 'clock', action: '查看明细', to: { name: 'Points' } },
}

const todos = computed(() =>
  (memberStore.todos || [])
    .map((todo) => {
      const meta = TODO_META[todo.type]
      if (!meta) return null
      return {
        type: todo.type,
        icon: meta.icon,
        to: meta.to,
        action: meta.action,
        text: todo.count ? `${todo.text}（${todo.count}）` : todo.text,
      }
    })
    .filter(Boolean)
)

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

/** 身份卡（VipCard）的展示数据：全部由既有 overview 派生，不新增任何接口调用 */
const identityName = computed(() =>
  memberStore.isMember ? memberStore.levelName || '会员' : '尚未开通会员'
)

const identityExpireAt = computed(() => {
  if (!memberStore.isMember) return '开通后解锁八项权益'
  const formatted = formatDate(overview.value.expires_at)
  return formatted === '——' ? '' : formatted
})

const identityExpireHint = computed(() => {
  if (!memberStore.isMember) return '成长值到账即时生效'
  if (overview.value.days_left == null) return ''
  return `剩余 ${overview.value.days_left} 天`
})

/** 满级没有下一档，进度用「成长值 / 成长值」自然落到 100%，文案另说明已是最高等级 */
const identityGrowthMax = computed(() => {
  const growth = Number(overview.value.growth) || 0
  if (!hasNext.value) return growth
  return growth + (Number(overview.value.growth_to_next) || 0)
})

const identityGrowthHint = computed(() => {
  if (!memberStore.isMember) return '开通会员后开始累计'
  if (!memberStore.overview) return ''
  if (!hasNext.value) return '已达最高等级'
  return `距 ${overview.value.next_level_name || overview.value.next_level}还差 ${overview.value.growth_to_next}`
})

/** 卡内最多两个入口；路由不存在时直接不渲染，避免指向 404 */
const identityActions = computed(() => {
  const actions = []
  if (memberPlansAvailable.value) {
    actions.push({
      label: memberStore.isMember ? '续费会员' : '开通会员',
      to: { name: 'MemberPlans' },
      variant: 'primary',
    })
  }
  if (router.hasRoute('MemberBenefits')) {
    actions.push({
      label: '权益详解',
      to: { name: 'MemberBenefits' },
      variant: 'secondary',
    })
  }
  return actions
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

/* 未登录 / 骨架 / 错误 —— 状态容器与文案层走共享分片 .u-mm-state（见 ui-kit-member.css §2） */
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
.member-section-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}

/* ① 身份卡：结构、三档外观与未拥有权益的灰度都封装在 VipCard / ec-business.css 里 */

/* ② 资产概览：卡面见 §7 的 .u-mm-asset-*；这里只留分片没建模的「查看明细」链接，
   它是页面自己的动作，不属于资产卡契约。待办提醒原来也在这里，现已独立成 §19 的行。 */
.member-asset-link {
  margin-top: auto;
  font-size: var(--fs-label);
  color: var(--accent);
}
/* 到期日是一串日期/状态文字，不是金额：分片的 -value 用 fs-h1 价签字形，
   这里降一档并回到正文字体，避免「尚未开通」被渲染成大字价格 */
.member-asset-date {
  font-family: var(--font-body);
  font-size: var(--fs-h3);
}

/* ③ 成长值进度：几何见 §8 的 .u-mm-growth-*；
   卡片留白由 .ui-card 统一给，轨道与填充全部走分片 */
.member-growth-link {
  font-size: var(--fs-label);
  color: var(--accent);
}
.member-growth-value {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
}

/* ④ 权益卡区：格子本体（列表 / 卡片 / 图标 / 名称 / 数值 / 下一档）见
   ui-kit-member.css §9，这里只留「区块标题 + 网格」的纵向节奏。 */
.member-benefits {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}

/* ⑤ 下一档预告：条目同样是 §9 的权益格，本节只剩标题行 / 引导语 / CTA 的堆叠 */
.member-next {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}
.member-next-title {
  margin: 0;
}
.member-next-sub {
  font-size: var(--fs-label);
  color: var(--text-muted);
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
