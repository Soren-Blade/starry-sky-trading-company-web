<!--
  客服中心 `/support`

  与消息中心 `/mail` 的三处刻意差异（不是遗漏）：

  1. **游客可用**：路由 `requiresAuth: false`。游客登录态同样带 access token 与
     `users.id`，所以「我的会话」这套归属判断对两种身份是同一份代码；服务端
     `/supportApi` 也没挂 `requireRegisteredAccount`（`src/index.js:254` 的注释解释了原因）。
  2. **入口在页脚与帮助弹窗**：游客看不到顶栏信封（站内通知恒空），他们的通道是这里。
  3. **回执号是唯一凭据**：游客丢了登录态就只剩邮件里的回执号，因此提交成功后
     第一件事是把回执号摆到最显眼的位置，并支持 `/support?thread=` 深链回来。

  页面结构：两个页签（提交反馈 / 我的会话），「我的会话」内部再分列表与详情两层。
  文案全部来自 `@/constants/content.js` 的 `SUPPORT`，枚举来自 `@/constants/support.js`。
-->
<template>
  <div class="page-shell page-shell--narrow support-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">{{ SUPPORT.eyebrow }}</p>
      <h1 class="page-shell-title">{{ SUPPORT.title }}</h1>
      <p class="page-shell-desc">{{ SUPPORT.desc }}</p>
    </header>

    <p v-if="!userStore.isLoggedIn" class="page-note page-note--warning support-guest-note">
      {{ SUPPORT.guestNote }}
    </p>

    <div class="u-tabs" role="tablist">
      <button
        v-for="item in SUPPORT_TABS"
        :key="item.value"
        type="button"
        class="u-tab support-tab"
        role="tab"
        :aria-selected="tab === item.value"
        :class="{ 'u-tab--active': tab === item.value }"
        @click="switchTab(item.value)"
      >
        <span>{{ item.label }}</span>
        <span
          v-if="item.value === 'threads' && supportStore.hasThreadsUnread"
          class="support-tab-badge"
          aria-hidden="true"
        >{{ supportStore.threadsUnreadLabel }}</span>
      </button>
    </div>

    <!-- ── 提交反馈 ──────────────────────────────────────────── -->
    <section
      v-if="tab === 'submit'"
      class="u-tabs-content support-panel"
      aria-label="提交反馈"
    >
      <div v-if="supportStore.hasCreated" class="ui-card support-receipt" role="status">
        <p class="support-receipt-title">{{ SUPPORT.receiptTitle }}</p>
        <p class="support-receipt-no">{{ supportStore.createdThreadNo }}</p>
        <p class="support-receipt-hint">{{ SUPPORT.receiptHint }}</p>
        <p class="support-receipt-hint">{{ SUPPORT.receiptMailHint }}</p>
        <p v-if="copyError" class="support-error" role="alert">{{ copyError }}</p>
        <div class="support-actions">
          <button type="button" class="u-btn-secondary" @click="copyReceipt">
            {{ copied ? SUPPORT.copiedReceipt : SUPPORT.copyReceipt }}
          </button>
          <button type="button" class="u-btn-primary" @click="openCreatedThread">
            {{ SUPPORT.viewThread }}
          </button>
          <button type="button" class="u-btn-secondary" @click="submitAnother">
            {{ SUPPORT.submitAnother }}
          </button>
        </div>
      </div>

      <form v-else class="ui-card support-form" novalidate @submit.prevent="handleSubmit">
        <div class="u-field support-field">
          <label class="u-field-label" for="support-category">{{ SUPPORT.categoryLabel }}</label>
          <SelectField
            id="support-category"
            v-model="form.category"
            :options="SUPPORT_CATEGORIES"
            :aria-label="SUPPORT.categoryLabel"
            :disabled="supportStore.creating"
          />
        </div>

        <div class="u-field support-field">
          <label class="u-field-label" for="support-subject">{{ SUPPORT.subjectLabel }}</label>
          <input
            id="support-subject"
            v-model="form.subject"
            class="u-input"
            type="text"
            :maxlength="SUPPORT_LIMITS.subject"
            :placeholder="SUPPORT.subjectPlaceholder"
            :disabled="supportStore.creating"
          />
          <span class="u-field-hint">{{ form.subject.length }} / {{ SUPPORT_LIMITS.subject }}</span>
        </div>

        <div class="u-field support-field">
          <label class="u-field-label" for="support-body">{{ SUPPORT.bodyLabel }}</label>
          <textarea
            id="support-body"
            v-model="form.body"
            class="u-input support-textarea"
            rows="7"
            :maxlength="SUPPORT_LIMITS.body"
            :placeholder="SUPPORT.bodyPlaceholder"
            :disabled="supportStore.creating"
          ></textarea>
          <span class="u-field-hint">{{ form.body.length }} / {{ SUPPORT_LIMITS.body }}</span>
        </div>

        <div class="u-field support-field">
          <label class="u-field-label" for="support-email">{{ SUPPORT.emailLabel }}</label>
          <input
            id="support-email"
            v-model="form.contact_email"
            class="u-input"
            type="email"
            :maxlength="SUPPORT_LIMITS.email"
            :placeholder="SUPPORT.emailPlaceholder"
            :disabled="supportStore.creating"
          />
          <span class="u-field-hint">{{ emailHint }}</span>
        </div>

        <p v-if="validationError" class="support-error" role="alert">{{ validationError }}</p>
        <p v-if="supportStore.createError" class="support-error" role="alert">
          {{ supportStore.createError }}
        </p>
        <p class="page-note support-form-note">{{ SUPPORT.formNote }}</p>

        <div class="support-actions">
          <button type="submit" class="u-btn-primary support-submit" :disabled="supportStore.creating">
            {{ supportStore.creating ? SUPPORT.submitting : SUPPORT.submit }}
          </button>
        </div>
      </form>
    </section>

    <!-- ── 我的会话 ──────────────────────────────────────────── -->
    <section v-else class="u-tabs-content support-panel" aria-label="我的会话">
      <!-- 详情 -->
      <template v-if="supportStore.hasCurrent">
        <div class="support-detail-bar">
          <button type="button" class="u-btn-secondary" @click="closeThread">
            <AppIcon name="chevron-left" />
            {{ SUPPORT.backToList }}
          </button>
          <button
            type="button"
            class="u-btn-secondary"
            :disabled="supportStore.loadingThread"
            @click="refreshThread"
          >
            {{ SUPPORT.refresh }}
          </button>
        </div>

        <div v-if="supportStore.loadingThread" class="support-skeleton" role="status" aria-label="正在加载">
          <span class="u-skeleton u-skeleton--card"></span>
          <span class="u-skeleton u-skeleton--card"></span>
        </div>

        <p v-if="supportStore.threadError" class="support-error" role="alert">
          {{ supportStore.threadError }}
        </p>
        <p v-if="threadMissing" class="support-muted">{{ SUPPORT.threadNotFoundHint }}</p>

        <template v-if="supportStore.current">
          <section class="ui-card support-thread">
            <div class="support-thread-head">
              <h2 class="support-thread-title">{{ supportStore.current.subject }}</h2>
              <span class="u-tag" :class="supportStatusTag(supportStore.current.status)">
                {{ supportStatusLabel(supportStore.current.status) }}
              </span>
            </div>
            <dl class="support-facts">
              <div class="support-fact">
                <dt class="support-fact-key">{{ SUPPORT.factsReceiptNo }}</dt>
                <dd class="support-fact-value support-mono">{{ supportStore.current.thread_no }}</dd>
              </div>
              <div class="support-fact">
                <dt class="support-fact-key">{{ SUPPORT.factsCategory }}</dt>
                <dd class="support-fact-value">{{ supportCategoryLabel(supportStore.current.category) }}</dd>
              </div>
              <div v-if="supportStore.currentEmail" class="support-fact">
                <dt class="support-fact-key">{{ SUPPORT.factsEmail }}</dt>
                <dd class="support-fact-value support-mono">{{ supportStore.currentEmail }}</dd>
              </div>
              <div class="support-fact">
                <dt class="support-fact-key">{{ SUPPORT.factsCreatedAt }}</dt>
                <dd class="support-fact-value">{{ toDateTime(supportStore.current.created_at) || '—' }}</dd>
              </div>
              <div class="support-fact">
                <dt class="support-fact-key">{{ SUPPORT.factsLastMessage }}</dt>
                <dd class="support-fact-value">
                  {{ toDateTime(supportStore.current.last_message_at) || '—' }}
                </dd>
              </div>
            </dl>
          </section>

          <h2 class="support-section-title">
            {{ SUPPORT.detailTitle }}（{{ supportStore.messages.length }}）
          </h2>

          <ol v-if="supportStore.hasMessages" class="support-messages">
            <li
              v-for="item in supportStore.messages"
              :key="item.id"
              class="support-message"
              :class="{
                'support-message--staff': item.author_type === 'staff',
                'support-message--system': item.author_type === 'system',
              }"
            >
              <div class="support-message-head">
                <span class="support-message-author">{{ supportAuthorLabel(item.author_type) }}</span>
                <span class="support-message-source">{{ supportSourceLabel(item.source) }}</span>
                <time class="support-message-time" :datetime="item.created_at || ''">
                  {{ toDateTime(item.created_at) || '—' }}
                </time>
              </div>
              <p class="support-message-body">{{ item.body }}</p>
            </li>
          </ol>
          <p v-else class="support-muted">{{ SUPPORT.noMessages }}</p>

          <form class="ui-card support-reply" novalidate @submit.prevent="handleReply">
            <label class="u-field-label" for="support-reply-body">{{ SUPPORT.replyLabel }}</label>
            <textarea
              id="support-reply-body"
              v-model="replyText"
              class="u-input support-textarea"
              rows="5"
              :maxlength="SUPPORT_LIMITS.message"
              :placeholder="SUPPORT.replyPlaceholder"
              :disabled="supportStore.replying"
            ></textarea>
            <span class="u-field-hint">{{ replyText.length }} / {{ SUPPORT_LIMITS.message }}</span>
            <p class="page-note support-form-note">{{ SUPPORT.replyNote }}</p>
            <p v-if="replyValidation" class="support-error" role="alert">{{ replyValidation }}</p>
            <p v-if="supportStore.replyError" class="support-error" role="alert">
              {{ supportStore.replyError }}
            </p>
            <div class="support-actions">
              <button type="submit" class="u-btn-primary support-submit" :disabled="supportStore.replying">
                {{ supportStore.replying ? SUPPORT.replying : SUPPORT.reply }}
              </button>
              <span v-if="supportStore.replySent" class="support-sent">{{ SUPPORT.replySent }}</span>
            </div>
          </form>
        </template>
      </template>

      <!-- 列表 -->
      <template v-else>
        <div v-if="supportStore.loadingThreads" class="support-skeleton" role="status" aria-label="正在加载">
          <span class="u-skeleton u-skeleton--card"></span>
          <span class="u-skeleton u-skeleton--card"></span>
          <span class="u-skeleton u-skeleton--card"></span>
        </div>

        <template v-else>
          <div class="support-list-head">
            <p class="support-list-count">{{ SUPPORT.listCount(supportStore.threadsTotal) }}</p>
            <button type="button" class="u-btn-secondary" @click="refreshThreads">
              {{ SUPPORT.refresh }}
            </button>
          </div>

          <p v-if="supportStore.threadsError" class="support-error" role="alert">
            {{ supportStore.threadsError }}
          </p>

          <div v-if="!supportStore.hasThreads" class="u-empty support-empty">
            <span class="u-empty-icon"><AppIcon name="headset" /></span>
            <p class="u-empty-title">{{ SUPPORT.listEmptyTitle }}</p>
            <p class="u-empty-desc">{{ SUPPORT.listEmptyDesc }}</p>
            <div class="u-empty-actions">
              <button type="button" class="u-btn-primary" @click="switchTab('submit')">
                {{ SUPPORT.submit }}
              </button>
            </div>
          </div>

          <template v-else>
            <ul class="support-list">
              <li v-for="item in supportStore.threads" :key="item.thread_no" class="ui-card support-item">
                <div class="support-item-head">
                  <span class="u-tag" :class="supportStatusTag(item.status)">
                    {{ supportStatusLabel(item.status) }}
                  </span>
                  <span class="support-item-category">{{ supportCategoryLabel(item.category) }}</span>
                  <time class="support-item-time" :datetime="item.last_message_at || item.created_at || ''">
                    {{ toDateTime(item.last_message_at || item.created_at) || '—' }}
                  </time>
                </div>
                <button type="button" class="support-item-title" @click="openThread(item.thread_no)">
                  <span>{{ item.subject }}</span>
                  <span v-if="item.unread > 0" class="support-dot" aria-hidden="true"></span>
                  <span v-if="item.unread > 0" class="support-sr">有新回复</span>
                </button>
                <div class="support-item-foot">
                  <span class="support-item-no support-mono">{{ item.thread_no }}</span>
                  <span class="support-item-count">
                    {{ SUPPORT.messageCount(item.message_count || 0) }}
                  </span>
                  <button
                    type="button"
                    class="u-btn-secondary support-item-open"
                    @click="openThread(item.thread_no)"
                  >
                    查看
                  </button>
                </div>
              </li>
            </ul>

            <nav
              v-if="supportStore.threadsTotalPages > 1"
              class="support-pager"
              aria-label="会话分页"
            >
              <button
                type="button"
                class="u-btn-secondary support-pager-btn"
                :disabled="!supportStore.threadsHasPrev"
                @click="goThreadsPage(supportStore.threadsPage - 1)"
              >
                上一页
              </button>
              <span class="support-pager-info">
                第 {{ supportStore.threadsPage }} / {{ supportStore.threadsTotalPages }} 页
              </span>
              <button
                type="button"
                class="u-btn-secondary support-pager-btn"
                :disabled="!supportStore.threadsHasNext"
                @click="goThreadsPage(supportStore.threadsPage + 1)"
              >
                下一页
              </button>
            </nav>
          </template>
        </template>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'

import { SUPPORT } from '@/constants/content.js'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_LIMITS,
  SUPPORT_TABS,
  supportAuthorLabel,
  supportCategoryLabel,
  supportSourceLabel,
  supportStatusLabel,
  supportStatusTag,
} from '@/constants/support.js'
import { toDateTime } from '@/hooks/useSimpleTimeFormatter/index.js'
import { useSupportStore } from '@/stores/support.js'
import { useUserStore } from '@/stores/user.js'

const route = useRoute()
const router = useRouter()
const supportStore = useSupportStore()
const userStore = useUserStore()

/** 与服务端 `EMAIL_PATTERN` 同口径的宽松校验：只挡住明显打错的地址 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const tab = ref('submit')

const form = reactive({
  category: SUPPORT_CATEGORIES[0].value,
  subject: '',
  body: '',
  contact_email: '',
})

const validationError = ref('')
const replyText = ref('')
const replyValidation = ref('')
const copied = ref(false)
const copyError = ref('')

/** 会话列表是否拉过（页签来回切不重复请求；下拉「刷新」仍可强制拉） */
const threadsLoaded = ref(false)
/** 详情拉取失败（404 之类），页面据此补一句「回执号抄错一位就找不到」 */
const threadMissing = ref(false)

const emailHint = computed(() => {
  if (!userStore.isLoggedIn) return SUPPORT.emailHintGuest
  return userStore.userInfo?.email ? SUPPORT.emailHintRegistered : SUPPORT.emailHintMissing
})

/** 游客必须填邮箱：他们没有账号邮箱，这是唯一能收到回执与回复的地方 */
const emailRequired = computed(() => !userStore.isLoggedIn)

function validateForm() {
  const subject = form.subject.trim()
  const body = form.body.trim()
  const email = form.contact_email.trim()

  if (!subject) return '请先写一句问题标题'
  if (!body) return '请把问题描述清楚，客服才能定位'
  if (emailRequired.value && !email) return '游客必须填一个能收到信的邮箱'
  if (email && !EMAIL_PATTERN.test(email)) return '邮箱格式看起来不对，请检查一下'
  return ''
}

/** 表单里服务端不认的键不传：省得它把 `contact_email: ''` 也当成一次显式输入 */
function buildPayload() {
  const email = form.contact_email.trim()
  const payload = {
    category: form.category,
    subject: form.subject.trim(),
    body: form.body.trim(),
  }
  if (email) payload.contact_email = email
  return payload
}

async function handleSubmit() {
  validationError.value = validateForm()
  if (validationError.value) return

  const threadNo = await supportStore.createThread(buildPayload())
  if (!threadNo) return

  copied.value = false
  copyError.value = ''
  // 提交成功后列表就脏了（多了一条会话），下次进「我的会话」要重新拉
  threadsLoaded.value = false
}

function submitAnother() {
  supportStore.clearCreated()
  form.subject = ''
  form.body = ''
  validationError.value = ''
  copied.value = false
  copyError.value = ''
}

async function copyReceipt() {
  const no = supportStore.createdThreadNo
  if (!no) return
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('clipboard unavailable')
    }
    await navigator.clipboard.writeText(no)
    copied.value = true
    copyError.value = ''
  } catch {
    // 剪贴板在非 https / 旧浏览器下不可用；不假装成功，让用户手动选中
    copied.value = false
    copyError.value = SUPPORT.copyFailed
  }
}

function switchTab(value) {
  tab.value = value
  if (value === 'threads' && !supportStore.hasCurrent && !threadsLoaded.value) {
    threadsLoaded.value = true
    supportStore.fetchThreads()
  }
}

function goThreadsPage(page) {
  if (page < 1) return
  supportStore.fetchThreads({ page })
}

function refreshThreads() {
  threadsLoaded.value = true
  if (supportStore.hasCurrent) supportStore.fetchThread(supportStore.currentNo)
  else supportStore.fetchThreads({ page: supportStore.threadsPage })
}

function refreshThread() {
  if (supportStore.currentNo) supportStore.fetchThread(supportStore.currentNo)
}

async function openThread(threadNo) {
  const no = String(threadNo || '').trim()
  if (!no) return
  threadMissing.value = false
  const ok = await supportStore.fetchThread(no)
  threadMissing.value = !ok
  if (!ok) return
  // 回执号写进 URL：通知里的 `/support?thread=FB…` 与页面状态是同一种形态
  router.replace({ name: 'Support', query: { thread: no } })
}

function openCreatedThread() {
  const no = supportStore.createdThreadNo
  if (!no) return
  tab.value = 'threads'
  threadsLoaded.value = false
  openThread(no)
}

function closeThread() {
  supportStore.closeThread()
  threadMissing.value = false
  replyText.value = ''
  replyValidation.value = ''
  router.replace({ name: 'Support', query: {} })
  if (!threadsLoaded.value) {
    threadsLoaded.value = true
    supportStore.fetchThreads()
  }
}

async function handleReply() {
  replyValidation.value = replyText.value.trim() ? '' : SUPPORT.replyEmpty
  if (replyValidation.value) return

  const ok = await supportStore.reply(replyText.value.trim())
  if (ok) replyText.value = ''
}

/** 详情深链：`/support?thread=FB…`（站内通知的 link 就是这个形状） */
function applyRouteThread(value) {
  const no = String(value || '').trim()
  if (!no || no === supportStore.currentNo) return
  tab.value = 'threads'
  threadMissing.value = false
  supportStore.fetchThread(no).then((ok) => {
    threadMissing.value = !ok
  })
}

watch(
  () => route.query.thread,
  (value) => applyRouteThread(value)
)

// 账号邮箱可能在页面打开后才到（App.vue 初始化身份是异步的）：到了就补进空着的输入框
watch(
  () => userStore.userInfo?.email,
  (value) => {
    if (!form.contact_email && value) form.contact_email = value
  }
)

// 改了输入就把上一次的报错收起来，避免「改完了报错还挂着」
watch(
  () => [form.subject, form.body, form.contact_email],
  () => {
    if (validationError.value) validationError.value = ''
  }
)

onMounted(() => {
  if (userStore.isLoggedIn && userStore.userInfo?.email) {
    form.contact_email = userStore.userInfo.email
  }
  // 深链优先：通知点进来直接开详情；否则只拉一次列表（游客也拉，列表对游客有意义）
  const deepLink = String(route.query.thread || '').trim()
  if (deepLink) {
    tab.value = 'threads'
    applyRouteThread(deepLink)
    return
  }
  threadsLoaded.value = true
  supportStore.fetchThreads()
})
</script>

<style scoped>
.support-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}

.support-guest-note {
  margin: 0;
}

.support-tab {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
}

.support-tab-badge {
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

.support-panel {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}

.support-field {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
}

.support-form,
.support-reply {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2.5);
}

/* .u-input 是固定高度（--input-height）的单行控件，多行输入要自己定高。
 *
 * 高度**固定**、圆角也**固定**：`--radius-input` 是「单行输入框」的令牌，五套
 * 主题各一档（液态玻璃下是 9999px 全胶囊）。单行框用胶囊很好看，但文本域一长高，
 * 四角就变成夸张的尖胶囊 —— 高度越大越明显。
 * 这里改用卡片档圆角（主题里 12–20px，永远不会退化成胶囊），高度固定 144px，
 * 内容超出时由文本域自己滚动；用户仍可手动向下拖拽（圆角恒定，不会失控）。
 */
.support-textarea {
  height: calc(var(--space-unit) * 18);
  padding-top: calc(var(--space-unit) * 1.25);
  line-height: var(--leading-body);
  border-radius: var(--radius-card);
  resize: vertical;
}

.support-form-note {
  margin: 0;
}

.support-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit));
}

.support-submit {
  min-width: calc(var(--space-unit) * 12);
}

.support-sent {
  font-size: var(--fs-sm);
  color: var(--success);
}

.support-error {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--danger);
}

.support-muted {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.support-mono {
  font-family: var(--font-mono);
}

/* 仅供读屏：未读点的语义由它承担，视觉上只有一个圆点 */
.support-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ── 受理回执 ────────────────────────────────────────────── */
.support-receipt {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2.5);
}

.support-receipt-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.support-receipt-no {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  font-weight: var(--fw-heading);
  letter-spacing: 0.04em;
  color: var(--accent-strong);
  word-break: break-all;
}

.support-receipt-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

/* ── 会话列表 ────────────────────────────────────────────── */
.support-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit));
}

.support-list-count {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.support-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.support-item {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit));
  padding: calc(var(--space-unit) * 2);
}

.support-item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
}

.support-item-category {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.support-item-time {
  margin-left: auto;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.support-item-title {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  padding: 0;
  font-family: var(--font-body);
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  text-align: left;
  background: none;
  border: 0;
  cursor: pointer;
}

.support-item-title:hover {
  color: var(--accent);
}

.support-dot {
  display: inline-block;
  width: calc(var(--space-unit) * 0.75);
  height: calc(var(--space-unit) * 0.75);
  background: var(--danger);
  border-radius: var(--radius-pill);
}

.support-item-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit));
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.support-item-no {
  color: var(--text-secondary);
}

.support-item-count {
  margin-left: auto;
}

.support-item-open {
  flex: none;
}

.support-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
}

.support-pager-info {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.support-pager-btn {
  min-width: calc(var(--space-unit) * 8);
}

/* ── 会话详情 ────────────────────────────────────────────── */
.support-detail-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit));
}

.support-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit));
}

.support-thread {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2.5);
}

.support-thread-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit));
}

.support-thread-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.support-facts {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
}

.support-fact {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit));
  font-size: var(--fs-sm);
}

.support-fact-key {
  flex: none;
  width: calc(var(--space-unit) * 10);
  color: var(--text-muted);
}

.support-fact-value {
  margin: 0;
  color: var(--text-secondary);
  word-break: break-all;
}

.support-section-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.support-messages {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.support-message {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-left: calc(var(--stroke-width) * 3) solid var(--divider);
  border-radius: var(--radius-card);
}

.support-message--staff {
  border-left-color: var(--accent);
}

.support-message--system {
  border-left-color: var(--info);
}

.support-message-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
}

.support-message-author {
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  color: var(--text-primary);
}

.support-message-source,
.support-message-time {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.support-message-time {
  margin-left: auto;
}

.support-message-body {
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 767px) {
  .support-fact-key {
    width: auto;
  }

  .support-item-time {
    margin-left: 0;
  }
}
</style>
