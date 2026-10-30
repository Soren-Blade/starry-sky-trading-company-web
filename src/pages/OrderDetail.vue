<template>
  <div class="page-shell order-detail-page">
    <!-- 加载态与错误态也保留面包屑：否则订单不存在时用户没有回列表的路 -->
    <PageBreadcrumb :items="breadcrumbItems" />

    <div v-if="loading" class="u-loading-block" role="status">
      <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
      <span>正在加载订单…</span>
    </div>

    <!-- 订单不存在 / 拉取失败：按设计系统的败态模板呈现，而不是一句「失败」 -->
    <div v-else-if="error" class="ec-redeem-result ec-redeem-result--notfound order-result">
      <span class="ec-redeem-result__icon" aria-hidden="true">
        <AppIcon name="alert-triangle" />
      </span>
      <p class="ec-redeem-result__title">{{ error }}</p>
      <p class="ec-redeem-result__desc">
        订单可能已被删除，或链接里的订单号有误。可以回到订单列表再找一次。
      </p>
      <div class="ec-redeem-result__actions">
        <router-link to="/user/orders" class="ec-btn ec-btn--primary">
          {{ TRADE.orderBackToList }}
        </router-link>
        <router-link to="/hot" class="ec-btn ec-btn--outline">{{ TRADE.orderGoShopping }}</router-link>
      </div>
    </div>

    <template v-else-if="order">
      <!-- 下单成功后跳过来：用设计系统 Result 的 success 模板给一次明确回执 -->
      <div v-if="showCreated" class="ec-redeem-result ec-redeem-result--success order-result">
        <span class="ec-redeem-result__icon" aria-hidden="true">
          <AppIcon name="check-circle" />
        </span>
        <p class="ec-redeem-result__title">{{ TRADE.checkoutSuccess }}</p>
        <p class="ec-redeem-result__desc">
          订单号 {{ order.order_no }}，可在「我的订单」查看进度与卡密。
        </p>
        <div class="ec-redeem-result__actions">
          <router-link to="/user/orders" class="ec-btn ec-btn--outline">
            {{ TRADE.orderViewAll }}
          </router-link>
        </div>
      </div>

      <header class="page-shell-head page-shell-head--row">
        <div>
          <p class="page-shell-eyebrow">{{ PAGES.orderDetail.eyebrow }}</p>
          <h1 class="page-shell-title order-title">
            <span class="order-title-label">{{ TRADE.orderNo }}</span>
            <span class="order-title-value">{{ order.order_no }}</span>
          </h1>
          <p class="page-shell-desc">
            {{ TRADE.orderCreatedAt }} {{ toDate(order.created_at) }}
          </p>
        </div>

        <div class="order-head-side">
          <span class="u-tag" :class="statusTagClass(order.status)">
            {{ order.status_text || orderStatusLabel(order.status) }}
          </span>
          <button type="button" class="link-btn" @click="copyOrderNo">
            {{ TRADE.orderCopyNo }}
          </button>
        </div>
      </header>

      <p class="page-note order-notice">{{ paymentNotice }}</p>

      <!-- 商品明细 -->
      <section class="page-panel">
        <h2 class="page-panel-head">{{ TRADE.orderItems }}</h2>

        <ul class="detail-items">
          <li v-for="(item, index) in order.items" :key="index" class="detail-item">
            <router-link
              v-if="item.product_id"
              :to="`/product/${item.product_id}`"
              class="detail-thumb"
              :aria-label="`查看 ${item.product_title}`"
            >
              <SmartImage
                v-if="item.product_image"
                :src="item.product_image"
                :alt="item.product_title"
                fallback-icon="shopping-bag"
                fallback-class="detail-thumb-placeholder"
              />
              <span v-else class="detail-thumb-placeholder" aria-hidden="true">
                <AppIcon name="shopping-bag" />
              </span>
            </router-link>
            <span v-else class="detail-thumb">
              <span class="detail-thumb-placeholder" aria-hidden="true">
                <AppIcon name="shopping-bag" />
              </span>
            </span>

            <div class="detail-main">
              <component
                :is="item.product_id ? 'router-link' : 'span'"
                :to="item.product_id ? `/product/${item.product_id}` : undefined"
                class="detail-title"
              >
                {{ item.product_title }}
              </component>
              <p class="detail-unit">
                {{ formatPrice(item.unit_price) }} × {{ item.quantity }}
              </p>
            </div>

            <p class="detail-subtotal">{{ formatPrice(item.subtotal) }}</p>
          </li>
        </ul>

        <dl class="detail-totals">
          <div class="detail-total-row">
            <dt>商品件数</dt>
            <dd>{{ order.item_count }}</dd>
          </div>

          <!-- 有优惠时展开：原价 / 优惠券 / 积分 / 实付，与服务端落库的六列同源 -->
          <template v-if="hasSettlement">
            <div
              v-for="row in settlement"
              :key="row.key"
              class="detail-total-row"
              :class="{ 'detail-total-row--amount': row.kind === 'total' }"
            >
              <dt>{{ row.label }}</dt>
              <dd>
                <span v-if="row.kind === 'total'" class="u-price detail-amount">
                  <span>{{ settlementTotal.prefix }}{{ settlementTotal.integer }}</span>
                  <span v-if="settlementTotal.decimals" class="u-price-decimals">.{{ settlementTotal.decimals }}</span>
                </span>
                <span v-else-if="row.kind === 'discount'">− {{ formatPrice(row.amount) }}</span>
                <span v-else>{{ formatPrice(row.amount) }}</span>
              </dd>
            </div>
          </template>

          <div v-else class="detail-total-row detail-total-row--amount">
            <dt>{{ TRADE.orderAmount }}</dt>
            <dd>
              <span class="u-price detail-amount">
                <span>{{ amount.prefix }}{{ amount.integer }}</span>
                <span v-if="amount.decimals" class="u-price-decimals">.{{ amount.decimals }}</span>
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- 备注与联系信息：下单时填过才显示，空字段不占位 -->
      <section v-if="order.contact || order.remark" class="page-panel">
        <h2 class="page-panel-head">联系与备注</h2>
        <dl class="detail-meta">
          <div v-if="order.contact" class="detail-meta-row">
            <dt>{{ TRADE.checkoutContact }}</dt>
            <dd>{{ order.contact }}</dd>
          </div>
          <div v-if="order.remark" class="detail-meta-row">
            <dt>{{ TRADE.checkoutRemark }}</dt>
            <dd>{{ order.remark }}</dd>
          </div>
        </dl>
      </section>

      <!-- 在线支付：仅待付款且服务端已配置支付通道时出现（未配置时保留线下结算流程） -->
      <section v-if="order.status === 'pending' && payEnabled" class="page-panel">
        <h2 class="page-panel-head">在线支付</h2>
        <PaymentPanel
          :order-no="order.order_no"
          :amount-fen="amountFen"
          :amount-yuan="payableAmount"
          :pay-methods="payMethods"
          @paid="handlePaid"
        />
      </section>

      <!-- 状态时间线：只列出已经发生过的节点 -->
      <section class="page-panel">
        <h2 class="page-panel-head">状态流转</h2>
        <ol class="timeline">
          <li class="timeline-item timeline-item--done">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-text">下单 {{ toDate(order.created_at) }}</span>
          </li>
          <li v-if="order.completed_at" class="timeline-item timeline-item--done">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-text">已完成 {{ toDate(order.completed_at) }}</span>
          </li>
          <li v-if="order.cancelled_at" class="timeline-item timeline-item--cancelled">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-text">已取消 {{ toDate(order.cancelled_at) }}</span>
          </li>
          <li v-if="order.paid_at" class="timeline-item timeline-item--done">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-text">已支付 {{ toDate(order.paid_at) }}</span>
          </li>
          <li v-if="order.refunded_at" class="timeline-item timeline-item--cancelled">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-text">已退款 {{ toDate(order.refunded_at) }}</span>
          </li>
          <li v-if="pendingTodoNote" class="timeline-item timeline-item--todo">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-text">{{ pendingTodoNote }}</span>
          </li>
        </ol>
      </section>

      <div class="page-actions order-detail-actions">
        <router-link to="/user/orders" class="u-btn-secondary">
          {{ TRADE.orderBackToList }}
        </router-link>
        <button
          v-if="canCancel(order.status)"
          type="button"
          class="u-btn-secondary"
          :disabled="busy"
          @click="handleCancel"
        >
          {{ TRADE.orderCancel }}
        </button>
        <button
          v-if="canConfirmComplete(order.status, payEnabled)"
          type="button"
          class="u-btn-primary"
          :disabled="busy"
          :aria-busy="busy"
          @click="handleComplete"
        >
          <span v-if="busy" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
          <span>{{ TRADE.orderComplete }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * 订单详情
 *
 * 订单号来自路由参数，服务端按「订单号 + 当前用户」查询 ——
 * 别人的订单一律查不到（返回 404），因此前端不需要再做一次归属判断。
 *
 * 明细里的 `product_title` / `unit_price` 是**下单当时的快照**，
 * 商品后来改名或调价都不会改变这里显示的内容，这也是订单页能作为凭证的原因。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/index'
import AppIcon from '@/components/AppIcon.vue'
import PageBreadcrumb from '@/components/PageBreadcrumb.vue'
import PaymentPanel from '@/components/PaymentPanel.vue'
import SmartImage from '@/components/SmartImage.vue'
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { useThemeStore } from '@/stores/theme'
import { copyText } from '@/utils/clipboard.js'
import { settlementRows } from '@/utils/checkout.js'
import { formatUtils } from '@/utils/index.js'
import { PAGES, PRODUCT_GRID, TRADE } from '@/constants/index.js'
import {
  orderStatusLabel,
  orderStatusTagClass,
  canCancel,
  canConfirmComplete,
} from '@/constants/order.js'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()

/** 面包屑：订单详情是「首页 → 我的订单」下的三级页，两段父级都可点回去 */
const breadcrumbItems = [
  { label: '首页', to: '/home' },
  { label: '我的订单', to: '/user/orders' },
  { label: TRADE.orderDetail },
]

const order = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const paymentNotice = ref(PRODUCT_GRID.paymentNotice)
/** 服务端是否已配置支付通道；未配置时详情页不出现支付面板，按钮回到线下结算的老流程 */
const payEnabled = ref(false)
/** 支持的支付方式，由服务端下发（未配置时为空数组） */
const payMethods = ref([])

/**
 * 是否展示「下单成功」结果块。
 *
 * 用入口 query 的 created=1 判断，但**只认一次**：挂载后立刻把 query 抹掉，
 * 刷新页面不会再弹一遍成功回执（结果块本身由这个 ref 控制，抹 query 不会让它消失）。
 */
const showCreated = ref(route.query.created === '1')

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))
const formatPrice = (value) => formatUtils.formatPrice(value, currency.value)
const amount = computed(() => formatUtils.splitPrice(order.value?.total_amount, currency.value))

/**
 * 金额明细（1.5.0 / M2 落库的六列）。
 *
 * 有优惠才展开：没有优惠时「商品原价 89 / 实付 89」只是把同一个数字写两遍，
 * 保持原来那一行「订单金额」更干净。
 */
const settlement = computed(() => settlementRows(order.value, { totalLabel: '实付' }))
const hasSettlement = computed(() => settlement.value.length > 2)
const settlementTotal = computed(() =>
  formatUtils.splitPrice(order.value?.payable_amount ?? order.value?.total_amount, currency.value)
)

const statusTagClass = (value) => orderStatusTagClass(value)

/** 支付金额（整数分）与展示金额：两者都取实付口径 payable_amount ?? total_amount */
const payableAmount = computed(() => {
  const value = order.value?.payable_amount ?? order.value?.total_amount
  return value === null || value === undefined ? null : Number(value)
})
const amountFen = computed(() =>
  payableAmount.value === null ? 0 : Math.round(payableAmount.value * 100)
)

/**
 * 时间线最后一条待办文案。
 *
 * 未配置支付通道时保持原来的线下结算话术；配置后「待付款」与「已付款待交付」是
 * 两个不同动作，分别说清下一步该做什么。
 */
const pendingTodoNote = computed(() => {
  const status = order.value?.status
  if (status === 'pending') {
    return payEnabled.value
      ? '等待付款：下单后 24 小时内未支付将自动关闭'
      : '等待线下结算后确认完成'
  }
  if (status === 'paid') return '等待交付，收到商品后点「确认完成」'
  return ''
})

const orderNo = computed(() => String(route.params.orderNo || '').trim())

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await api.getOrder(orderNo.value)
    if (!result?.success || !result.data?.order) {
      error.value = result?.message || TRADE.orderNotFound
      order.value = null
      return
    }
    order.value = result.data.order
    if (result.data.payment_notice) paymentNotice.value = result.data.payment_notice
    payEnabled.value = result.data?.pay_enabled === true
    payMethods.value = Array.isArray(result.data?.pay_methods) ? result.data.pay_methods : []
  } catch (err) {
    error.value = err?.status === 404 ? TRADE.orderNotFound : err?.message || TRADE.orderNotFound
    order.value = null
  } finally {
    loading.value = false
  }
}

/** 支付面板轮询到已付款：重新拉订单，让徽标/时间线/按钮一起进入新状态 */
const handlePaid = async () => {
  notify.success('支付成功，订单已进入待交付状态')
  await load()
}

const copyOrderNo = async () => {
  const result = await copyText(orderNo.value)
  if (result.ok) notify.success(TRADE.orderCopied)
  else notify.error(result.message)
}

const handleCancel = async () => {
  if (busy.value) return
  if (typeof window !== 'undefined' && !window.confirm(TRADE.orderCancelConfirm)) return

  busy.value = true
  try {
    const result = await api.cancelOrder(orderNo.value)
    if (result?.success) {
      notify.success(result.message || '订单已取消')
      if (result.data?.order) order.value = result.data.order
      else await load()
    } else {
      notify.error(result?.message || '取消失败')
    }
  } catch (err) {
    notify.error(err?.message || '取消失败')
    await load()
  } finally {
    busy.value = false
  }
}

const handleComplete = async () => {
  if (busy.value) return
  if (typeof window !== 'undefined' && !window.confirm(TRADE.orderCompleteConfirm)) return

  busy.value = true
  try {
    const result = await api.completeOrder(orderNo.value)
    if (result?.success) {
      notify.success(result.message || '订单已完成')
      if (result.data?.order) order.value = result.data.order
      else await load()
    } else {
      notify.error(result?.message || '操作失败')
    }
  } catch (err) {
    notify.error(err?.message || '操作失败')
    await load()
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  // 成功回执只消费一次：把 created 从地址栏去掉，刷新不会重复弹出
  if (showCreated.value) {
    router.replace({ path: route.path, query: { ...route.query, created: undefined } })
  }
  load()
})

// 订单列表里点开另一笔订单时组件被复用，必须重新拉取
watch(orderNo, (value) => {
  if (value) load()
})
</script>

<style scoped>
/*
 * 订单详情：标题带 + 三个面板（明细 / 联系备注 / 状态时间线）+ 动作行。
 */

.order-title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
}

.order-title-label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  color: var(--text-muted);
}

.order-title-value {
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  letter-spacing: normal;
  text-transform: none;
}

.order-head-side {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  flex-shrink: 0;
}

.link-btn {
  padding: 0;
  font-size: var(--fs-sm);
  font-family: inherit;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-interactive);
}

.link-btn:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

.order-notice {
  margin-bottom: calc(var(--space-unit) * 2.5);
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.detail-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
}

.detail-thumb {
  display: grid;
  place-items: center;
  width: calc(var(--space-unit) * 8);
  height: calc(var(--space-unit) * 8);
  overflow: hidden;
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-media);
}

.detail-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-thumb-placeholder {
  font-size: var(--fs-body);
}

.detail-main {
  min-width: 0;
}

.detail-title {
  display: block;
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-interactive);
}

a.detail-title:hover {
  color: var(--accent);
}

.detail-unit {
  margin: calc(var(--space-unit) * 0.25) 0 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.detail-subtotal {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.detail-totals {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.25);
  margin: calc(var(--space-unit) * 2.5) 0 0;
  padding-top: calc(var(--space-unit) * 2);
  border-top: var(--stroke-width) solid var(--divider);
}

.detail-total-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.detail-total-row dd {
  margin: 0;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.detail-amount {
  font-size: var(--fs-price);
  font-weight: var(--fw-price);
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
}

.detail-meta-row {
  display: grid;
  grid-template-columns: calc(var(--space-unit) * 11) minmax(0, 1fr);
  gap: calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
}

.detail-meta-row dt {
  color: var(--text-muted);
}

.detail-meta-row dd {
  margin: 0;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

/* 时间线：一条竖向发丝线 + 节点圆点，只列出已发生的节点 */
.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0 0 0 calc(var(--space-unit) * 2.5);
  list-style: none;
}

.timeline::before {
  content: '';
  position: absolute;
  top: calc(var(--space-unit) * 0.75);
  bottom: calc(var(--space-unit) * 0.75);
  left: calc(var(--space-unit) * 0.25);
  width: var(--stroke-width);
  background: var(--divider);
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.timeline-dot {
  position: absolute;
  left: calc(var(--space-unit) * -2.5);
  width: calc(var(--space-unit));
  height: calc(var(--space-unit));
  background: var(--text-muted);
  border-radius: var(--radius-pill);
}

.timeline-item--done .timeline-dot {
  background: var(--success);
}

.timeline-item--cancelled .timeline-dot {
  background: var(--danger);
}

.timeline-item--todo {
  color: var(--text-muted);
}

.order-detail-actions {
  margin-top: var(--section-gap);
}

/* 结果块（下单成功 / 订单不存在）：模板样式来自 .ec-redeem-result，这里只补页面间距 */
.order-result {
  margin-block: var(--ec-space-6);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 767px) {
  .order-title-value {
    font-size: calc(var(--fs-h3));
  }

  .order-detail-actions {
    margin-top: calc(var(--section-gap) * var(--mobile-section-scale));
  }
}

@media (max-width: 575px) {
  .detail-meta-row {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--space-unit) * 0.25);
  }
}
</style>
