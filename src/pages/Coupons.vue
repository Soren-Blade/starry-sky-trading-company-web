<template>
  <div class="page-shell page-shell--narrow coupons-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">我的优惠券</h1>
      <p class="page-shell-desc">下单时可选用，注意门槛与有效期</p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="u-card coupons-state">
      <AppIcon name="ticket" class="coupons-state-icon" />
      <p class="coupons-state-title">请先登录账号</p>
      <p class="coupons-state-desc">登录后可查看你的优惠券</p>
      <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可查看优惠券')">
        立即登录
      </button>
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

      <div v-if="couponStore.loading && !couponStore.list.length" class="u-card coupons-skeleton">
        <span class="u-skeleton coupons-skeleton-line"></span>
        <span class="u-skeleton coupons-skeleton-line"></span>
      </div>

      <div v-else-if="couponStore.error" class="u-card coupons-error" role="alert">
        <AppIcon name="alert-triangle" />
        <span>{{ couponStore.error }}</span>
        <button type="button" class="u-btn" @click="couponStore.fetchMine()">重试</button>
      </div>

      <div v-else-if="!couponStore.list.length" class="u-card coupons-state">
        <AppIcon name="ticket" class="coupons-state-icon" />
        <p class="coupons-state-title">{{ emptyTitle }}</p>
        <p class="coupons-state-desc">{{ emptyDesc }}</p>
      </div>

      <template v-else>
        <ul class="coupons-list">
          <li
            v-for="item in couponStore.list"
            :key="item.id"
            class="u-card coupon"
            :class="{ 'is-used': item.status === 'used', 'is-expired': item.status === 'expired' }"
          >
            <div class="coupon-amount">
              <span class="coupon-amount-num">¥{{ item.amount }}</span>
              <span class="coupon-amount-threshold">{{ thresholdText(item) }}</span>
            </div>

            <div class="coupon-body">
              <div class="coupon-title-row">
                <span class="coupon-name">{{ item.name || '优惠券' }}</span>
                <!-- 状态一律用服务端给的（派生状态），前端不拿时间自己判 -->
                <span class="u-tag coupon-status" :class="statusTagClass(item.status)">
                  {{ item.status_text }}
                </span>
              </div>
              <p class="coupon-scope">{{ item.scope === 'all' ? '全场通用' : '指定范围可用' }}</p>
              <p class="coupon-meta">
                <AppIcon name="clock" />
                <span :class="{ 'is-warning': item.expiring_soon }">{{ expiryText(item) }}</span>
                <span class="coupon-source">{{ item.source_text }}</span>
              </p>
              <p v-if="item.status === 'used' && item.used_order_no" class="coupon-used">
                已用于订单 {{ item.used_order_no }}
              </p>
            </div>

            <div v-if="item.expiring_soon" class="coupon-flag">
              <AppIcon name="alert-triangle" />
              即将过期
            </div>
          </li>
        </ul>

        <!-- 分页：只有一页时不渲染控件（避免出现点不动的按钮） -->
        <div v-if="couponStore.totalPages > 1" class="coupons-pager">
          <button
            type="button"
            class="u-btn"
            :disabled="!couponStore.hasPrev"
            @click="goPage(couponStore.page - 1)"
          >
            上一页
          </button>
          <span class="coupons-pager-info">{{ couponStore.page }} / {{ couponStore.totalPages }}</span>
          <button
            type="button"
            class="u-btn"
            :disabled="!couponStore.hasNext"
            @click="goPage(couponStore.page + 1)"
          >
            下一页
          </button>
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

/* 未登录 / 空态 */
.coupons-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 5);
  text-align: center;
}
.coupons-state-icon {
  font-size: var(--fs-h2);
  color: var(--accent);
}
.coupons-state-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.coupons-state-desc {
  margin: 0;
  color: var(--text-muted);
}

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
.coupons-error {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
  color: var(--danger);
}

/* 券卡片 */
.coupons-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.coupon {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: calc(var(--space-unit) * 2.5);
  align-items: center;
  padding: calc(var(--space-unit) * 2.5);
}
.coupon-amount {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 0.25);
  min-width: calc(var(--space-unit) * 10);
  padding-right: calc(var(--space-unit) * 2.5);
  border-right: var(--stroke-width) dashed var(--border);
}
.coupon-amount-num {
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  line-height: 1;
  color: var(--accent);
}
.coupon-amount-threshold {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.coupon-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}
.coupon-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
}
.coupon-name {
  font-weight: var(--fw-heading);
}
.coupon-scope {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.coupon-meta {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.coupon-meta .is-warning {
  color: var(--warning);
}
.coupon-source {
  margin-left: auto;
}
.coupon-used {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
  font-family: var(--font-mono);
}
/* 已用/已过期：降饱和但保留 —— 用户需要「券去哪了」的答案 */
.coupon.is-used,
.coupon.is-expired {
  opacity: 0.66;
}
.coupon.is-used .coupon-amount-num,
.coupon.is-expired .coupon-amount-num {
  color: var(--text-muted);
}
.coupon-flag {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.25);
  padding: calc(var(--space-unit) * 0.25) var(--space-unit);
  font-size: var(--fs-label);
  color: var(--warning);
  border-left: var(--stroke-width) solid var(--border);
  border-bottom: var(--stroke-width) solid var(--border);
  border-bottom-left-radius: var(--radius-media);
}

/* 分页 */
.coupons-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 2);
}
.coupons-pager-info {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* 窄屏：面额与内容改竖排，避免面额把名称挤成一列字 */
@media (max-width: 575px) {
  .coupon {
    grid-template-columns: 1fr;
    gap: calc(var(--space-unit) * 1.5);
  }
  .coupon-amount {
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-start;
    gap: var(--space-unit);
    min-width: 0;
    padding-right: 0;
    padding-bottom: calc(var(--space-unit) * 1.5);
    border-right: none;
    border-bottom: var(--stroke-width) dashed var(--border);
  }
}
</style>
