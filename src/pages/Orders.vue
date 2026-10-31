<template>
  <div class="page-shell orders-page">
    <PageBreadcrumb :items="breadcrumbItems" />

    <header class="page-shell-head page-shell-head--row">
      <div>
        <p class="page-shell-eyebrow">{{ PAGES.orders.eyebrow }}</p>
        <h1 class="page-shell-title">{{ PAGES.orders.title }}</h1>
        <p class="page-shell-desc">{{ PAGES.orders.description }}</p>
      </div>
      <span class="u-tag u-tag--accent">{{ pagination.total }} 笔</span>
    </header>

    <!-- 状态筛选：胶囊页签，与收藏页同构；右侧固定一个搜索框（订单号或商品名） -->
    <div class="orders-toolbar">
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

      <div class="orders-search">
        <SearchBar
          v-model="keywordInput"
          label="搜索订单号或商品名"
          placeholder="搜索订单号或商品名"
          :show-submit="false"
        />
      </div>
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
      <AppAlert variant="info" class="orders-notice" :body="paymentNotice" />

      <!-- 订单管「交易过程」，资产管「买到了什么」；两者分工不同所以都在，
           这里只做一次指路，避免用户以为数字商品丢了。 -->
      <p class="orders-assets-link">
        数字商品与卡密已汇总到
        <router-link to="/user/assets">我的资产</router-link>
        ，实物商品的物流信息仍在本页订单里。
      </p>

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
              {{ order.status_text || orderStatusLabel(order.status) }}
            </span>
          </header>

          <!-- 商品缩略：最多 4 件，多出的用 +N 表达，避免长订单撑高卡片 -->
          <ul class="order-thumbs">
            <li v-for="item in order.items.slice(0, 4)" :key="item.product_title" class="order-thumb">
              <SmartImage
                v-if="item.product_image"
                :src="item.product_image"
                :alt="item.product_title"
                fallback-icon="shopping-bag"
                fallback-class="order-thumb-placeholder"
              />
              <span v-else class="order-thumb-placeholder" aria-hidden="true">
                <AppIcon name="shopping-bag" />
              </span>
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
              <router-link
                v-if="canPay(order.status) && payEnabled"
                :to="`/user/orders/${order.order_no}`"
                class="u-btn-primary"
              >
                去支付
              </router-link>
              <button
                v-if="canCancel(order.status)"
                type="button"
                class="u-btn-secondary"
                :disabled="busy.has(order.order_no)"
                :aria-busy="busy.has(order.order_no)"
                @click="handleCancel(order)"
              >
                <!-- 只有 disabled 的按钮看起来和「没点上」几乎一样，用户会连点：
                     必须同时给出转圈与文案变化 -->
                <span
                  v-if="busy.has(order.order_no)"
                  class="u-spinner u-spinner--sm"
                  aria-hidden="true"
                ></span>
                <span>{{ busy.has(order.order_no) ? TRADE.orderProcessing : TRADE.orderCancel }}</span>
              </button>
              <button
                v-if="canConfirmComplete(order.status, payEnabled)"
                type="button"
                class="u-btn-primary"
                :disabled="busy.has(order.order_no)"
                :aria-busy="busy.has(order.order_no)"
                @click="handleComplete(order)"
              >
                <span
                  v-if="busy.has(order.order_no)"
                  class="u-spinner u-spinner--sm"
                  aria-hidden="true"
                ></span>
                <span>{{ busy.has(order.order_no) ? TRADE.orderProcessing : TRADE.orderComplete }}</span>
              </button>
            </div>
          </footer>
        </li>
      </ul>

      <!-- 分页：只有一页时不渲染，避免出现一个孤零零的「1」。
           版式统一走共享的 .u-mm-pager（左信息 / 右按钮 + 顶部分隔线），
           与邮件、优惠券、积分等页的分页同一套观感。 -->
      <nav v-if="pagination.total_pages > 1" class="u-mm-pager" aria-label="订单分页">
        <span class="u-mm-pager-info">
          {{ pagination.page }} / {{ pagination.total_pages }}
        </span>
        <div class="u-mm-pager-btns">
          <button
            type="button"
            class="u-btn-secondary"
            :disabled="!pagination.has_prev || loading"
            @click="goPage(pagination.page - 1)"
          >
            上一页
          </button>
          <button
            type="button"
            class="u-btn-secondary"
            :disabled="!pagination.has_next || loading"
            @click="goPage(pagination.page + 1)"
          >
            下一页
          </button>
        </div>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/index'
import payment from '@/api/ask/payment'
import AppIcon from '@/components/AppIcon.vue'
import SmartImage from '@/components/SmartImage.vue'
import PageBreadcrumb from '@/components/PageBreadcrumb.vue'
import AppAlert from '@/components/AppAlert.vue'
import SearchBar from '@/components/SearchBar.vue'
import { notify } from '@/hooks/useToast/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { useThemeStore } from '@/stores/theme'
import { formatUtils } from '@/utils/index.js'
import { PAGES, PRODUCT_GRID, TRADE } from '@/constants/index.js'
import {
  ORDER_STATUS_TABS,
  orderStatusLabel,
  orderStatusTagClass,
  canCancel,
  canConfirmComplete,
  canPay,
} from '@/constants/order.js'

const themeStore = useThemeStore()
const route = useRoute()
const router = useRouter()

/** 面包屑：订单一览属于账户中心下的二级页，给一条回首页/回个人中心的路 */
const breadcrumbItems = [
  { label: '首页', to: '/home' },
  { label: '我的订单' },
]

const orders = ref([])
const loading = ref(true)
const error = ref('')
const status = ref('all')
/** 搜索框里正在输入的内容（不直接触发请求，防抖后再落到 keyword） */
const keywordInput = ref('')
/** 已生效的搜索词：请求参数用它，避免每敲一个字都发一次请求 */
const keyword = ref('')
let searchTimer = null
const paymentNotice = ref(PRODUCT_GRID.paymentNotice)
/** 服务端是否已配置支付通道：决定「去支付」「确认完成」是否出现（未配置时保留线下结算流程） */
const payEnabled = ref(false)
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

/** 五态页签（3.3.0 接入支付后新增 paid / refunded）：文案与徽标色统一在 constants/order.js 定义 */
const statusTabs = computed(() =>
  ORDER_STATUS_TABS.map((value) => ({
    value,
    label: value === 'all' ? TRADE.orderFilterAll : orderStatusLabel(value),
  }))
)

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))
const formatPrice = (value) => formatUtils.formatPrice(value, currency.value)

/** 状态徽标语义色：与卡密、Apple ID 状态同族；映射表在 constants/order.js（未知状态不冒充「待处理」） */
const statusTagClass = (value) => orderStatusTagClass(value)

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
    if (keyword.value) params.keyword = keyword.value

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
    // 支付通道是否开启：服务端说了算（未配置时回到线下结算文案与老流程）
    payEnabled.value = result.data?.pay_enabled === true
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

/**
 * 搜索防抖 300ms：订单列表每次请求都要连数据库，
 * 逐字发请求既浪费往返也让输入框发卡（列表整块被 loading 替换）。
 */
watch(keywordInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const next = String(value || '').trim()
    if (next === keyword.value) return
    keyword.value = next
    fetchOrders(1)
  }, 300)
})

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
  handleGatewayReturn()
  fetchOrders(1)
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

/**
 * 支付网关回跳（手机端扫码后跳回本站）。
 *
 * 网关会把一整串参数原样拼在 `YIPAY_RETURN_URL` 后面
 * （`out_trade_no` / `trade_no` / `trade_status` / `money` …），
 * 所以这里**只认 `out_trade_no`，并且要把它还原成订单号**：
 * 支付单号是 `订单号-尝试序号`（`PAY001-UI-001-1`），订单号本身也可能带连字符，
 * 因此只能从末尾按 `-数字` 剥，不能 `split('-')[0]`。
 *
 * 拿到订单号后重新问一次服务端（按需对账会顺带向网关确认），
 * 这样即使回调还没到，用户也能立刻看到「已支付」，而不是盯着旧状态。
 */
const handleGatewayReturn = async () => {
  const outTradeNo = String(route.query.out_trade_no || '').trim()
  if (!outTradeNo) return

  const orderNo = outTradeNo.replace(/-\d+$/, '')
  if (!orderNo) return

  // 回跳参数只用于定位，不展示；立刻从地址栏抹掉，
  // 否则用户刷新页面会重复弹一次提示，分享出去的链接也会带着别人的交易号。
  router.replace({ path: route.path, query: {} })

  try {
    const result = await payment.getPaymentStatus({ order_no: orderNo })
    const paid = result?.data?.payment?.status === 'paid'
    if (paid) notify.success('支付成功，订单已更新为「已支付」')
    else notify.info('已回到订单列表，支付结果以订单状态为准')
  } catch (err) {
    // 回跳只是「顺路的提示」，失败不该打断页面：列表本身会显示真实状态
    if (err?.status !== 401) notify.info('已回到订单列表')
  }

  // 有搜索词时先把搜索清掉，否则刚付的那笔可能被过滤掉，看起来像没成功
  if (keyword.value) {
    keywordInput.value = ''
    keyword.value = ''
  }
}
</script>

<style scoped>
/*
 * 订单管理：状态页签 + 订单卡片列表 + 分页。
 * 卡片复用 .page-panel 外壳，只写订单特有的「订单号 / 缩略图 / 金额 / 动作」四段。
 */

/* 页签与搜索框同一行：页签左、搜索右；窄屏自动换行，搜索框独占一行 */
.orders-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  margin-bottom: var(--section-gap);
}

.orders-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit));
}

.orders-search {
  flex: 0 1 260px;
  min-width: 180px;
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

/* 指路条：与提示条同宽、同左对齐，字号比正文小一档 */
.orders-assets-link {
  margin: 0 0 calc(var(--space-unit) * 2);
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.orders-assets-link a {
  color: var(--accent);
  text-decoration: underline;
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
