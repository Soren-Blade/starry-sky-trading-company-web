<template>
  <div class="page-shell cart-page">
    <header class="page-shell-head page-shell-head--row">
      <div>
        <p class="page-shell-eyebrow">{{ PAGES.cart.eyebrow }}</p>
        <h1 class="page-shell-title">{{ PAGES.cart.title }}</h1>
        <p class="page-shell-desc">{{ PAGES.cart.description }}</p>
      </div>
      <span v-if="!needLogin && !cartStore.isEmpty" class="u-tag u-tag--accent">
        {{ cartStore.count }} 件
      </span>
    </header>

    <!-- 未登录：购物车属于账号数据，这里给出明确的登录入口而不是一个空车 -->
    <div v-if="needLogin" class="page-empty">
      <p class="page-empty-title">{{ TRADE.cartLoginFirst }}</p>
      <div class="page-actions cart-empty-actions">
        <button type="button" class="u-btn-primary" @click="openLogin">
          登录 / 注册
        </button>
        <router-link to="/hot" class="u-btn-secondary">先去逛逛</router-link>
      </div>
    </div>

    <div v-else-if="loading && !cartStore.loaded" class="u-loading-block" role="status">
      <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
      <span>正在加载购物车…</span>
    </div>

    <div v-else-if="cartStore.isEmpty" class="page-empty">
      <p class="page-empty-title">{{ TRADE.cartEmpty }}</p>
      <p class="page-empty-hint">{{ TRADE.cartEmptyHint }}</p>
      <div class="page-actions cart-empty-actions">
        <router-link to="/categories" class="u-btn-primary">浏览商品分类</router-link>
        <router-link to="/hot" class="u-btn-secondary">看热门推荐</router-link>
      </div>
    </div>

    <template v-else>
      <div class="cart-layout">
        <!-- 左：条目列表 -->
        <section class="page-panel cart-list" aria-label="购物车条目">
          <div class="cart-list-head">
            <label class="u-checkbox">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected && !allSelected"
                @change="toggleAll"
              />
              <span class="u-checkbox-box" aria-hidden="true"></span>
              <span>全选</span>
            </label>

            <button
              type="button"
              class="link-btn cart-clear"
              :disabled="clearing"
              @click="handleClear"
            >
              {{ TRADE.cartClear }}
            </button>
          </div>

          <ul class="cart-items">
            <li
              v-for="item in cartStore.items"
              :key="item.id"
              class="cart-item"
              :class="{ 'cart-item--unavailable': !item.available }"
            >
              <label class="u-checkbox cart-item-check">
                <input
                  type="checkbox"
                  :checked="selected.has(item.id)"
                  :disabled="!item.available"
                  :aria-label="`选择 ${item.product_title || '商品'}`"
                  @change="toggleOne(item)"
                />
                <span class="u-checkbox-box" aria-hidden="true"></span>
              </label>

              <router-link
                :to="`/product/${item.product_id}`"
                class="cart-thumb"
                :aria-label="`查看 ${item.product_title || '商品'}`"
              >
                <img v-if="item.product_image" :src="item.product_image" :alt="item.product_title" />
                <span v-else class="cart-thumb-placeholder" aria-hidden="true">🛍️</span>
              </router-link>

              <div class="cart-item-main">
                <router-link :to="`/product/${item.product_id}`" class="cart-item-title">
                  {{ item.product_title || '商品已下架' }}
                </router-link>

                <p class="cart-item-price">
                  <span class="u-price cart-item-unit">{{ formatPrice(item.unit_price) }}</span>
                  <span v-if="item.price_changed" class="cart-item-changed">
                    （现价 {{ formatPrice(item.current_price) }}）
                  </span>
                </p>

                <p v-if="!item.available" class="cart-item-warn">
                  {{ item.unavailable_reason }}
                </p>
              </div>

              <div class="cart-item-qty">
                <button
                  type="button"
                  class="u-btn-secondary quantity-step"
                  aria-label="减少数量"
                  :disabled="item.quantity <= 1 || pending.has(item.id)"
                  @click="changeQuantity(item, item.quantity - 1)"
                >
                  −
                </button>
                <span class="quantity-value" aria-live="polite">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="u-btn-secondary quantity-step"
                  aria-label="增加数量"
                  :disabled="item.quantity >= 999 || pending.has(item.id)"
                  @click="changeQuantity(item, item.quantity + 1)"
                >
                  +
                </button>
              </div>

              <p class="cart-item-subtotal">{{ formatPrice(item.subtotal) }}</p>

              <button
                type="button"
                class="u-icon-btn cart-item-remove"
                :aria-label="`移除 ${item.product_title || '商品'}`"
                :disabled="pending.has(item.id)"
                @click="removeItem(item)"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          </ul>

          <p v-if="cartStore.hasUnavailable" class="page-note cart-note">
            {{ TRADE.cartUnavailableNote }}
          </p>
        </section>

        <!-- 右：结算面板（桌面吸顶） -->
        <aside class="cart-summary" aria-label="结算">
          <div class="page-panel">
            <h2 class="page-panel-head">结算</h2>

            <dl class="summary-rows">
              <div class="summary-row">
                <dt>{{ TRADE.cartSelected }}</dt>
                <dd>{{ selectedCount }} 件</dd>
              </div>
              <div class="summary-row summary-row--total">
                <dt>{{ TRADE.cartTotal }}</dt>
                <!-- 选中行的小计由本地按服务端下发的单价求和；真正的订单金额
                     仍然由服务端在下单时按当前价格重算，两者可能因改价而不同，
                     那时以订单详情页的金额为准 -->
                <dd>
                  <span class="u-price summary-total">
                    <span>{{ selectedTotal.prefix }}{{ selectedTotal.integer }}</span>
                    <span v-if="selectedTotal.decimals" class="u-price-decimals">
                      .{{ selectedTotal.decimals }}
                    </span>
                  </span>
                </dd>
              </div>
            </dl>

            <div class="u-field">
              <label class="u-field-label" for="cart-contact">{{ TRADE.checkoutContact }}</label>
              <input
                id="cart-contact"
                v-model="contact"
                class="u-input"
                type="text"
                maxlength="128"
                :placeholder="TRADE.checkoutContactPlaceholder"
              />
            </div>

            <div class="u-field">
              <label class="u-field-label" for="cart-remark">{{ TRADE.checkoutRemark }}</label>
              <input
                id="cart-remark"
                v-model="remark"
                class="u-input"
                type="text"
                maxlength="500"
                :placeholder="TRADE.checkoutRemarkPlaceholder"
              />
            </div>

            <button
              type="button"
              class="u-btn-primary summary-submit"
              :disabled="selectedCount === 0 || submitting"
              :aria-busy="submitting"
              @click="handleCheckout"
            >
              <span v-if="submitting" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
              <span>{{ submitting ? '提交中…' : TRADE.cartCheckout }}</span>
            </button>

            <p class="page-note">{{ PRODUCT_GRID.paymentNotice }}</p>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * 购物车与下单
 *
 * 三个决定：
 *
 * 1. **需要一个「选择」维度**。服务端提交接口收的是商品行数组，因此选择完全
 *    在客户端完成：默认全选所有可下单行，取消勾选的行既不显示在金额里、
 *    也不会被提交。不可下单的行（下架/缺货/库存不够）**禁止勾选** ——
 *    让用户勾上再被服务端拒绝是更差的体验。
 *
 * 2. **下单走 `from_cart: true`**，服务端下单成功后会把这几件从购物车移除，
 *    前端不需要再发一次 clear，也就不会出现「订单建好了但购物车没清干净」。
 *
 * 3. **金额只做展示**。选中合计是本地按服务端下发的单价求和；
 *    真正的订单金额由服务端在下单时按当前价格现算（见 server 的 create_order）。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import api from '@/api/index'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { notify } from '@/hooks/useToast/index.js'
import { formatUtils } from '@/utils/index.js'
import { PAGES, PRODUCT_GRID, TRADE } from '@/constants/index.js'

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()
const themeStore = useThemeStore()
const { loading } = storeToRefs(cartStore)

/** 哪些行被勾选（存 id） */
const selected = ref(new Set())
/** 正在请求中的行 id：禁用该行的按钮，避免连点叠加数量 */
const pending = ref(new Set())

const contact = ref('')
const remark = ref('')
const submitting = ref(false)
const clearing = ref(false)
const needLogin = ref(false)

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))

const formatPrice = (value) => formatUtils.formatPrice(value, currency.value)

const availableItems = computed(() => cartStore.items.filter((item) => item.available))
const selectedItems = computed(() =>
  cartStore.items.filter((item) => item.available && selected.value.has(item.id))
)
const selectedCount = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

/** 选中金额：按单价 × 数量求和，两位小数收口避免浮点尾数 */
const selectedTotal = computed(() =>
  formatUtils.splitPrice(
    Number(selectedItems.value.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2)),
    currency.value
  )
)

const allSelected = computed(
  () => availableItems.value.length > 0 && availableItems.value.every((item) => selected.value.has(item.id))
)
const someSelected = computed(() => availableItems.value.some((item) => selected.value.has(item.id)))

/** 是否已经做过「默认全选」。用显式标记而不是 `selected.size === 0`：
 *  用户主动取消全部勾选之后，任何一次同步都不该把它们又选回来。 */
let selectionInitialized = false

/**
 * 对齐选择集合与购物车内容：
 *   - 已删除的行自动移出选择
 *   - 不可下单的行不允许保持勾选
 *   - 首次进入默认全选所有可下单的行
 */
const syncSelection = () => {
  const availableIds = new Set(availableItems.value.map((item) => item.id))
  const next = new Set()

  for (const id of selected.value) {
    if (availableIds.has(id)) next.add(id)
  }

  if (!selectionInitialized) {
    for (const id of availableIds) next.add(id)
    selectionInitialized = true
  }

  selected.value = next
}

const toggleAll = () => {
  selected.value = allSelected.value
    ? new Set()
    : new Set(availableItems.value.map((item) => item.id))
}

const toggleOne = (item) => {
  const next = new Set(selected.value)
  if (next.has(item.id)) next.delete(item.id)
  else next.add(item.id)
  selected.value = next
}

const markPending = (id) => {
  const next = new Set(pending.value)
  next.add(id)
  pending.value = next
}

const clearPending = (id) => {
  const next = new Set(pending.value)
  next.delete(id)
  pending.value = next
}

const changeQuantity = async (item, quantity) => {
  if (pending.value.has(item.id)) return
  markPending(item.id)
  try {
    const result = await cartStore.updateQuantity(item.id, quantity)
    if (result.needLogin) {
      needLogin.value = true
      userStore.openLoginModal(TRADE.cartLoginFirst)
      return
    }
    if (!result.success) notify.error(result.message)
  } finally {
    clearPending(item.id)
  }
}

const removeItem = async (item) => {
  if (pending.value.has(item.id)) return
  markPending(item.id)
  try {
    const result = await cartStore.remove(item.id)
    if (result.needLogin) {
      needLogin.value = true
      return
    }
    if (result.success) notify.success('已移除')
    else notify.error(result.message)
  } finally {
    clearPending(item.id)
  }
}

const handleClear = async () => {
  if (clearing.value) return
  // 用原生 confirm 而不是新做一个模态：清空是低频且可撤销成本低的动作，
  // 为它引入第三个弹窗组件不划算
  if (typeof window !== 'undefined' && !window.confirm(TRADE.cartClearConfirm)) return

  clearing.value = true
  try {
    const result = await cartStore.clear()
    if (result.success) {
      selected.value = new Set()
      notify.success(result.message)
    } else {
      notify.error(result.message)
    }
  } finally {
    clearing.value = false
  }
}

const handleCheckout = async () => {
  if (submitting.value || selectedItems.value.length === 0) return

  submitting.value = true
  try {
    const result = await api.createOrder({
      items: selectedItems.value.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      contact: contact.value.trim() || undefined,
      remark: remark.value.trim() || undefined,
      from_cart: true,
    })

    if (!result?.success) {
      notify.error(result?.message || '下单失败')
      // 库存或下架状态可能刚刚变了，刷新一次让标记跟上
      await cartStore.fetch()
      return
    }

    const orderNo = result.data?.order?.order_no
    notify.success(TRADE.checkoutSuccess)
    if (orderNo) router.push({ name: 'OrderDetail', params: { orderNo } })
    else router.push({ name: 'Orders' })
  } catch (error) {
    notify.error(error?.message || '下单失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const openLogin = () => {
  userStore.openLoginModal(TRADE.cartLoginFirst)
}

onMounted(async () => {
  const result = await cartStore.fetch()
  needLogin.value = Boolean(result?.needLogin)
  if (!needLogin.value) syncSelection()
})

// 购物车内容变化（改数量/删除/下单清空）后重新对齐选择集合
watch(
  () => cartStore.items.map((item) => `${item.id}:${item.available}`).join(','),
  () => {
    if (!needLogin.value) syncSelection()
  }
)
</script>

<style scoped>
/*
 * 购物车
 *
 * 桌面两栏（条目列表 + 吸顶结算面板），991 以下单栏。
 * 条目行用 grid 排「勾选 / 缩略图 / 标题 / 数量 / 小计 / 移除」六段，
 * 不套 a-table —— 每行是可交互控件（步进器、勾选框），表格语义并不合适。
 */

.cart-empty-actions {
  justify-content: center;
  margin-top: calc(var(--space-unit) * 2.5);
}

.cart-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) calc(var(--dropdown-width) * 1.15);
  align-items: start;
  gap: var(--section-gap);
}

.cart-list {
  padding: 0;
}

.cart-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2.5);
  border-bottom: var(--stroke-width) solid var(--divider);
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

.link-btn:hover:not(:disabled) {
  color: var(--accent-strong);
  text-decoration: underline;
}

.link-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cart-items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cart-item {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5);
}

.cart-item + .cart-item {
  border-top: var(--stroke-width) solid var(--divider);
}

/* 不可下单的行整体降透明度，但文字仍保持可读（只压到 .62） */
.cart-item--unavailable .cart-item-main,
.cart-item--unavailable .cart-thumb,
.cart-item--unavailable .cart-item-subtotal {
  opacity: 0.62;
}

.cart-item-check {
  flex-shrink: 0;
}

.cart-thumb {
  display: grid;
  place-items: center;
  width: calc(var(--space-unit) * 9);
  height: calc(var(--space-unit) * 9);
  overflow: hidden;
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-media);
}

.cart-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-thumb-placeholder {
  font-size: var(--fs-h3);
}

.cart-item-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}

.cart-item-title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-interactive);
}

.cart-item-title:hover {
  color: var(--accent);
}

.cart-item-price {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
}

.cart-item-unit {
  font-size: var(--fs-sm);
}

.cart-item-changed {
  font-size: var(--fs-label);
  color: var(--warning);
}

.cart-item-warn {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--danger);
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
}

.quantity-step {
  width: var(--icon-btn-size);
  min-width: var(--icon-btn-size);
  padding: 0;
  font-size: var(--fs-h3);
  line-height: 1;
}

.quantity-value {
  min-width: calc(var(--space-unit) * 4);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  text-align: center;
  color: var(--text-primary);
}

.cart-item-subtotal {
  min-width: calc(var(--space-unit) * 10);
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  text-align: right;
  color: var(--text-primary);
}

.cart-item-remove {
  color: var(--text-muted);
}

.cart-item-remove:hover:not(:disabled) {
  color: var(--danger);
  border-color: var(--danger);
}

.cart-note {
  padding: 0 calc(var(--space-unit) * 2.5) calc(var(--space-unit) * 2);
}

/* 结算面板吸顶：位置让开粘性顶栏 */
.cart-summary {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-unit) * 2);
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.25);
  margin: 0 0 calc(var(--space-unit) * 2.5);
}

.summary-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.summary-row dd {
  margin: 0;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.summary-row--total dd {
  font-weight: var(--fw-heading);
}

.summary-total {
  font-size: var(--fs-price);
}

.summary-submit {
  width: 100%;
  margin: calc(var(--space-unit) * 2.5) 0 calc(var(--space-unit) * 1.5);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 991px) {
  .cart-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 767px) {
  .cart-item {
    /* 窄屏：勾选 + 缩略图 + 标题一行，数量/小计/移除折到第二行 */
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    grid-template-areas:
      'check thumb main remove'
      'check thumb qty subtotal';
    row-gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--space-unit) * 2 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
  }

  .cart-item-check {
    grid-area: check;
  }

  .cart-thumb {
    grid-area: thumb;
  }

  .cart-item-main {
    grid-area: main;
  }

  .cart-item-qty {
    grid-area: qty;
  }

  .cart-item-subtotal {
    grid-area: subtotal;
  }

  .cart-item-remove {
    grid-area: remove;
  }
}
</style>
