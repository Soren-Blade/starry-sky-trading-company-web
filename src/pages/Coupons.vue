<template>
  <div class="page-shell page-shell--narrow coupons-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">我的优惠券</h1>
      <p class="page-shell-desc">下单时可选用，注意门槛与有效期</p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="ticket" class="u-mm-state-icon" />
      <p class="u-mm-state-title">请先登录账号</p>
      <p class="u-mm-state-desc">登录后可查看你的优惠券</p>
      <div class="u-mm-state-actions">
        <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看优惠券')">
          立即登录
        </button>
      </div>
    </div>

    <template v-else>
      <!-- 三态页签：角标来自服务端 counts（派生状态，前端不自己数） -->
      <nav class="coupons-tabs" role="tablist">
        <button
          v-for="tab in COUPON_STATUSES"
          :key="tab.value"
          type="button"
          role="tab"
          class="coupons-tab"
          :class="{ 'is-active': couponStore.status === tab.value }"
          :aria-selected="couponStore.status === tab.value"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
          <span v-if="badgeOf(tab.value)" class="coupons-tab-badge">{{ badgeOf(tab.value) }}</span>
        </button>
      </nav>

      <div v-if="couponStore.loading && !couponStore.list.length" class="ui-card coupons-skeleton">
        <span class="u-skeleton coupons-skeleton-line"></span>
        <span class="u-skeleton coupons-skeleton-line"></span>
      </div>

      <div v-else-if="couponStore.error" class="ui-card u-mm-state u-mm-state--error" role="alert">
        <AppIcon name="alert-triangle" class="u-mm-state-icon" />
        <p class="u-mm-state-title">{{ couponStore.error }}</p>
        <div class="u-mm-state-actions">
          <button type="button" class="u-btn-secondary" @click="couponStore.fetchMine()">重试</button>
        </div>
      </div>

      <div v-else-if="!couponStore.list.length" class="ui-card u-mm-state">
        <AppIcon name="ticket" class="u-mm-state-icon" />
        <p class="u-mm-state-title">{{ emptyTitle }}</p>
        <p class="u-mm-state-desc">{{ emptyDesc }}</p>
      </div>

      <template v-else>
        <ul class="coupons-list">
          <li
            v-for="item in couponStore.list"
            :key="item.id"
            class="u-mm-coupon"
            :class="{
              'is-used': item.status === 'used',
              'is-expired': item.status === 'expired',
              'is-expiring': item.expiring_soon,
            }"
          >
            <div class="u-mm-coupon-amount">
              <span>¥{{ item.amount }}</span>
              <span class="u-mm-coupon-threshold">{{ thresholdText(item) }}</span>
            </div>

            <div class="u-mm-coupon-body">
              <div class="coupon-title-row">
                <span class="u-mm-coupon-name">{{ item.name || '优惠券' }}</span>
                <!-- 状态一律用服务端给的（派生状态），前端不拿时间自己判 -->
                <span class="u-tag" :class="statusTagClass(item.status)">
                  {{ item.status_text }}
                </span>
              </div>
              <p class="u-mm-coupon-scope">{{ item.scope_text }}</p>
              <!-- 分片把「即将过期」的语义色挂在 meta 行上（is-expiring → --warning），
                   所以有效期与来源合成一行文字，而不是再排一个图标 + 右对齐的来源 -->
              <p class="u-mm-coupon-meta">{{ expiryText(item) }} · {{ item.source_text }}</p>
              <p v-if="item.status === 'used' && item.used_order_no" class="coupon-used">
                已用于订单 {{ item.used_order_no }}
              </p>
              <span v-if="item.expiring_soon" class="u-mm-coupon-flag">即将过期</span>
            </div>
          </li>
        </ul>

        <!-- 分页：只有一页时不渲染控件（避免出现点不动的按钮） -->
        <div v-if="couponStore.totalPages > 1" class="u-mm-pager">
          <span class="u-mm-pager-info">{{ couponStore.page }} / {{ couponStore.totalPages }}</span>
          <div class="u-mm-pager-btns">
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="!couponStore.hasPrev"
              @click="goPage(couponStore.page - 1)"
            >
              上一页
            </button>
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="!couponStore.hasNext"
              @click="goPage(couponStore.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 我的优惠券（`/coupons`）—— 方案 §P0-6
 *
 * 三条纪律：
 *   1. **状态一律用服务端给的 `status`**：库里只存 available / used，
 *      「已过期」是读取时按 `expires_at` 派生的。前端再判一次就会出现
 *      「页面说可用、下单时被拒」。
 *   2. **角标用服务端 `counts`**，不前端 `filter().length` ——
 *      前端只拿得到当前页，数出来的数在分页时是错的。
 *   3. **已过期/已使用的券保留可见**（降饱和），不隐藏 ——
 *      用户需要「我的券去哪了」的答案，直接消失会变成客服咨询。
 */
import { computed, onMounted } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { useCouponStore } from '@/stores/coupon.js'
import { useUserStore } from '@/stores/user.js'
import { COUPON_STATUSES } from '@/constants/member.js'

const couponStore = useCouponStore()
const userStore = useUserStore()

/** 页签角标：『全部』页签没有对应角标（三态互斥，加起来就是了） */
function badgeOf(status) {
  if (status === 'available') return couponStore.counts.available
  if (status === 'used') return couponStore.counts.used
  if (status === 'expired') return couponStore.counts.expired
  return 0
}

const emptyTitle = computed(() => {
  if (couponStore.status === 'used') return '还没有用过的券'
  if (couponStore.status === 'expired') return '没有已过期的券'
  return '还没有可用的优惠券'
})

const emptyDesc = computed(() => {
  if (couponStore.status === 'available') return '开通会员可获每月券包，领券中心也常有活动'
  return '券的状态会随使用与时间变化，这里可以看到历史'
})

function thresholdText(item) {
  const threshold = Number(item.threshold)
  return threshold > 0 ? `满 ¥${item.threshold} 可用` : '无门槛'
}

function statusTagClass(status) {
  if (status === 'available') return 'u-tag--accent'
  return ''
}

function expiryText(item) {
  const date = formatDate(item.expires_at)
  if (item.status === 'used') return `已于 ${date} 使用`
  if (item.status === 'expired') return `已于 ${date} 过期`
  return `有效期至 ${date}`
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function switchTab(status) {
  if (couponStore.status === status) return
  couponStore.setStatus(status)
  couponStore.fetchMine()
}

function goPage(page) {
  couponStore.fetchMine({ page })
}

onMounted(() => {
  if (userStore.isLoggedIn) couponStore.fetchMine()
})
</script>

<style scoped>
.coupons-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 空态 —— 容器与文案层走共享分片 .u-mm-state（见 ui-kit-member.css §2） */

/* 页签 */
.coupons-tabs {
  display: flex;
  gap: var(--space-unit);
  border-bottom: var(--stroke-width) solid var(--border);
}
.coupons-tab {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-body);
  color: var(--text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color var(--transition-interactive), border-color var(--transition-interactive);
}
.coupons-tab:hover {
  color: var(--text-primary);
}
.coupons-tab.is-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.coupons-tab-badge {
  padding: 0 calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  border-radius: var(--radius-media);
  background: var(--bg-surface-2);
}

/* 骨架与错误 */
.coupons-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 3);
}
.coupons-skeleton-line {
  height: calc(var(--space-unit) * 8);
  border-radius: var(--radius-media);
}
/* 券卡片：容器 / 票根缺口 / 四态（可用·已用·已过期·即将过期）走共享分片
 * `.u-mm-coupon`（见 ui-kit-member.css §13），分页壳走 §4 `.u-mm-pager`。
 * 这里只留分片没覆盖的两处：卡片之间的大间距、标题行（名称 + 状态标签）的横排。 */
.coupons-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.coupon-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
}
.coupon-used {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
  font-family: var(--font-mono);
}
</style>
