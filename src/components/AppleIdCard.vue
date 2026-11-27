<template>
  <!-- 卡片本身不可点击（操作都在内部按钮上），因此不加 role/tabindex -->
  <article class="apple-id-card ui-card">
    <!-- 卡头 = 这张「取号单」的标题行：账号是主体，状态只是一个圆点。
         不再显示数据源名（FangQiangNan 这类内部字段对用户零意义，
         而且同线路每张卡都重复一遍，占掉的正是账号该有的位置）。 -->
    <div class="card-head">
      <p class="card-account" :title="account">{{ account }}</p>
      <span class="card-status" :class="statusTone">
        <span class="status-dot" aria-hidden="true"></span>
        <span class="status-text">{{ statusLabel }}</span>
      </span>
    </div>

    <div class="card-body">
      <!-- 密码：值 + 行内显隐。不和账号一样做「标签 + 值」两列 ——
           它只有一段短串，配一行小标签反而把卡片撑成表格 -->
      <div v-if="appleId.password" class="password-row">
        <span class="password-text" :class="{ 'is-masked': !showPassword }">{{ passwordText }}</span>
        <button
          type="button"
          class="password-toggle"
          :aria-label="showPassword ? t('appleId.card.hidePassword') : t('appleId.card.showPassword')"
          :aria-pressed="showPassword"
          @click="togglePasswordVisibility"
        >
          <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
        </button>
      </div>

      <!-- 元信息压成一行：地区 · 相对时间。共用号 30 分钟一轮密码，
           「4 分钟前更新」比「2026/11/27 12:14:42」更能回答「这号还能用吗」 -->
      <p v-if="hasMeta" class="card-meta">
        <span v-if="appleId.country">{{ appleId.country }}</span>
        <span v-if="appleId.country && timeText" class="meta-sep" aria-hidden="true">·</span>
        <span v-if="timeText" :title="absoluteTime">{{ timeText }}</span>
      </p>
    </div>

    <!-- 一主一次：只有「复制账号」是主色。每张卡两个实心主按钮时，
         31 张卡 = 62 个同权重主行动，用户扫不出先点哪个 -->
    <div class="card-actions">
      <button
        type="button"
        class="action-btn action-btn--primary u-btn-primary"
        :aria-label="t('appleId.card.copyAccount', { account })"
        @click="copyText(account, 'appleId.card.copiedAccount')"
      >
        <AppIcon name="clipboard" /><span>{{ t('appleId.card.copyAccountShort') }}</span>
      </button>
      <button
        v-if="appleId.password"
        type="button"
        class="action-btn u-btn-secondary"
        :aria-label="t('appleId.card.copyPassword')"
        @click="copyText(appleId.password, 'appleId.card.copiedPassword')"
      >
        <AppIcon name="key" /><span>{{ t('appleId.card.copyPasswordShort') }}</span>
      </button>
    </div>
  </article>
</template>

<script setup>
/**
 * 单张共享 Apple ID 卡（「取号单」）。
 *
 * 三件事按顺序排：账号（先确认是不是这号）→ 密码（取走）→ 元信息（还新不新）。
 * 卡片外部不再有标签行：账号本身就是标题，密码行内显隐，
 * 地区与更新时间并成一行元信息 —— 原来四行「标签 + 值」把一张卡撑到 250px，
 * 31 张卡就是一屏只能看两张。
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/AppIcon.vue'
import { notify } from '@/hooks/useToast/index.js'
import { getLocale } from '@/i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  /** 服务端返回的单条账号：apple_id / password / country / status / create_time */
  appleId: {
    type: Object,
    required: true,
  },
})

const showPassword = ref(false)

const account = computed(() => props.appleId.apple_id || t('appleId.card.unknown'))

const passwordText = computed(() =>
  showPassword.value ? props.appleId.password : '••••••••'
)

/** 状态：正常走成功色，其余（含缺失字段）一律按「需要换一个」处理 —— 宁可信其坏 */
const isHealthy = computed(() => props.appleId.status === '正常')

const statusLabel = computed(() => {
  const raw = props.appleId.status
  if (!raw) return t('appleId.card.unknown')
  return isHealthy.value ? t('appleId.card.statusOk') : raw
})

const statusTone = computed(() =>
  isHealthy.value ? 'card-status--ok' : 'card-status--bad'
)

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 绝对时间（悬停提示 + 未知相对时间时的兜底） */
const absoluteTime = computed(() => {
  const date = parseDate(props.appleId.create_time)
  if (!date) return ''
  return date.toLocaleString(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

/**
 * 相对时间：一小时内给分钟，一天内给小时，一周内给天，更早直接给日期。
 * 解析失败时退回服务端原文，绝不让卡片空着。
 */
const timeText = computed(() => {
  const raw = props.appleId.create_time
  if (!raw) return ''
  const date = parseDate(raw)
  if (!date) return String(raw)

  const diff = Math.max(0, Date.now() - date.getTime())
  if (diff < MINUTE) return t('appleId.card.justNow')
  if (diff < HOUR) {
    return t('appleId.card.updatedAgo', { time: t('appleId.card.minutesAgo', { n: Math.floor(diff / MINUTE) }) })
  }
  if (diff < DAY) {
    return t('appleId.card.updatedAgo', { time: t('appleId.card.hoursAgo', { n: Math.floor(diff / HOUR) }) })
  }
  if (diff < 7 * DAY) {
    return t('appleId.card.updatedAgo', { time: t('appleId.card.daysAgo', { n: Math.floor(diff / DAY) }) })
  }
  return t('appleId.card.updatedAgo', {
    time: date.toLocaleDateString(getLocale(), { month: '2-digit', day: '2-digit' }),
  })
})

const hasMeta = computed(() => Boolean(props.appleId.country || timeText.value))

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * 复制到剪贴板。
 *
 * navigator.clipboard 只在安全上下文可用；本地/内网 http 访问时为 undefined，
 * 因此保留 textarea + execCommand 的降级分支（与订单页同一套兜底）。
 * 提示文案按「复制的是账号还是密码」分开：连续点两张卡的按钮时，
 * 「已复制到剪贴板」无法回答用户刚复制走的到底是哪一段。
 */
async function copyText(text, messageKey) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', '')
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
  notify.success(t(messageKey))
}
</script>

<style scoped>
/* 外壳（表面/边框/圆角/阴影）来自 global.css 的 .ui-card。
   卡片**不可点击**，所以关掉 .ui-card 的悬停上浮 —— 那是「能点开」的假反馈。
   选择器带上 .ui-card 是为了压过共享类里同等权重的那条 hover 规则。 */
.apple-id-card.ui-card {
  gap: 0;
  padding: var(--card-padding);
}

.apple-id-card.ui-card:hover {
  transform: none;
  border-color: var(--border);
  box-shadow: var(--shadow-card);
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

/* 账号：等宽字体逐字可核对（o/0、l/1 不混），也是这张卡唯一的「标题」 */
.card-account {
  min-width: 0;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-status {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: calc(var(--space-unit) * 0.5);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  line-height: var(--leading-title);
  color: var(--text-muted);
}

.card-status--ok {
  color: var(--success);
}

.card-status--bad {
  color: var(--danger);
}

/* 圆点用 currentColor，深色/浅色主题下跟随语义色自动换算 */
.status-dot {
  width: calc(var(--space-unit) * 0.75);
  height: calc(var(--space-unit) * 0.75);
  background: currentColor;
  border-radius: var(--radius-pill);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  margin-top: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

.password-row {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
  min-width: 0;
}

.password-text {
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 掩码点用等宽 + 中性掩码色：不写死颜色，与其他脱敏位置（卡密、邮箱）一致 */
.is-masked {
  letter-spacing: var(--tracking-label);
  color: var(--ec-code-mask);
}

.password-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: calc(var(--space-unit) * 3);
  height: calc(var(--space-unit) * 3);
  margin-inline-start: calc(var(--space-unit) * -0.5);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  background: none;
  border: 0;
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: color var(--transition-interactive), background-color var(--transition-interactive);
}

.password-toggle:hover {
  color: var(--accent);
  background: var(--bg-soft);
}

.password-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

.meta-sep {
  color: var(--text-muted);
}

/* 操作区不需要分隔线：卡片已在视觉上被裁成「上信息 / 下动作」两块，
   再加一条边框会和卡片本身的边框抢层级 */
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-unit);
  margin-top: calc(var(--space-unit) * 2);
}

.action-btn {
  /* min-width:max-content + wrap：中文「复制账号 / 复制密码」并排；
     英文等长语种放不下时各占一整行，而不是被压扁到互相盖住 */
  flex: 1 1 auto;
  min-width: max-content;
  padding-inline: calc(var(--space-unit) * 1.5);
}

/* 窄屏：一主一次仍并排（纵向堆叠会把卡撑高 40px，31 张卡多出 1200px 滚动） */
@media (max-width: 767px) {
  .apple-id-card.ui-card {
    padding: calc(var(--card-padding) * var(--mobile-padding-scale));
  }

  .card-account {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .password-text {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .action-btn {
    padding-inline: var(--space-unit);
    font-size: calc(var(--fs-body) * var(--mobile-control-scale));
  }
}
</style>
