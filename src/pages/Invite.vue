<template>
  <div class="page-shell page-shell--narrow invite-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">邀请有礼</p>
      <h1 class="page-shell-title">邀请中心</h1>
      <p class="page-shell-desc">
        好友通过你的链接注册，并在完成第一笔商品订单后，双方各得积分奖励
      </p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="users" class="u-mm-state-icon" />
      <p class="u-mm-state-title">请先登录账号</p>
      <p class="u-mm-state-desc">登录后可查看你的邀请码与邀请记录</p>
      <div class="u-mm-state-actions">
        <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后可参与邀请')">
          立即登录
        </button>
      </div>
    </div>

    <template v-else>
      <!-- 邀请码与链接：链接由服务端拼（它知道站点基址），前端只负责展示与复制 -->
      <section v-if="inviteStore.loadingSummary && !inviteStore.hasSummary" class="ui-card invite-skeleton">
        <span class="u-skeleton invite-skeleton-line"></span>
        <span class="u-skeleton invite-skeleton-line"></span>
      </section>

      <section v-else class="ui-card invite-code-card">
        <div class="invite-code-block">
          <p class="invite-code-label">我的邀请码</p>
          <p class="invite-code-value">{{ inviteStore.inviteCode || '——' }}</p>
          <p class="invite-code-hint">
            邀请码由账号自动生成，注册时填在「邀请码」一栏；也可以直接把链接发给好友
          </p>
        </div>
        <div class="invite-link-block">
          <p class="invite-code-label">邀请链接</p>
          <p class="invite-link-value">{{ inviteStore.inviteLink || '——' }}</p>
          <div class="invite-link-actions">
            <button type="button" class="u-btn-primary" :disabled="!inviteStore.inviteLink" @click="copyLink">
              复制链接
            </button>
            <button type="button" class="u-btn-secondary" :disabled="!inviteStore.inviteCode" @click="copyCode">
              复制邀请码
            </button>
          </div>
        </div>
      </section>

      <!-- 三态计数 + 奖励口径：数值全部来自服务端 -->
      <section class="invite-stats">
        <div class="ui-card invite-stat">
          <p class="invite-stat-num">{{ counts.registered }}</p>
          <p class="invite-stat-label">已注册</p>
        </div>
        <div class="ui-card invite-stat">
          <p class="invite-stat-num">{{ counts.first_order }}</p>
          <p class="invite-stat-label">已完成首单</p>
        </div>
        <div class="ui-card invite-stat">
          <p class="invite-stat-num">{{ counts.expired }}</p>
          <p class="invite-stat-label">已失效</p>
        </div>
      </section>

      <section class="ui-card invite-reward">
        <AppIcon name="gift" class="invite-reward-icon" />
        <p class="invite-reward-text">
          好友完成首单后：你得
          <strong>{{ reward.inviter_points }}</strong> 积分，好友得
          <strong>{{ reward.invitee_points }}</strong> 积分
        </p>
      </section>

      <!-- 进度：满 N 人额外奖励。合计与目标都读服务端，不前端算 -->
      <section v-if="progress.target > 0" class="ui-card invite-progress">
        <div class="invite-progress-head">
          <span>邀请进度</span>
          <span class="invite-progress-count">
            {{ progress.current }} / {{ progress.target }} 人（完成首单）
          </span>
        </div>
        <div class="invite-progress-bar">
          <span class="invite-progress-fill" :style="{ width: `${inviteStore.progressPercent}%` }"></span>
        </div>
        <p class="invite-progress-hint">
          达到 {{ progress.target }} 人额外奖励
          <strong>{{ progress.bonus_points }}</strong> 积分（每个账号只发一次）
        </p>
      </section>

      <!-- 排行榜 -->
      <section v-if="inviteStore.ranking.length" class="ui-card invite-ranking">
        <h2 class="invite-section-title">邀请榜</h2>
        <ul class="invite-ranking-list">
          <li v-for="row in inviteStore.ranking" :key="row.rank" class="invite-ranking-row">
            <span class="invite-ranking-rank">#{{ row.rank }}</span>
            <span class="invite-ranking-label">{{ row.label }}</span>
            <span class="invite-ranking-count">{{ row.count }} 人</span>
          </li>
        </ul>
      </section>

      <!-- 记录：脱敏标签由服务端给出，前端不再加工 -->
      <section class="invite-records">
        <h2 class="invite-section-title">邀请记录</h2>

        <div v-if="inviteStore.loadingRecords && !inviteStore.hasRecords" class="ui-card invite-skeleton">
          <span class="u-skeleton invite-skeleton-line"></span>
        </div>

        <div v-else-if="!inviteStore.hasRecords" class="ui-card u-mm-state">
          <AppIcon name="users" class="u-mm-state-icon" />
          <p class="u-mm-state-title">还没有邀请记录</p>
          <p class="u-mm-state-desc">把上面的链接发给好友，对方注册后这里就会出现</p>
        </div>

        <template v-else>
          <ul class="invite-record-list">
            <li v-for="record in inviteStore.records" :key="`${record.invitee_label}-${record.created_at}`" class="ui-card invite-record">
              <div class="invite-record-main">
                <span class="invite-record-label">{{ record.invitee_label }}</span>
                <span class="invite-record-time">{{ formatDate(record.created_at) }}</span>
              </div>
              <span class="u-tag" :class="{ 'u-tag--accent': record.status === 'first_order' }">
                {{ record.status_text }}
              </span>
              <span class="invite-record-reward" :class="{ 'is-muted': !record.rewarded }">
                {{ record.rewarded ? '已发奖' : '待完成首单' }}
              </span>
            </li>
          </ul>

          <!-- 只有一页时不渲染控件（避免出现点不动的按钮）。
               版式走共享的 .u-mm-pager，与邮件/优惠券/积分/订单等页一致。 -->
          <div v-if="inviteStore.totalPages > 1" class="u-mm-pager">
            <span class="u-mm-pager-info">{{ inviteStore.page }} / {{ inviteStore.totalPages }}</span>
            <div class="u-mm-pager-btns">
              <button
                type="button"
                class="u-btn-secondary"
                :disabled="!inviteStore.hasPrev"
                @click="goPage(inviteStore.page - 1)"
              >
                上一页
              </button>
              <button
                type="button"
                class="u-btn-secondary"
                :disabled="!inviteStore.hasNext"
                @click="goPage(inviteStore.page + 1)"
              >
                下一页
              </button>
            </div>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * 邀请中心（`/invite`）—— 1.6.0
 *
 * 四条纪律：
 *   1. **邀请码与链接一律用服务端返回值**：码由 `uuid` 现算（库里没有这一列），
 *      链接由服务端按站点基址拼好（本地未配基址时是相对路径 `/?invite=CODE`）。
 *      前端补域名一定会与邮件里的链接分叉。
 *   2. **奖励与进度读服务端**：邀请人 500 / 被邀请人 200 / 满 3 人 +500 定义在
 *      库内常量函数里，页面不自己算「还差多少分」。
 *   3. **`invitee_label` 已脱敏**（服务端 `mask_label()`），直接展示，不再加工。
 *   4. **发奖时机是「好友完成首单」而不是「注册」**：因此列表里 `registered`
 *      状态显示「待完成首单」，文案必须与之一致，否则用户会以为奖励丢了。
 */
import { computed, onMounted } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { notify } from '@/hooks/useToast/index.js'
import { useInviteStore } from '@/stores/invite.js'
import { useUserStore } from '@/stores/user.js'
import { copyText } from '@/utils/clipboard.js'

const inviteStore = useInviteStore()
const userStore = useUserStore()

/** 三态计数与奖励都给默认值：首屏还没回来时模板直接读会抛 TypeError */
const counts = computed(() => ({
  registered: inviteStore.counts?.registered ?? 0,
  first_order: inviteStore.counts?.first_order ?? 0,
  expired: inviteStore.counts?.expired ?? 0,
}))
const reward = computed(() => ({
  inviter_points: inviteStore.reward?.inviter_points ?? 0,
  invitee_points: inviteStore.reward?.invitee_points ?? 0,
}))
const progress = computed(() => ({
  current: inviteStore.progress?.current ?? 0,
  target: inviteStore.progress?.target ?? 0,
  bonus_points: inviteStore.progress?.bonus_points ?? 0,
}))

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 复制用共享的 `utils/clipboard.js`（两级策略 + 失败提示），不自己再写一份：
 * 那个模块的存在理由就是「复制失败必须说出来」——`navigator.clipboard` 在非安全上下文
 * 直接不可用，静默失败会让用户以为码已经复制了。
 */
async function copy(value, successText) {
  const result = await copyText(value)
  if (result.ok) notify.success(successText)
  else notify.error(result.message)
}

function copyLink() {
  copy(inviteStore.inviteLink, '邀请链接已复制')
}

function copyCode() {
  copy(inviteStore.inviteCode, '邀请码已复制')
}

function goPage(page) {
  inviteStore.fetchRecords({ page })
}

onMounted(() => {
  if (!userStore.isLoggedIn) return
  inviteStore.fetchSummary()
  inviteStore.fetchRecords()
})
</script>

<style scoped>
.invite-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 空态 —— 容器与文案层走共享分片 .u-mm-state（见 ui-kit-member.css §2） */

/* 骨架 */
.invite-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 3);
}
.invite-skeleton-line {
  display: block;
  height: calc(var(--space-unit) * 4);
  border-radius: var(--radius-media);
}

/* 邀请码 / 链接 */
.invite-code-card {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 4);
  padding: calc(var(--space-unit) * 4);
}
.invite-code-block {
  min-width: calc(var(--space-unit) * 22);
}
.invite-link-block {
  flex: 1 1 calc(var(--space-unit) * 30);
  min-width: 0;
}
.invite-code-label {
  margin: 0;
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}
.invite-code-value {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  font-weight: var(--fw-heading);
  letter-spacing: 0.08em;
  color: var(--accent);
}
.invite-code-hint {
  max-width: 40ch;
  margin: calc(var(--space-unit) * 1.5) 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.invite-link-value {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  word-break: break-all;
  color: var(--text-secondary);
}
.invite-link-actions {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
  margin-top: calc(var(--space-unit) * 2);
}

/* 三态计数 */
.invite-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: calc(var(--space-unit) * 2);
}
.invite-stat {
  padding: calc(var(--space-unit) * 3);
  text-align: center;
}
.invite-stat-num {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  color: var(--text-primary);
}
.invite-stat-label {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* 奖励说明 */
.invite-reward {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 3);
}
.invite-reward-icon {
  font-size: var(--fs-h2);
  color: var(--accent);
}
.invite-reward-text {
  margin: 0;
  color: var(--text-secondary);
}
.invite-reward-text strong {
  font-family: var(--font-mono);
  color: var(--accent);
}

/* 进度 */
.invite-progress {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 3);
}
.invite-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-unit);
  font-weight: var(--fw-label);
}
.invite-progress-count {
  font-family: var(--font-mono);
  color: var(--accent);
}
.invite-progress-bar {
  overflow: hidden;
  height: calc(var(--space-unit) * 1.5);
  background: var(--bg-surface-2);
  border-radius: var(--radius-pill);
}
.invite-progress-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: var(--transition-interactive);
}
.invite-progress-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.invite-progress-hint strong {
  font-family: var(--font-mono);
  color: var(--accent);
}

/* 榜单与记录 */
.invite-section-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-h3);
}
.invite-ranking-list,
.invite-record-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}
.invite-ranking {
  padding: calc(var(--space-unit) * 3);
}
.invite-ranking-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 0.75) 0;
  font-size: var(--fs-sm);
}
.invite-ranking-rank {
  font-family: var(--font-mono);
  color: var(--accent);
}
.invite-ranking-label {
  flex: 1;
  color: var(--text-secondary);
}
.invite-ranking-count {
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.invite-record {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2.5);
}
.invite-record-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  flex: 1;
  min-width: 0;
}
.invite-record-label {
  font-weight: var(--fw-label);
}
.invite-record-time {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.invite-record-reward {
  font-size: var(--fs-sm);
  color: var(--accent);
}
.invite-record-reward.is-muted {
  color: var(--text-muted);
}

@media (max-width: 575px) {
  .invite-stats {
    grid-template-columns: 1fr;
  }
  .invite-code-card {
    flex-direction: column;
    gap: calc(var(--space-unit) * 3);
  }
  .invite-record {
    flex-wrap: wrap;
  }
  .invite-link-actions button {
    width: 100%;
  }
}
</style>
