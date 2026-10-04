<template>
  <div class="page-shell order-detail-page">
    <div v-if="loading" class="u-loading-block" role="status">
      <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
      <span>正在加载订单…</span>
    </div>

    <div v-else-if="error" class="page-empty">
      <p class="page-empty-title">{{ error }}</p>
      <div class="page-actions order-fallback">
        <router-link to="/user/orders" class="u-btn-primary">
          {{ TRADE.orderBackToList }}
        </router-link>
      </div>
    </div>

    <template v-else-if="order">
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
          <span class="u-tag" :class="statusTagClass(order.status)">{{ order.status_text }}</span>
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
              <img v-if="item.product_image" :src="item.product_image" :alt="item.product_title" />
              <span v-else class="detail-thumb-placeholder" aria-hidden="true">🛍️</span>
            </router-link>
            <span v-else class="detail-thumb">
              <span class="detail-thumb-placeholder" aria-hidden="true">🛍️</span>
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
          <div class="detail-total-row detail-total-row--amount">
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
          <li v-if="order.status === 'pending'" class="timeline-item timeline-item--todo">
            <span class="timeline-dot" aria-hidden="true"></span>
            <span class="timeline-text">等待线下结算后确认完成</span>
          </li>
        </ol>
      </section>

      <div class="page-actions order-detail-actions">
        <router-link to="/user/orders" class="u-btn-secondary">
          {{ TRADE.orderBackToList }}
        </router-link>
        <button
          v-if="order.status === 'pending'"
          type="button"
          class="u-btn-secondary"
          :disabled="busy"
          @click="handleCancel"
        >
          {{ TRADE.orderCancel }}
        </button>
        <button
          v-if="order.status === 'pending'"
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
import { useRoute } from 'vue-router'
import api from '@/api/index'
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { useThemeStore } from '@/stores/theme'
import { copyText } from '@/utils/clipboard.js'
import { formatUtils } from '@/utils/index.js'
import { PAGES, PRODUCT_GRID, TRADE } from '@/constants/index.js'

const route = useRoute()
const themeStore = useThemeStore()

const order = ref(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const paymentNotice = ref(PRODUCT_GRID.paymentNotice)

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))
const formatPrice = (value) => formatUtils.formatPrice(value, currency.value)
const amount = computed(() => formatUtils.splitPrice(order.value?.total_amount, currency.value))

const statusTagClass = (value) => {
  if (value === 'completed') return 'u-tag--success'
  if (value === 'cancelled') return 'u-tag--danger'
  return 'u-tag--warning'
}

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
  } catch (err) {
    error.value = err?.status === 404 ? TRADE.orderNotFound : err?.message || TRADE.orderNotFound
    order.value = null
  } finally {
    loading.value = false
  }
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

onMounted(load)

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

.order-fallback {
  justify-content: center;
  margin-top: calc(var(--space-unit) * 2.5);
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
