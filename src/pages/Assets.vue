<template>
  <div class="page-shell assets-page">
    <PageBreadcrumb :items="breadcrumbItems" />

    <header class="page-shell-head page-shell-head--row">
      <div>
        <p class="page-shell-eyebrow">{{ PAGES.assets.eyebrow }}</p>
        <h1 class="page-shell-title">{{ PAGES.assets.title }}</h1>
        <p class="page-shell-desc">{{ PAGES.assets.description }}</p>
      </div>
      <span class="u-tag u-tag--accent">{{ t('member.assetsPage.total', { count: totalCount }) }}</span>
    </header>

    <!--
      三块内容各自独立加载、独立失败：
      「卡密接口挂了」不该把「已激活工具」也一起变成错误页 —— 它们是三个数据源。
    -->
    <section class="ui-card assets-section" aria-labelledby="assets-digital-title">
      <div class="assets-head">
        <h2 id="assets-digital-title" class="assets-title">
          <AppIcon name="shopping-bag" /> {{ t('member.assetsPage.digitalTitle') }}
        </h2>
        <button
          type="button"
          class="refresh-btn u-btn-secondary"
          :disabled="ordersLoading"
          :aria-label="ordersLoading ? t('member.assetsPage.refreshingAria') : t('member.assetsPage.refreshAria')"
          @click="loadOrders"
        >
          <AppIcon v-if="!ordersLoading" name="refresh-cw" />
          <span v-else class="u-spinner u-spinner--sm" role="status" :aria-label="t('common.loading')"></span>
          {{ ordersLoading ? t('member.assetsPage.refreshing') : t('member.assetsPage.refresh') }}
        </button>
      </div>
      <p class="assets-hint">
        {{ t('member.assetsPage.digitalHintBefore') }}
        <router-link class="assets-link" to="/user/orders">{{ t('member.assetsPage.digitalHintLink') }}</router-link>{{ t('member.assetsPage.digitalHintAfter') }}
      </p>

      <p v-if="ordersError" class="error-banner" role="alert">{{ ordersError }}</p>

      <div class="u-table-wrap">
        <table class="u-table assets-table">
          <thead>
            <tr>
              <th scope="col">{{ t('member.assetsPage.colProduct') }}</th>
              <th scope="col">{{ t('member.assetsPage.colType') }}</th>
              <th scope="col">{{ t('member.assetsPage.colQuantity') }}</th>
              <th scope="col">{{ t('member.assetsPage.colAmount') }}</th>
              <th scope="col">{{ t('member.assetsPage.colOrderedAt') }}</th>
              <th scope="col">{{ t('member.assetsPage.colOrder') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in digitalItems" :key="`${item.order_no}-${item.product_id ?? item.product_title}`">
              <td>
                <span class="assets-name">{{ item.product_title }}</span>
              </td>
              <td>
                <span class="u-tag u-tag--muted">{{ goodsTypeLabel(item.goods_type) }}</span>
              </td>
              <td>{{ item.quantity }}</td>
              <td><span class="assets-price">¥{{ formatAmount(item.subtotal) }}</span></td>
              <td><span class="assets-muted">{{ toDate(item.created_at) }}</span></td>
              <td>
                <router-link
                  class="assets-link"
                  :to="{ name: 'OrderDetail', params: { orderNo: item.order_no } }"
                >
                  {{ item.order_no }}
                </router-link>
              </td>
            </tr>

            <tr v-if="!ordersLoading && !digitalItems.length" class="assets-empty-row">
              <td colspan="6">{{ t('member.assetsPage.digitalEmpty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ui-card assets-section" aria-labelledby="assets-cards-title">
      <div class="assets-head">
        <h2 id="assets-cards-title" class="assets-title">
          <AppIcon name="key" /> {{ t('member.assetsPage.cardsTitle') }}
        </h2>
        <router-link class="assets-link" to="/user/kami">{{ t('member.assetsPage.activateNew') }}</router-link>
      </div>
      <p class="assets-hint">{{ t('member.assetsPage.cardsHint') }}</p>

      <p v-if="cardsError" class="error-banner" role="alert">{{ cardsError }}</p>

      <div class="u-table-wrap">
        <table class="u-table assets-table">
          <thead>
            <tr>
              <th scope="col">{{ t('member.assetsPage.colCardName') }}</th>
              <th scope="col">{{ t('member.assetsPage.colCardNo') }}</th>
              <th scope="col">{{ t('member.assetsPage.colValue') }}</th>
              <th scope="col">{{ t('member.assetsPage.colStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="card in cards" :key="card.id">
              <td><span class="assets-name">{{ card.card_name || '—' }}</span></td>
              <!--
                卡号：默认脱敏（截图/录屏不外泄），右侧一键复制**完整**卡号 ——
                用户拿到卡密的目的就是去工具页激活，只给 `TEST****CF87` 等于让他自己拼。
                脱敏值与明文都由服务端下发（本人数据，requireSameUser 过）。
              -->
              <td>
                <span class="assets-mono-cell">
                  <MaskedValue class="assets-mono" :value="card.card_no_display || '—'" />
                  <button
                    v-if="card.card_no"
                    type="button"
                    class="assets-copy-btn"
                    :aria-label="t('member.assetsPage.copyCardAria', { name: card.card_name || card.card_no_display || '' })"
                    :title="TRADE.orderCardCopy"
                    @click="copyCardNo(card)"
                  >
                    <AppIcon name="clipboard" />
                  </button>
                </span>
              </td>
              <td>{{ card.card_value ?? '—' }}</td>
              <td>
                <span class="u-tag">{{ card.status_text || card.status || '—' }}</span>
              </td>
            </tr>

            <tr v-if="!cardsLoading && !cards.length" class="assets-empty-row">
              <td colspan="4">{{ t('member.assetsPage.cardsEmpty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ui-card assets-section" aria-labelledby="assets-tools-title">
      <div class="assets-head">
        <h2 id="assets-tools-title" class="assets-title">
          <AppIcon name="wrench" /> {{ t('member.assetsPage.toolsTitle') }}
        </h2>
        <button
          type="button"
          class="refresh-btn u-btn-secondary"
          :disabled="entitlementsLoading"
          :aria-label="entitlementsLoading ? t('member.assetsPage.refreshingAria') : t('member.assetsPage.refreshAria')"
          @click="loadEntitlements"
        >
          <AppIcon v-if="!entitlementsLoading" name="refresh-cw" />
          <span v-else class="u-spinner u-spinner--sm" role="status" :aria-label="t('common.loading')"></span>
          {{ entitlementsLoading ? t('member.assetsPage.refreshing') : t('member.assetsPage.refresh') }}
        </button>
      </div>
      <p class="assets-hint">
        {{ t('member.assetsPage.toolsHint') }}
      </p>

      <p v-if="entitlementsError" class="error-banner" role="alert">{{ entitlementsError }}</p>

      <div class="u-table-wrap">
        <table class="u-table assets-table">
          <thead>
            <tr>
              <th scope="col">{{ t('member.assetsPage.colTool') }}</th>
              <th scope="col">{{ t('member.assetsPage.colSource') }}</th>
              <th scope="col">{{ t('member.assetsPage.colValidity') }}</th>
              <th scope="col">{{ t('member.assetsPage.colStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in entitlements" :key="item.tool_id">
              <td><span class="assets-name">{{ entitlementToolName(item) }}</span></td>
              <td>
                <span class="u-tag">{{ entitlementSource(item) }}</span>
              </td>
              <td>
                <span v-if="item.is_permanent" class="assets-muted">{{ t('member.assetsPage.permanent') }}</span>
                <span v-else-if="item.expires_at" class="assets-muted">
                  {{ toDate(item.expires_at) }}
                  <template v-if="item.is_valid && item.days_left !== null">{{ t('member.assetsPage.daysLeft', { days: item.days_left }) }}</template>
                </span>
                <span v-else class="assets-muted">—</span>
              </td>
              <td>
                <span class="u-tag" :class="item.is_valid ? 'u-tag--success' : 'u-tag--muted'">
                  {{ item.is_valid ? t('member.assetsPage.valid') : t('member.assetsPage.expired') }}
                </span>
              </td>
            </tr>

            <tr v-if="!entitlementsLoading && !entitlements.length" class="assets-empty-row">
              <td colspan="4">{{ t('member.assetsPage.toolsEmpty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * 我的资产（2.3.0）
 *
 * 为什么要有这个页面：卡密、数字商品、已激活工具原先分散在三处 ——
 * 卡密在「卡密管理」、数字商品混在订单列表里、已激活工具挂在卡密页尾部。
 * 用户要查「我买到的东西」得来回跳，所以这里按「买了什么」重新聚合。
 *
 * 三块数据源彼此独立：订单（orderApi）、卡密（kamiApi/getUserCards）、
 * 授权（kamiApi/myEntitlements）。任何一块失败只影响自己那一块。
 *
 * 边界：**实物商品不进来**。它涉及物流与收货信息，留在订单里更合适；
 * 这里只收 `digital`/`account`/`service` 三种形态，`physical` 与
 * 「形态未知」（商品已删除，goods_type 为 null）都不计入 —— 宁可漏，
 * 也不要把实物商品说成「已到账」。
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useKamiStore } from '@/stores/kami'
import PageBreadcrumb from '@/components/PageBreadcrumb.vue'
import MaskedValue from '@/components/MaskedValue.vue'
import AppIcon from '@/components/AppIcon.vue'
import api from '@/api/index'
import orderApi from '@/api/ask/order'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
import { PAGES, TRADE, NAV_MENU } from '@/constants/index.js'
import { goodsTypeLabel } from '@/utils/goodsType.js'
import { copyText } from '@/utils/clipboard.js'
import { notify } from '@/hooks/useToast/index.js'

const { t } = useI18n()
const userStore = useUserStore()
const kamiStore = useKamiStore()
const { userKamis: cards, loading: cardsLoading, error: cardsError } = storeToRefs(kamiStore)

/** 资产页只展示「能交付」的形态，实物走订单 */
const DIGITAL_TYPES = ['digital', 'account', 'service']

const breadcrumbItems = computed(() => [
  { label: NAV_MENU[0]?.label || 'Home', to: '/home' },
  { label: t('pages.profile.title'), to: '/user/profile' },
  { label: t('pages.assets.title') },
])

const orders = ref([])
const ordersLoading = ref(false)
const ordersError = ref('')

const entitlements = ref([])
const entitlementsLoading = ref(false)
const entitlementsError = ref('')

/**
 * 把订单拍平成「一件商品一行」。
 *
 * 用订单项而不是订单：一张订单里可能同时有实物与数字商品，
 * 按订单聚合会让用户以为整单都进资产了。
 */
const digitalItems = computed(() => {
  const rows = []
  for (const order of orders.value) {
    for (const item of order.items || []) {
      if (!DIGITAL_TYPES.includes(item.goods_type)) continue
      rows.push({
        order_no: order.order_no,
        created_at: order.created_at,
        product_id: item.product_id,
        product_title: item.product_title,
        goods_type: item.goods_type,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })
    }
  }
  return rows
})

const totalCount = computed(() => digitalItems.value.length + cards.value.length + entitlements.value.length)

const formatAmount = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(2) : '—'
}

const entitlementSource = (item) =>
  item?.grant_source === 'member' ? t('member.assetsPage.sourceMember') : t('member.assetsPage.sourceCard')

/** 服务端已带 tool_name；工具被删时回落成「工具 #id」，不要留空单元格 */
const entitlementToolName = (item) => {
  if (item?.tool_name) return item.tool_name
  if (item?.tool_slug) return item.tool_slug
  return item?.tool_id ? t('member.assetsPage.toolFallback', { id: item.tool_id }) : '—'
}

async function loadOrders() {
  if (!userStore.isLoggedIn || ordersLoading.value) return
  ordersLoading.value = true
  try {
    // 一次拉够：资产页不翻页，按 50 条封顶（服务端上限），超出部分去订单管理看
    const result = await orderApi.getOrders({ page: 1, limit: 50 })
    if (!result?.success) {
      ordersError.value = result?.message || t('member.assetsPage.ordersError')
      orders.value = []
      return
    }
    orders.value = result.data?.orders || []
    ordersError.value = ''
  } catch (error) {
    ordersError.value = error?.message || t('member.assetsPage.ordersError')
    orders.value = []
  } finally {
    ordersLoading.value = false
  }
}

async function loadEntitlements() {
  if (!userStore.isLoggedIn || entitlementsLoading.value) return
  entitlementsLoading.value = true
  try {
    const response = await api.getMyEntitlements()
    if (response?.success === true && Array.isArray(response.data?.entitlements)) {
      entitlements.value = response.data.entitlements
      entitlementsError.value = ''
      return
    }
    entitlements.value = []
    entitlementsError.value = t('member.assetsPage.entitlementsError')
  } catch (error) {
    entitlements.value = []
    entitlementsError.value = error?.message || t('member.assetsPage.entitlementsError')
  } finally {
    entitlementsLoading.value = false
  }
}

function loadCards() {
  if (!userStore.isLoggedIn) return
  kamiStore.fetchUserKamis(userStore.userId, { page: 1, limit: 50 })
}

/**
 * 复制完整卡号
 *
 * 页面显示的是脱敏值（`TEST****CF87`），但复制必须给**明文** —— 用户复制卡密的
 * 唯一目的就是去工具页粘贴激活。`card.card_no` 由服务端下发（本人数据）。
 */
async function copyCardNo(card) {
  const value = card?.card_no
  if (!value) {
    notify.error(t('member.assetsPage.copyCardMissing'))
    return
  }
  const ok = await copyText(value)
  if (ok?.ok) notify.success(TRADE.orderCardCopied)
  else notify.error(ok?.message || t('member.assetsPage.copyCardFailed'))
}

onMounted(() => {
  if (!userStore.isLoggedIn) return
  loadOrders()
  loadCards()
  loadEntitlements()
})
</script>

<style scoped>
.assets-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

.assets-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}

.assets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
}

.assets-title {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1);
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}

.assets-hint {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.assets-name {
  font-weight: 500;
}

.assets-price {
  font-variant-numeric: tabular-nums;
}

.assets-muted {
  color: var(--text-muted);
}

.assets-mono {
  font-family: var(--font-mono, monospace);
}

/*
 * 卡号单元格：字号等宽 + 「脱敏值 + 复制按钮」一行排开。
 * nowrap 是必须的 —— 单元格两侧有 --table-cell-padding，卡号本身又长，
 * 允许换行时 `TEST****CF87` 会被折成两行（原来的挤压观感就是这么来的）。
 */
.assets-mono-cell {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  white-space: nowrap;
}

.assets-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 3);
  height: calc(var(--space-unit) * 3);
  padding: 0;
  color: var(--text-muted);
  cursor: pointer;
  background: transparent;
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--btn-radius);
  transition:
    color var(--transition-interactive),
    border-color var(--transition-interactive),
    background-color var(--transition-interactive);
}

.assets-copy-btn:hover,
.assets-copy-btn:focus-visible {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--bg-soft);
}

/* 状态列里现在带到期日（「已激活 · 2027-01-01 到期」）：
   标签不换行，列宽由内容撑开，不再把状态挤成两行 */
.assets-table td .u-tag {
  white-space: nowrap;
}

.assets-link {
  color: var(--accent);
  text-decoration: none;
}

.assets-link:hover {
  text-decoration: underline;
}

.assets-empty-row td {
  text-align: center;
  color: var(--text-muted);
}

/* 刷新按钮：图标 + 文案的水平间距（.u-btn-secondary 只管按钮本体） */
.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
}

/* 单块失败的行内错误条：只在本组件里定义，不引用别组件 scoped 的类名 */
.error-banner {
  margin: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2) 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  color: var(--danger);
  background: var(--danger-bg);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--btn-radius);
}

/* 窄屏：表头固定 6 列在 575px 下必然挤压，改成只用横向滚动，
   而不是把某几列藏掉——资产页的信息每一列都是「核对用」的。 */
@media (max-width: 767px) {
  .assets-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
