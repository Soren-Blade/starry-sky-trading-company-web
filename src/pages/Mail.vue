<template>
  <div class="page-shell page-shell--narrow mail-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">账号</p>
      <h1 class="page-shell-title">消息中心</h1>
      <p class="page-shell-desc">
        订单、会员、积分与客服的动态都记在这里。邮件只是同一批通知的另一条投递通道，
        关掉它不会影响这里的记录。
      </p>
    </header>

    <!--
      游客分支：路由守卫（requiresAuth）本来就把游客挡住了，正常路径下走不到这里。
      保留它是因为「退出登录时正停在本页」这一瞬间：store 清了、守卫不会再跑，
      页面若直接渲染列表就会闪一下别人的数据。这里给一个明确的说明而不是空白。
    -->
    <section v-if="!userStore.isLoggedIn" class="u-empty mail-guest">
      <span class="u-empty-icon"><AppIcon name="mail" /></span>
      <p class="u-empty-title">消息中心只对注册用户开放</p>
      <p class="u-empty-desc">
        游客可以浏览、可以提交反馈并和客服对话，但不会收到任何通知邮件。
        登录后这里会显示订单、会员、积分的动态。
      </p>
      <div class="u-empty-actions">
        <button
          type="button"
          class="u-btn-primary"
          @click="userStore.openLoginModal('登录后可以查看消息中心')"
        >
          登录 / 注册
        </button>
      </div>
    </section>

    <template v-else>
      <div class="u-tabs" role="tablist" aria-label="消息中心分区">
        <button
          v-for="item in MAIL_TABS"
          :key="item.value"
          type="button"
          role="tab"
          class="u-tab"
          :class="{ 'u-tab--active': tab === item.value }"
          :aria-selected="tab === item.value ? 'true' : 'false'"
          @click="tab = item.value"
        >
          {{ item.label }}
          <span
            v-if="item.value === 'messages' && mailStore.hasUnread"
            class="mail-tab-badge"
            aria-hidden="true"
          >
            {{ mailStore.unreadLabel }}
          </span>
        </button>
      </div>

      <!-- ── 站内通知 ─────────────────────────────────────────── -->
      <section v-if="tab === 'messages'" class="u-tabs-content mail-panel">
        <div class="mail-panel-head">
          <p class="mail-panel-count">
            共 {{ mailStore.total }} 条
            <span v-if="mailStore.hasUnread">，其中 {{ mailStore.unreadCount }} 条未读</span>
          </p>
          <button
            type="button"
            class="u-btn-secondary mail-action"
            :disabled="!mailStore.hasUnread || mailStore.marking"
            @click="markAll"
          >
            {{ mailStore.marking ? '处理中…' : '全部标为已读' }}
          </button>
        </div>

        <p v-if="mailStore.messagesError" class="mail-error" role="alert">
          {{ mailStore.messagesError }}
        </p>

        <div v-if="mailStore.loadingMessages" class="mail-skeleton" role="status" aria-label="正在加载">
          <span class="u-skeleton u-skeleton--card"></span>
          <span class="u-skeleton u-skeleton--card"></span>
          <span class="u-skeleton u-skeleton--card"></span>
        </div>

        <div v-else-if="!mailStore.hasMessages" class="u-empty">
          <span class="u-empty-icon"><AppIcon name="mail" /></span>
          <p class="u-empty-title">还没有通知</p>
          <p class="u-empty-desc">下单、开通会员、签到之后，这里会出现对应的记录。</p>
        </div>

        <ul v-else class="u-mm-mail-list">
          <li
            v-for="item in mailStore.list"
            :key="item.id"
            class="u-mm-mail-item"
            :class="{ 'u-mm-mail-item--unread': !item.is_read }"
          >
            <div class="u-mm-mail-head">
              <span class="u-tag" :class="levelTag(item.level)">{{ levelLabel(item.level) }}</span>
              <span class="u-mm-mail-type">{{ typeLabel(item.type) }}</span>
              <time class="u-mm-mail-time" :datetime="item.created_at || ''">
                {{ formatTime(item.created_at) }}
              </time>
            </div>

            <p class="u-mm-mail-title">
              <span v-if="!item.is_read" class="u-mm-mail-dot" aria-hidden="true"></span>
              {{ item.title }}
            </p>
            <p v-if="item.body" class="u-mm-mail-body">{{ item.body }}</p>

            <div class="u-mm-mail-foot">
              <router-link v-if="item.link" class="u-mm-mail-link" :to="item.link">
                查看详情
              </router-link>
              <button
                v-if="!item.is_read"
                type="button"
                class="mail-item-mark"
                :disabled="mailStore.marking"
                @click="markOne(item.id)"
              >
                标为已读
              </button>
            </div>
          </li>
        </ul>

        <nav v-if="mailStore.totalPages > 1" class="u-mm-pager" aria-label="通知分页">
          <span class="u-mm-pager-info">
            第 {{ mailStore.page }} / {{ mailStore.totalPages }} 页
          </span>
          <div class="u-mm-pager-btns">
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="!mailStore.hasPrev || mailStore.loadingMessages"
              @click="goMessagesPage(mailStore.page - 1)"
            >
              上一页
            </button>
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="!mailStore.hasNext || mailStore.loadingMessages"
              @click="goMessagesPage(mailStore.page + 1)"
            >
              下一页
            </button>
          </div>
        </nav>
      </section>

      <!-- ── 通知偏好 ─────────────────────────────────────────── -->
      <section v-else-if="tab === 'preferences'" class="u-tabs-content mail-panel">
        <p class="mail-panel-lead">
          邮件只用于<strong>通知、反馈回执与客服回复</strong>。
          登录验证、密码重置这类安全邮件不在本页控制 ——
          平台目前也不通过邮件提供找回账号的能力。
        </p>

        <div class="u-mm-account">
          <div class="u-mm-account-main">
            <span class="u-mm-account-label">通知邮箱</span>
            <span v-if="mailStore.emailConfigured" class="u-mm-account-value">
              {{ mailStore.emailMasked }}
            </span>
            <span v-else class="u-mm-account-value u-mm-account-value--missing">
              还没有填邮箱，邮件通知无法送达（站内通知不受影响）
            </span>
          </div>
          <router-link :to="{ name: 'Profile' }" class="u-btn-secondary">去填写</router-link>
        </div>

        <p class="mail-panel-hint">站内通知始终保留，不受下面的开关影响。</p>

        <p v-if="mailStore.preferencesError" class="mail-error" role="alert">
          {{ mailStore.preferencesError }}
        </p>

        <div v-if="mailStore.loadingPreferences" class="mail-skeleton" role="status" aria-label="正在加载">
          <span class="u-skeleton u-skeleton--card"></span>
          <span class="u-skeleton u-skeleton--card"></span>
        </div>

        <ul v-else class="u-mm-pref-list">
          <li
            v-for="item in PREFERENCE_ITEMS"
            :key="item.key"
            class="u-mm-pref"
            :class="{ 'mail-pref--master': item.master }"
          >
            <div class="u-mm-pref-main">
              <span class="u-mm-pref-name">{{ item.label }}</span>
              <span class="u-mm-pref-desc">{{ item.desc }}</span>
            </div>
            <label class="u-switch" :aria-label="item.label" :aria-checked="draft[item.key] ? 'true' : 'false'">
              <input
                type="checkbox"
                :checked="Boolean(draft[item.key])"
                :disabled="mailStore.savingPreferences"
                @change="draft[item.key] = $event.target.checked"
              />
              <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
            </label>
          </li>
        </ul>

        <div class="mail-panel-foot">
          <button
            type="button"
            class="u-btn-primary"
            :disabled="!preferencesDirty || mailStore.savingPreferences"
            @click="savePreferences"
          >
            {{ mailStore.savingPreferences ? '保存中…' : '保存偏好' }}
          </button>
          <span v-if="mailStore.savingPreferences" class="mail-foot-hint">正在提交…</span>
          <span v-else-if="preferencesDirty" class="mail-foot-hint">有未保存的修改</span>
          <span v-else class="mail-foot-hint mail-foot-hint--muted">已与账号同步</span>
        </div>
      </section>

      <!-- ── 邮件记录 ─────────────────────────────────────────── -->
      <section v-else class="u-tabs-content mail-panel">
        <p class="mail-panel-lead">
          这里记录系统发给你的每一封邮件。只有状态与时间，没有正文，也没有收件地址。
        </p>

        <div class="u-mm-stat-grid">
          <div class="u-mm-stat">
            <span class="u-mm-stat-num">{{ mailStore.logStats.queued }}</span>
            <span class="u-mm-stat-label">排队中</span>
          </div>
          <div class="u-mm-stat u-mm-stat--success">
            <span class="u-mm-stat-num">{{ mailStore.logStats.sent }}</span>
            <span class="u-mm-stat-label">已发送</span>
          </div>
          <div class="u-mm-stat u-mm-stat--danger">
            <span class="u-mm-stat-num">{{ mailStore.logStats.failed }}</span>
            <span class="u-mm-stat-label">发送失败</span>
          </div>
        </div>

        <p v-if="mailStore.logError" class="mail-error" role="alert">{{ mailStore.logError }}</p>

        <div v-if="mailStore.loadingLog" class="mail-skeleton" role="status" aria-label="正在加载">
          <span class="u-skeleton u-skeleton--card"></span>
          <span class="u-skeleton u-skeleton--card"></span>
        </div>

        <div v-else-if="!mailStore.log.length" class="u-empty">
          <span class="u-empty-icon"><AppIcon name="mail" /></span>
          <p class="u-empty-title">还没有发出过邮件</p>
          <p class="u-empty-desc">开启邮件通知后，下单、开通会员等操作都会在这里留下一条记录。</p>
        </div>

        <table v-else class="mail-log">
          <caption class="mail-log-caption">共 {{ mailStore.logTotal }} 封</caption>
          <thead>
            <tr>
              <th scope="col">邮件</th>
              <th scope="col">状态</th>
              <th scope="col">尝试</th>
              <th scope="col">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in mailStore.log" :key="row.id">
              <td class="u-mm-log-name">{{ row.template_name || row.template_code }}</td>
              <td>
                <span class="u-tag" :class="statusTag(row.status)">
                  {{ statusLabel(row.status) }}
                </span>
              </td>
              <td class="u-mm-log-attempts">{{ row.attempts }}</td>
              <td class="u-mm-log-time">
                {{ formatTime(row.sent_at || row.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>

        <nav v-if="mailStore.logTotalPages > 1" class="u-mm-pager" aria-label="邮件记录分页">
          <span class="u-mm-pager-info">
            第 {{ mailStore.logPage }} / {{ mailStore.logTotalPages }} 页
          </span>
          <div class="u-mm-pager-btns">
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="!mailStore.hasLogPrev || mailStore.loadingLog"
              @click="goLogPage(mailStore.logPage - 1)"
            >
              上一页
            </button>
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="!mailStore.hasLogNext || mailStore.loadingLog"
              @click="goLogPage(mailStore.logPage + 1)"
            >
              下一页
            </button>
          </div>
        </nav>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { useMailStore } from '@/stores/mail'
import { useUserStore } from '@/stores/user'
import {
  MAIL_TABS,
  NOTIFICATION_LEVELS,
  PREFERENCE_ITEMS,
  PREFERENCE_KEYS,
  mailLogStatusLabel,
  mailLogStatusTag,
  notificationTypeLabel,
} from '@/constants/mail.js'

const mailStore = useMailStore()
const userStore = useUserStore()

const tab = ref('messages')

/** 页签是否已经拉过一次数据：懒加载，避免进页面就打三个请求 */
const loadedTabs = reactive({ preferences: false, log: false })

/**
 * 偏好草稿。
 *
 * 拨开关**不立即发请求**：一次改三项就会打三次接口，而且中途失败会留下
 * 「界面上开着、服务端关着」的不一致。改成点了保存才提交差异项。
 *
 * 键名从 `PREFERENCE_KEYS` 生成 —— 这里再抄一遍六个键，就会出现
 * 「常量加了第七个开关、页面草稿没有它」（该开关永远存不下去，且不报错）。
 */
const draft = reactive(
  Object.fromEntries(PREFERENCE_KEYS.map((key) => [key, false]))
)

/** 草稿与已保存值是否有差异 */
const preferencesDirty = computed(() =>
  PREFERENCE_ITEMS.some(
    (item) => Boolean(draft[item.key]) !== Boolean(mailStore.preferences?.[item.key])
  )
)

function syncDraft() {
  for (const item of PREFERENCE_ITEMS) {
    draft[item.key] = Boolean(mailStore.preferences?.[item.key])
  }
}

/** 级别 → 标签文案；认不出的级别落回「提示」，不显示英文键 */
function levelLabel(level) {
  return NOTIFICATION_LEVELS[level]?.label || NOTIFICATION_LEVELS.info.label
}

/** 级别 → `.u-tag--*` 变体；认不出的级别落回 info（该变体在共享样式里有定义） */
function levelTag(level) {
  return NOTIFICATION_LEVELS[level]?.tag || NOTIFICATION_LEVELS.info.tag
}

function typeLabel(type) {
  return notificationTypeLabel(type)
}

function statusLabel(status) {
  return mailLogStatusLabel(status)
}

function statusTag(status) {
  return mailLogStatusTag(status)
}

/**
 * 时间格式化。
 *
 * 后端下发 ISO 字符串；这里按浏览器本地时区展示（用户看到的就该是自己的时间）。
 * 值缺失或解析失败时返回空串，让 `<time>` 退化成一行空白，而不是 "Invalid Date"。
 */
function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function loadMessages(page) {
  await mailStore.fetchMessages(page ? { page } : undefined)
}

async function loadPreferences() {
  await mailStore.fetchPreferences()
  syncDraft()
}

async function loadLog(page) {
  await mailStore.fetchMailLog(page ? { page } : undefined)
}

function goMessagesPage(page) {
  if (page < 1 || page > mailStore.totalPages) return
  loadMessages(page)
}

function goLogPage(page) {
  if (page < 1 || page > mailStore.logTotalPages) return
  loadLog(page)
}

async function markAll() {
  await mailStore.markRead(null)
}

async function markOne(id) {
  await mailStore.markRead([id])
}

async function savePreferences() {
  const patch = {}
  for (const item of PREFERENCE_ITEMS) {
    const next = Boolean(draft[item.key])
    if (next !== Boolean(mailStore.preferences?.[item.key])) patch[item.key] = next
  }
  if (!Object.keys(patch).length) return

  const saved = await mailStore.savePreferences(patch)
  // 保存成功后以服务端返回值为准重新对齐草稿：服务端可能收敛了值
  if (saved) syncDraft()
}

watch(tab, (value) => {
  if (value === 'preferences' && !loadedTabs.preferences) {
    loadedTabs.preferences = true
    loadPreferences()
  }
  if (value === 'log' && !loadedTabs.log) {
    loadedTabs.log = true
    loadLog()
  }
})

onMounted(() => {
  // 游客由上面的说明块接管；未登录时不发请求（/mailApi 会回 403）
  if (!userStore.isLoggedIn) return
  // 未读数由 App.vue 统一维护，这里只拉列表（列表响应里也带着 unread）
  loadMessages()
})
</script>

<style scoped>
/* ── 页签角标 ──────────────────────────────────────────────
 * 规格与顶栏购物车/会员角标完全一致（同一套 --space-unit 倍数、同一个
 * --micro-badge-radius、同一种等宽数字），这样「顶栏一个 3、页签里也是 3」
 * 看起来是同一个东西，而不是两处各自发明的圆角。 */
.mail-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(var(--space-unit) * 2.5);
  height: calc(var(--space-unit) * 2.5);
  padding: 0 calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  line-height: 1;
  color: var(--text-on-accent);
  background: var(--danger);
  border-radius: var(--micro-badge-radius);
}

/* ── 面板通用 ────────────────────────────────────────────── */
.mail-panel {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}

.mail-panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
  align-items: center;
  justify-content: space-between;
}

.mail-panel-count {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.mail-panel-lead,
.mail-panel-hint {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.mail-panel-hint {
  color: var(--text-muted);
}

.mail-panel-lead strong {
  color: var(--text-primary);
}

.mail-panel-foot {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
  align-items: center;
}

.mail-foot-hint {
  font-size: var(--fs-sm);
  color: var(--warning);
}

.mail-foot-hint--muted {
  color: var(--text-muted);
}

.mail-error {
  margin: 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  color: var(--danger);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--radius-card);
}

.mail-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
}

/* ── 通知列表 ────────────────────────────────────────────── */
/* 列表与条目见 ui-kit-member.css §20 的 .u-mm-mail-*；
   这里只剩「标为已读」这个页面自己的动作（分片只定义了链接样式） */
.mail-item-mark {
  padding: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  cursor: pointer;
  background: none;
  border: none;
}

.mail-item-mark:hover:not(:disabled) {
  text-decoration: underline;
}

.mail-item-mark:disabled {
  cursor: not-allowed;
  opacity: var(--state-disabled-opacity);
}

/* ── 分页：见 ui-kit-member.css §4 的 .u-mm-pager ─────────── */

/* ── 通知偏好 ────────────────────────────────────────────── */
/* 偏好行与邮箱卡见 §21 / §22；这里只留「总开关」这一条页内语义：
   它是「全部邮件」的闸门、不是并列的第六项 —— 分片的行只有底部分隔线，
   所以这里把总开关下面那条线加粗成强调色，并在它与分项之间多留一点间距 */
.mail-pref--master {
  margin-bottom: calc(var(--space-unit) * 1);
  border-bottom: calc(var(--stroke-width) * 2) solid var(--accent);
}

/* ── 邮件记录 ────────────────────────────────────────────── */
/* 三张统计卡见 §23 的 .u-mm-stat-*（卡面中性、语义色只作用于数字） */

.mail-log {
  width: 100%;
  overflow: hidden;
  font-size: var(--fs-sm);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-collapse: collapse;
  border-radius: var(--radius-card);
}

.mail-log-caption {
  padding: calc(var(--space-unit) * 1) 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
  text-align: left;
  caption-side: top;
}

.mail-log th,
.mail-log td {
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  text-align: left;
  border-bottom: var(--stroke-width) solid var(--divider);
}

.mail-log th {
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--text-muted);
}

.mail-log tr:last-child td {
  border-bottom: none;
}

/* 台账单元格（模板名 / 尝试次数 / 时间）见 §24 的 .u-mm-log-* */

.mail-guest {
  margin-top: calc(var(--space-unit) * 3);
}
</style>
