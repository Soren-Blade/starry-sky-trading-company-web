<template>
  <div class="page-shell page-shell--narrow member-plans-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">会员套餐</h1>
      <p class="page-shell-desc">开通会员即可享受消费折扣、积分加成与每月券包</p>
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
        <section v-if="currentLevelName" class="ui-card plans-current">
          <AppIcon name="star" />
          <span>
            你当前是 <strong>{{ currentLevelName }}</strong> 会员，
            同档位套餐可以继续购买，时长叠加不覆盖
          </span>
        </section>

        <section v-for="group in groups" :key="group.level" class="plans-group">
          <h2 class="plans-group-title">{{ group.name }}</h2>
          <div class="plans-grid">
            <article
              v-for="plan in group.plans"
              :key="plan.plan_id"
              class="ui-card plan-card"
              :class="{ 'is-current': plan.is_current }"
            >
              <header class="plan-head">
                <span class="plan-duration">{{ durationLabel(plan.duration_days) }}</span>
                <span v-if="plan.is_current" class="u-tag u-tag--accent">当前等级</span>
                <span v-else-if="plan.save_percent" class="u-tag u-tag--success">
                  比月付省 {{ plan.save_percent }}%
                </span>
              </header>

              <p class="plan-price">
                <span class="plan-price-symbol">¥</span>{{ plan.price }}
              </p>
              <p class="plan-per-day">日均 ¥{{ plan.price_per_day }}</p>

              <ul class="plan-facts">
                <li><AppIcon name="tag" /><span>消费 {{ discountLabel(plan.discount_rate) }}</span></li>
                <li><AppIcon name="sparkles" /><span>积分 ×{{ plan.points_multiplier }}</span></li>
                <li><AppIcon name="gift" /><span>赠送成长值 {{ plan.bonus_growth }}</span></li>
              </ul>

              <button
                type="button"
                class="u-btn-primary plan-cta"
                :disabled="submitting === plan.plan_id"
                @click="openPlan(plan)"
              >
                {{ submitting === plan.plan_id ? '提交中…' : '立即开通' }}
              </button>
            </article>
          </div>
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
 * 会员套餐（`/member/plans`）—— 阶段 P0
 *
 * 契约见后端 `docs/API.md` §4.2 与 `src/router/memberApi.js`。
 *
 * 四条纪律：
 *   1. **价格、日均价、折扣、积分倍率、赠送成长值全部用服务端给的数字**，
 *      前端只做「翻译」（0.95 → 95 折、30 → 月付），不做任何算术；
 *      `save_percent` 也不在前端重算 —— 它按**日均价**比，这里拿总价比会算出负数。
 *   2. **`is_current` 只用于标记，不禁用按钮**。契约注释写的是「禁止重复购买同级」，
 *      但服务端 `sstc.create_membership_order` 并不校验等级，且
 *      `member_plans.duration_days` 的表注释写明「续费时**叠加**到 expires_at，不覆盖」。
 *      照注释禁用同级会把续费直接堵死（V1 会员只能升级、无法续期），
 *      因此这里只打「当前等级」标记。**这是有意偏离注释的地方。**
 *   3. **开通走订单链路**（下单 → 联系客服结算 → 客服确认后生效，不新建支付通道）：
 *      这里只调 `createOrder`，不写任何本地乐观状态 —— 会员状态只会由服务端改变。
 *   4. **结算与退款说明一律用服务端下发的文案**，缺字段就整块不渲染。
 *
 * `is_current` 的语义要留意：它比较的是**等级**（`p.level = snapshot.level`），
 * 所以同等级的月/季/年三档会同时为 true。因此「当前等级」是套餐的属性，
 * 当前等级用 `find(p => p.is_current)` 反推即可，不需要再拉一次总览。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import api from '@/api/index'
import AppIcon from '@/components/AppIcon.vue'
import MemberLevelLadder from '@/components/MemberLevelLadder.vue'
import { discountLabel } from '@/constants/member.js'
import { useMemberStore } from '@/stores/member.js'
import { useUserStore } from '@/stores/user.js'
import { notify } from '@/hooks/useToast/index.js'

const memberStore = useMemberStore()
const userStore = useUserStore()
const router = useRouter()

/** 正在提交的 plan_id；同一时刻只允许一单在途 */
const submitting = ref('')

const planList = computed(() => memberStore.plans || [])
const levels = computed(() => memberStore.levels || [])

const currentLevel = computed(() => planList.value.find((plan) => plan.is_current)?.level || '')
const currentLevelName = computed(
  () => planList.value.find((plan) => plan.is_current)?.level_name || ''
)

/** 按等级分组；组内保持服务端顺序（`sort_order, duration_days`） */
const groups = computed(() => {
  const map = new Map()
  for (const plan of planList.value) {
    if (!map.has(plan.level)) {
      map.set(plan.level, {
        level: plan.level,
        name: plan.level_name || plan.level,
        plans: [],
      })
    }
    map.get(plan.level).plans.push(plan)
  }
  return [...map.values()]
})

const DURATION_LABELS = { 30: '月付', 90: '季付', 365: '年付' }

/** 时长只说人话，天数由服务端给；出现没见过的档位就退回「N 天」 */
function durationLabel(days) {
  return DURATION_LABELS[days] || `${days} 天`
}

/**
 * 开通 = 生成会员开通单，然后去订单详情看结算说明。
 * 金额由数据库按当前价重算，请求里不带价格（传了也不会被采信）。
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

/* 当前等级提示 */
.plans-current {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
  color: var(--accent);
}

/* 套餐分组 */
.plans-group-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: calc(var(--space-unit) * 2);
}

.plan-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 2.5);
  transition: border-color var(--transition-interactive);
}
.plan-card.is-current {
  border-color: var(--accent);
}

.plan-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-unit);
}
.plan-duration {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.plan-price {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  line-height: 1.1;
}
.plan-price-symbol {
  font-size: var(--fs-body);
  color: var(--text-muted);
}
.plan-per-day {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.plan-facts {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  margin: calc(var(--space-unit) * 0.5) 0 var(--space-unit);
  padding: 0;
  list-style: none;
  font-size: var(--fs-label);
}
.plan-facts li {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
}

.plan-cta {
  margin-top: auto;
  width: 100%;
}

/* 结算 / 退款说明的卡片小节标题 */
.plans-section-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
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
