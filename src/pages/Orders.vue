<template>
  <div class="page-shell orders-page">
    <header class="page-shell-head page-shell-head--row">
      <div>
        <p class="page-shell-eyebrow">{{ PAGES.orders.eyebrow }}</p>
        <h1 class="page-shell-title">{{ PAGES.orders.title }}</h1>
        <p class="page-shell-desc">{{ PAGES.orders.description }}</p>
      </div>
      <span class="u-tag u-tag--accent">{{ pagination.total }} 笔</span>
    </header>

    <!-- 状态筛选：胶囊页签，与收藏页同构 -->
    <div class="orders-tabs" role="tablist" aria-label="订单状态">
      <button
        v-for="tabItem in statusTabs"
        :key="tabItem.value"
        type="button"
        role="tab"
        class="orders-tab"
        :class="{ 'orders-tab--active': status === tabItem.value }"
        :aria-selected="status === tabItem.value"
        @click="changeStatus(tabItem.value)"
      >
        {{ tabItem.label }}
      </button>
    </div>

    <div v-if="loading" class="u-loading-block" role="status">
      <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
      <span>正在加载订单…</span>
    </div>

    <p v-else-if="error" class="page-note page-note--error" role="alert">{{ error }}</p>

    <div v-else-if="!orders.length" class="page-empty">
      <p class="page-empty-title">{{ TRADE.ordersEmpty }}</p>
      <p class="page-empty-hint">{{ TRADE.ordersEmptyHint }}</p>
      <div class="page-actions orders-empty-actions">
        <router-link to="/hot" class="u-btn-primary">去看热门推荐</router-link>
      </div>
    </div>

    <template v-else>
      <p class="page-note orders-notice">{{ paymentNotice }}</p>

      <ul class="orders-list">
        <li v-for="order in orders" :key="order.order_no" class="page-panel order-card">
          <header class="order-head">
            <div class="order-head-main">
              <p class="order-no">
                <span class="order-no-label">{{ TRADE.orderNo }}</span>
                <span class="order-no-value">{{ order.order_no }}</span>
              </p>
              <p class="order-time">{{ toDate(order.created_at) }}</p>
            </div>
            <span class="u-tag" :class="statusTagClass(order.status)">
              {{ order.status_text }}
            </span>
          </header>

          <!-- 商品缩略：最多 4 件，多出的用 +N 表达，避免长订单撑高卡片 -->
          <ul class="order-thumbs">
            <li v-for="item in order.items.slice(0, 4)" :key="item.product_title" class="order-thumb">
              <img v-if="item.product_image" :src="item.product_image" :alt="item.product_title" />
              <span v-else class="order-thumb-placeholder" aria-hidden="true">🛍️</span>
              <span class="order-thumb-qty" aria-hidden="true">×{{ item.quantity }}</span>
            </li>
            <li v-if="order.items.length > 4" class="order-thumb order-thumb--more">
              +{{ order.items.length - 4 }}
            </li>
          </ul>

          <p class="order-summary-text">
            {{ order.items.map((item) => item.product_title).join('、') || '—' }}
          </p>

          <footer class="order-foot">
            <p class="order-amount">
              <span class="order-amount-label">{{ TRADE.orderAmount }}</span>
              <span class="order-amount-value">{{ formatPrice(order.total_amount) }}</span>
            </p>

            <div class="page-actions order-actions">
              <router-link
                :to="`/user/orders/${order.order_no}`"
                class="u-btn-secondary"
              >
                {{ TRADE.orderDetail }}
              </router-link>
              <button
                v-if="order.status === 'pending'"
                type="button"
                class="u-btn-secondary"
                :disabled="busy.has(order.order_no)"
                @click="handleCancel(order)"
              >
                {{ TRADE.orderCancel }}
              </button>
              <button
                v-if="order.status === 'pending'"
                type="button"
                class="u-btn-primary"
                :disabled="busy.has(order.order_no)"
                @click="handleComplete(order)"
              >
                {{ TRADE.orderComplete }}
              </button>
            </div>
          </footer>
        </li>
      </ul>

      <!-- 分页：只有一页时不渲染，避免出现一个孤零零的「1」 -->
      <nav v-if="pagination.total_pages > 1" class="orders-pager" aria-label="订单分页">
        <button
          type="button"
          class="u-btn-secondary"
          :disabled="!pagination.has_prev || loading"
          @click="goPage(pagination.page - 1)"
        >
          上一页
        </button>
        <span class="orders-pager-info">
          {{ pagination.page }} / {{ pagination.total_pages }}
        </span>
        <button
          type="button"
          class="u-btn-secondary"
          :disabled="!pagination.has_next || loading"
          @click="goPage(pagination.page + 1)"
        >
          下一页
        </button>
      </nav>
    </template>
  </div>
</template>

<script setup>
/**
 * 订单管理
 *
 * 「取消」与「确认完成」都在**服务端**判定合法性（只有 pending 能取消/完成），
 * 前端只按状态决定按钮显示与否，不做业务判断 —— 两边各判一次迟早不一致。
 *
 * 失败时按状态码给不同处理：404 说明这笔订单已经不是当前账号的了（或已删除），
 * 此时刷新列表；409 说明状态变了（例如另一个标签页刚取消过），同样刷新。
 */
import { computed, onMounted, ref } from 'vue'
import api from '@/api/index'
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { useThemeStore } from '@/stores/theme'
import { formatUtils } from '@/utils/index.js'
import { PAGES, PRODUCT_GRID, TRADE } from '@/constants/index.js'

const themeStore = useThemeStore()

const orders = ref([])
const loading = ref(true)
const error = ref('')
const status = ref('all')
const paymentNotice = ref(PRODUCT_GRID.paymentNotice)
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
})

/** 正在请求中的订单号：禁用该卡片的按钮，避免连点 */
const busy = ref(new Set())

const statusTabs = computed(() => [
  { value: 'all', label: TRADE.orderFilterAll },
  { value: 'pending', label: '待处理' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
])

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))
const formatPrice = (value) => formatUtils.formatPrice(value, currency.value)

/** 状态徽标的语义色：与卡密、Apple ID 状态同族（success / warning / danger） */
const statusTagClass = (value) => {
  if (value === 'completed') return 'u-tag--success'
  if (value === 'cancelled') return 'u-tag--danger'
  return 'u-tag--warning'
}

const markBusy = (orderNo, on) => {
  const next = new Set(busy.value)
  if (on) next.add(orderNo)
  else next.delete(orderNo)
  busy.value = next
}

const fetchOrders = async (page = 1) => {
  loading.value = true
  error.value = ''
  try {
    const params = { page, limit: pagination.value.limit }
    if (status.value !== 'all') params.status = status.value

    const result = await api.getOrders(params)
    if (!result?.success) {
      error.value = result?.message || '加载订单失败'
      orders.value = []
      return
    }
    orders.value = result.data?.orders || []
    if (result.data?.pagination) pagination.value = result.data.pagination
    // 服务端会附带支付说明文案，前端直接展示，不各自编一套
    if (result.data?.payment_notice) paymentNotice.value = result.data.payment_notice
  } catch (err) {
    error.value = err?.message || '加载订单失败'
    orders.value = []
  } finally {
    loading.value = false
  }
}

const changeStatus = (value) => {
  if (status.value === value) return
  status.value = value
  fetchOrders(1)
}

const goPage = (page) => {
  if (page < 1) return
  fetchOrders(page)
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleCancel = async (order) => {
  if (busy.value.has(order.order_no)) return
  if (typeof window !== 'undefined' && !window.confirm(TRADE.orderCancelConfirm)) return

  markBusy(order.order_no, true)
  try {
    const result = await api.cancelOrder(order.order_no)
    if (result?.success) {
      notify.success(result.message || '订单已取消')
      await fetchOrders(pagination.value.page)
    } else {
      notify.error(result?.message || '取消失败')
    }
  } catch (err) {
    notify.error(err?.message || '取消失败')
    // 404/409 都说明本地这份列表已经过时
    if (err?.status === 404 || err?.status === 409) await fetchOrders(pagination.value.page)
  } finally {
    markBusy(order.order_no, false)
  }
}

const handleComplete = async (order) => {
  if (busy.value.has(order.order_no)) return
  if (typeof window !== 'undefined' && !window.confirm(TRADE.orderCompleteConfirm)) return

  markBusy(order.order_no, true)
  try {
    const result = await api.completeOrder(order.order_no)
    if (result?.success) {
      notify.success(result.message || '订单已完成')
      await fetchOrders(pagination.value.page)
    } else {
      notify.error(result?.message || '操作失败')
    }
  } catch (err) {
    notify.error(err?.message || '操作失败')
    if (err?.status === 404 || err?.status === 409) await fetchOrders(pagination.value.page)
  } finally {
    markBusy(order.order_no, false)
  }
}

onMounted(() => {
  fetchOrders(1)
})
</script>

<style scoped>
/*
 * 订单管理：状态页签 + 订单卡片列表 + 分页。
 * 卡片复用 .page-panel 外壳，只写订单特有的「订单号 / 缩略图 / 金额 / 动作」四段。
 */

.orders-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit));
  margin-bottom: var(--section-gap);
}

.orders-tab {
  display: inline-flex;
  align-items: center;
  height: var(--btn-height);
  padding: 0 calc(var(--btn-padding-x));
  font-size: var(--btn-font-size);
  font-family: inherit;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    background-color var(--transition-interactive),
    border-color var(--transition-interactive),
    color var(--transition-interactive);
}

.orders-tab:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.orders-tab--active {
  color: var(--text-on-accent);
  background: var(--accent);
  border-color: var(--accent);
}

.orders-notice {
  margin-bottom: calc(var(--space-unit) * 2);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.order-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding-bottom: calc(var(--space-unit) * 1.5);
  border-bottom: var(--stroke-width) solid var(--divider);
}

.order-no {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit));
  margin: 0;
}

.order-no-label {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.order-no-value {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.order-time {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.order-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit));
  margin: calc(var(--space-unit) * 1.5) 0;
  padding: 0;
  list-style: none;
}

.order-thumb {
  position: relative;
  display: grid;
  place-items: center;
  width: calc(var(--space-unit) * 7);
  height: calc(var(--space-unit) * 7);
  overflow: hidden;
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-media);
}

.order-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-thumb-placeholder {
  font-size: var(--fs-body);
}

/* 数量徽标：微型徽标圆角 + 强调底，与 ToolCard 的收藏数徽标同构 */
.order-thumb-qty {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 0 calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: 1.4;
  color: var(--text-on-accent);
  background: var(--accent);
  border-top-left-radius: var(--micro-badge-radius);
}

.order-thumb--more {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.order-summary-text {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 2);
  margin-top: calc(var(--space-unit) * 2);
  padding-top: calc(var(--space-unit) * 2);
  border-top: var(--stroke-width) solid var(--divider);
}

.order-amount {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit));
  margin: 0;
}

.order-amount-label {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.order-amount-value {
  font-family: var(--font-price);
  font-size: var(--fs-price);
  font-weight: var(--fw-price);
  color: var(--price-color);
  background: var(--price-bg);
}

.order-actions {
  margin-left: auto;
}

.orders-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 2);
  margin-top: var(--section-gap);
}

.orders-pager-info {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.orders-empty-actions {
  justify-content: center;
  margin-top: calc(var(--space-unit) * 2.5);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 767px) {
  .orders-tabs {
    margin-bottom: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .order-foot {
    flex-direction: column;
    align-items: flex-start;
  }

  .order-actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
