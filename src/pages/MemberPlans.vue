<template>
  <div class="page-shell page-shell--narrow member-plans-page">
    <PageBreadcrumb :items="breadcrumbItems" />

    <header class="page-shell-head">
      <h1 class="page-shell-title">开通会员</h1>
      <p class="page-shell-desc">
        一次性 {{ activationPrice }} 元开通会员，永久有效；等级不售卖，由成长值决定（v1–v8）
      </p>
    </header>

    <!-- 未登录：守卫会打开登录弹窗并回跳，但直达本页时仍要有落点 -->
    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="star" class="u-mm-state-icon" />
      <p class="u-mm-state-title">请先登录账号</p>
      <p class="u-mm-state-desc">登录后即可查看套餐并开通会员</p>
      <div class="u-mm-state-actions">
        <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可开通会员')">
          立即登录
        </button>
      </div>
    </div>

    <template v-else>
      <div v-if="memberStore.loadingPlans && !planList.length" class="ui-card plans-skeleton">
        <span class="u-skeleton plans-skeleton-line plans-skeleton-line--lg"></span>
        <span class="u-skeleton plans-skeleton-line"></span>
      </div>

      <!-- 出错与「没有套餐」分开：加载失败不该显示成「暂无可开通套餐」 -->
      <div v-else-if="memberStore.error && !planList.length" class="ui-card u-mm-state u-mm-state--error" role="alert">
        <AppIcon name="alert-triangle" class="u-mm-state-icon" />
        <p class="u-mm-state-title">{{ memberStore.error }}</p>
        <div class="u-mm-state-actions">
          <button type="button" class="u-btn-secondary" @click="memberStore.fetchPlans()">重试</button>
        </div>
      </div>

      <div v-else-if="!planList.length" class="ui-card u-mm-state">
        <AppIcon name="info" class="u-mm-state-icon" />
        <p class="u-mm-state-title">暂时没有可开通的套餐</p>
        <p class="u-mm-state-desc">请稍后再来，新套餐上架后会出现在这里</p>
      </div>

      <template v-else>
        <!-- 当前身份卡：等级来自 get_member_plans 的 is_current，成长/到期取已有概览（若有） -->
        <VipCard
          v-if="currentLevelName"
          :level="currentLevel"
          :name="currentLevelName"
          :expire-at="identityExpireAt"
          :expire-hint="identityExpireHint"
          :growth="overview.growth ?? 0"
          :growth-max="identityGrowthMax"
          :growth-hint="identityGrowthHint"
          :actions="identityActions"
          note="会员资格一次开通永久有效；等级随成长值增长，不会因为不消费而降级"
        />

        <!-- 会员开卡资格：全站唯一的可购买项。等级不售卖，只能花 10 元开卡后靠成长值升 -->
        <section v-if="activationPlan" class="plans-group plans-group--activation">
          <h2 class="plans-group-title">会员开卡资格</h2>
          <!-- 卡外观沿用分片 §12 的 .u-mm-plan；整页只有一张，用页面级网格给它一个固定列宽 -->
          <div class="plans-activation-grid">
            <article class="u-mm-plan" :class="{ 'is-current': isPermanent }">
              <header class="u-mm-plan-head">
                <span class="u-mm-plan-duration">一次开通</span>
                <span class="u-tag u-tag--success">永久有效</span>
                <span v-if="isPermanent" class="u-tag u-tag--accent">已开通</span>
              </header>

              <p class="u-mm-plan-price">¥{{ activationPlan.price }}</p>
              <p class="u-mm-plan-perday">一次付费，不按天计费、不自动续费</p>

              <ul class="u-mm-plan-facts">
                <li class="plan-fact"><AppIcon name="star" /><span>等级不售卖，由成长值决定（v1–v8）</span></li>
                <li class="plan-fact"><AppIcon name="wrench" /><span>免卡密激活额度随等级提高</span></li>
                <li class="plan-fact"><AppIcon name="tag" /><span>消费折扣与积分倍率随等级生效</span></li>
              </ul>

              <button
                v-if="!isPermanent"
                type="button"
                class="u-btn-primary u-mm-plan-cta"
                :disabled="submitting === activationPlan.plan_id"
                @click="openPlan(activationPlan)"
              >
                {{ submitting === activationPlan.plan_id ? '提交中…' : `开通会员（¥${activationPlan.price}）` }}
              </button>
              <p v-else class="u-mm-plan-own">你已经是永久会员，无需重复开通</p>
            </article>
          </div>
        </section>

        <!-- 成长值来源：这两条是数据库里真实存在的记账入口（order_growth_reward / card_growth_reward），
             不是营销话术，改口径要同时改库函数，所以只做说明不做计算 -->
        <section class="ui-card plans-growth-sources">
          <h2 class="plans-section-title">成长值怎么涨</h2>
          <ul class="growth-source-list">
            <li class="growth-source">
              <AppIcon name="shopping-bag" />
              <span>购买商品：订单完成后按实付金额累计成长值</span>
            </li>
            <li class="growth-source">
              <AppIcon name="key" />
              <span>兑换卡密：卡密激活成功后按面值累计成长值</span>
            </li>
          </ul>
          <p class="plans-notice-text">
            成长值只增不减，达到下一档门槛自动升级；等级决定消费折扣、积分倍率与免卡密激活额度。
          </p>
        </section>

        <!-- 等级阶梯与成长值页共用一张表（`MemberLevelLadder`）：
             门槛/折扣/倍率都由服务端 `get_member_plans` 的 `levels[]` 下发 -->
        <MemberLevelLadder :levels="levels" :current-level="currentLevel" />

        <!-- 结算与退款口径由服务端下发（`payment_notice` / `refund_notice`），
             没有就不渲染那一块 —— 前端不自己编一套说法 -->
        <section v-if="memberStore.paymentNotice || memberStore.refundNotice" class="plans-notices">
          <div v-if="memberStore.paymentNotice" class="ui-card plans-notice">
            <h2 class="plans-section-title">结算方式</h2>
            <p class="plans-notice-text">{{ memberStore.paymentNotice }}</p>
          </div>
          <div v-if="memberStore.refundNotice" class="ui-card plans-notice">
            <h2 class="plans-section-title">退款说明</h2>
            <p class="plans-notice-text">{{ memberStore.refundNotice }}</p>
          </div>
        </section>

        <p v-if="router.hasRoute('Member')" class="plans-foot">
          <router-link :to="{ name: 'Member' }" class="u-btn-secondary">返回会员中心</router-link>
        </p>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 会员开通（`/member/plans`）—— 2.4.0 会员模型重构后的形态（P0）
 *
 * 契约见后端 `docs/API.md` §4.2 与 `src/router/memberApi.js`。
 *
 * 2026-10-28 起会员只有一件事可以买：**10 元开卡资格，一次开通永久有效**。
 * 等级（v1–v8）不再售卖，只由成长值决定 —— 购买商品（`order_growth_reward`）
 * 与兑换卡密（`card_growth_reward`）是唯一的两个成长值入口。
 *
 * 四条纪律：
 *   1. **价格只用服务端给的数字**。页头的「{{ 元 }}」取 `plans[].price`，
 *      接口没回来时按 10.00 占位；真实金额由数据库在开单时重算，请求里不带价格。
 *   2. **等级一律取「概览」而不是套餐**。`plans[].is_current` 只描述「这一档
 *      能不能买」，而开卡资格固定是 `v1` —— 拿它当当前等级会把 v3 会员显示成 V1。
 *   3. **开通走订单链路**（下单 → 联系客服结算 → 客服确认后生效，不新建支付通道）：
 *      只调 `createOrder`，不写本地乐观状态 —— 会员状态只会由服务端改变。
 *   4. **结算与退款说明一律用服务端下发的文案**，缺字段就整块不渲染。
 *
 * 已是永久会员时数据库会直接拒单（「你已经是永久会员，无需重复开通」），
 * 前端把按钮换成静态文案，避免让用户白点一次。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import api from '@/api/index'
import AppIcon from '@/components/AppIcon.vue'
import MemberLevelLadder from '@/components/MemberLevelLadder.vue'
import PageBreadcrumb from '@/components/PageBreadcrumb.vue'
import VipCard from '@/components/VipCard.vue'
import { useMemberStore } from '@/stores/member.js'
import { useUserStore } from '@/stores/user.js'
import { notify } from '@/hooks/useToast/index.js'

const memberStore = useMemberStore()
const userStore = useUserStore()
const router = useRouter()

/** 面包屑：会员开通是会员中心下的二级页 */
const breadcrumbItems = [
  { label: '首页', to: '/home' },
  { label: '会员中心', to: '/member' },
  { label: '开通会员' },
]

/** 正在提交的 plan_id；同一时刻只允许一单在途 */
const submitting = ref('')

const planList = computed(() => memberStore.plans || [])
const levels = computed(() => memberStore.levels || [])

/**
 * 身份卡的数据一律取「概览」而不是套餐列表：
 * 2.3.0 起等级由成长值决定，`plans[].is_current` 只描述「这一档能不能买」，
 * 而开卡资格永远是 `v1`，拿它当当前等级会把 v3 会员显示成 V1。
 */
const overview = computed(() => memberStore.overview || {})

const currentLevel = computed(() => overview.value.level || '')
const currentLevelName = computed(() => overview.value.level_name || '')

/** 永久会员：`expires_at` 为 null、快照给 `is_permanent` */
const isPermanent = computed(() => overview.value.is_permanent === true)

/** 开卡资格是唯一可购买项；`kind==='activation'` 由 `get_member_plans` 下发 */
const activationPlan = computed(
  () =>
    planList.value.find((plan) => plan.kind === 'activation') ||
    planList.value.find((plan) => Number(plan.duration_days) === 0) ||
    null
)

/** 页头文案用；接口没回来时先按 10 元占位（真实金额由数据库在开单时重算） */
const activationPrice = computed(() => activationPlan.value?.price || '10.00')

const identityExpireAt = computed(() =>
  isPermanent.value ? '永久有效' : overview.value.expires_at || ''
)

const identityExpireHint = computed(() => {
  if (isPermanent.value) return '无需续费'
  return overview.value.days_left == null ? '' : `剩余 ${overview.value.days_left} 天`
})

const identityGrowthMax = computed(() => {
  const growth = Number(overview.value.growth) || 0
  if (overview.value.next_level == null) return growth
  return growth + (Number(overview.value.growth_to_next) || 0)
})

const identityGrowthHint = computed(() => {
  const o = overview.value
  if (!memberStore.overview) return ''
  if (o.next_level == null || o.growth_to_next == null) return '已达最高等级'
  return `距 ${o.next_level_name || o.next_level}还差 ${o.growth_to_next}`
})

const identityActions = computed(() =>
  router.hasRoute('MemberBenefits')
    ? [{ label: '权益详解', to: { name: 'MemberBenefits' }, variant: 'secondary' }]
    : []
)

/**
 * 开通 = 生成会员开通单，然后去订单详情看结算说明。
 * 金额由数据库按当前价重算，请求里不带价格（传了也不会被采信）。
 * 已是永久会员时数据库会直接拒单（`你已经是永久会员，无需重复开通`），
 * 前端这里也把按钮换成静态文案，避免让用户白点一次。
 */
async function openPlan(plan) {
  if (submitting.value) return

  submitting.value = plan.plan_id
  try {
    const result = await api.createOrder({
      order_type: 'membership',
      ref_plan_id: plan.plan_id,
    })

    if (!result?.success) {
      notify.error(result?.message || '开通失败，请稍后重试')
      return
    }

    const orderNo = result.data?.order?.order_no
    // 结算口径（`payment_notice`）在订单详情页整块展示，这里只报「单已生成」，
    // 避免把一整句说明塞进 3 秒的浮层
    notify.success('开通单已生成，请联系客服完成结算')

    if (orderNo) router.push({ name: 'OrderDetail', params: { orderNo } })
    else router.push({ name: 'Orders' })
  } catch (error) {
    notify.error(error?.message || '开通失败，请稍后重试')
  } finally {
    submitting.value = ''
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) return
  memberStore.fetchPlans()
})
</script>

<style scoped>
.member-plans-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录引导 —— 容器与文案层走共享分片 .u-mm-state（见 ui-kit-member.css §2） */

/* 骨架 / 错误 / 空态 */
.plans-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 3);
}
.plans-skeleton-line {
  height: calc(var(--space-unit) * 2);
  border-radius: var(--radius-media);
}
.plans-skeleton-line--lg {
  height: calc(var(--space-unit) * 6);
}

/* 出错 / 无套餐 —— 走共享分片 .u-mm-state（见 ui-kit-member.css §2） */

/* 当前身份卡改用 VipCard（外观见 ec-business.css 的 .ec-vip） */

/* 套餐分组：组的标题属于页面；卡片网格与卡内四段见分片 §12 */
.plans-group-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}

/* 分片只定义事实列表的容器（列、分隔线、字号），
   每行「图标 + 文字」的横排是页面自己的排版 */
.plan-fact {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
}

/* 结算 / 退款说明的卡片小节标题 */
.plans-section-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}

/* 开卡卡：整页只有一张，用网格给它一个固定列宽（页族宽度契约禁止页面自设 max-width） */
.plans-activation-grid {
  display: grid;
  grid-template-columns: minmax(0, 480px);
}

/* 已永久会员：把按钮位换成静态文案，保持卡片高度与有按钮时一致 */
.u-mm-plan-own {
  margin: 0;
  padding: calc(var(--space-unit) * 1.25) 0;
  color: var(--accent);
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  text-align: center;
}

/* 成长值来源：两条事实 + 一句口径说明。
   这几行不做数字计算（口径在库函数 order_growth_reward / card_growth_reward 里），
   所以只用页面级排版，不引入新的分片类。 */
.plans-growth-sources {
  padding: calc(var(--space-unit) * 3);
}
.growth-source-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0 0 calc(var(--space-unit) * 2);
  padding: 0;
  list-style: none;
}
.growth-source {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
  color: var(--text-primary);
  font-size: var(--fs-sm);
}

/* 结算 / 退款说明 */
.plans-notices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: calc(var(--space-unit) * 2);
}
.plans-notice {
  padding: calc(var(--space-unit) * 2.5);
}
.plans-notice-text {
  margin: 0;
  color: var(--text-muted);
}

.plans-foot {
  display: flex;
  justify-content: center;
  margin: 0;
}
</style>
