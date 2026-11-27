<template>
  <!--
    取号前的风险确认门禁（4.31.0 重排版）。

    为什么是「模态」而不是页内勾选：这两条提示是**取号的前置条件**，
    不是可选阅读。放在列表旁边时用户会直接滚到账号、跳过风险说明；
    做成遮罩后，页面在确认之前根本不渲染账号，请求也不会发出。

    版式从「一段说明 + 两个色块」改成**编号清单**：
    两条风险各占一格（01 / 02），左上一枚等宽小标号 + 上方一道语义色细线，
    读完一格再读下一格。这样「两件事」是可数的，而不是一段免责声明。
  -->
  <div v-if="!confirmed" class="ec-overlay">
    <div
      ref="modalRef"
      class="ec-dialog ec-dialog--lg risk-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="apple-id-risk-title"
      aria-describedby="apple-id-risk-lead"
    >
      <header class="risk-head">
        <p class="risk-kicker">
          <span class="risk-kicker-dot" aria-hidden="true"></span>
          {{ t('appleId.riskGateKicker') }}
        </p>
        <h2 id="apple-id-risk-title" class="risk-title">{{ t('appleId.riskGateTitle') }}</h2>
        <p id="apple-id-risk-lead" class="risk-lead">{{ t('appleId.riskGateLead') }}</p>
      </header>

      <ol class="risk-list">
        <li class="risk-item risk-item--critical">
          <span class="risk-no" aria-hidden="true">01</span>
          <p class="risk-label">{{ t('appleId.riskBadge') }}</p>
          <p class="risk-item-title">{{ t('appleId.riskTitle') }}</p>
          <p class="risk-text">{{ t('appleId.riskText') }}</p>
        </li>
        <li class="risk-item risk-item--scam">
          <span class="risk-no" aria-hidden="true">02</span>
          <p class="risk-label">{{ t('appleId.scamBadge') }}</p>
          <p class="risk-item-title">{{ t('appleId.scamTitle') }}</p>
          <p class="risk-text">{{ t('appleId.scamText') }}</p>
        </li>
      </ol>

      <div class="risk-actions">
        <RouterLink to="/tool" class="u-btn-secondary risk-back">
          {{ t('appleId.riskGateBack') }}
        </RouterLink>
        <button type="button" class="u-btn-primary risk-confirm" @click="confirm">
          <AppIcon name="check-circle" aria-hidden="true" />
          <span>{{ t('appleId.riskGateConfirm') }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 确认之后才挂载真正的目录：未确认时既没有账号内容，也没有任何请求 -->
  <slot v-else />
</template>

<script setup>
/**
 * 共享 Apple ID 的风险门禁。
 *
 * 两条路径：
 *   桌面（>767px）：每次加载都确认一次 —— 安全提示要反复看见，不能一次点掉永久同意。
 *   移动（≤767px）：确认一次记进 localStorage，之后不再挡 —— 手机上反复弹窗
 *     会直接挡住唯一要做的动作（复制账号），而风险说明已在首次确认时读过。
 */
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useModalA11y } from '@/hooks/useModalA11y'

/** 移动端「已确认」的存储键（桌面端不写，保持每次提示） */
const ACK_KEY = 'sstc.apple-id-risk-ack'
const COMPACT_QUERY = '(max-width: 767px)'

const { t } = useI18n()
const router = useRouter()

const isCompact = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(COMPACT_QUERY).matches

const readAck = () => {
  if (!isCompact()) return false
  try {
    return window.localStorage.getItem(ACK_KEY) === '1'
  } catch {
    // 隐私模式下 localStorage 可能抛错：当作未确认，宁多问一次
    return false
  }
}

const confirmed = ref(readAck())

/** Escape 视为「放弃取号、回工具页」，避免键盘用户被困在弹窗里。
 *  初始焦点给主按钮：缺省会落在弹窗里第一个可聚焦元素（那个「返回工具页」链），
 *  键盘用户一进来就要 Tab 两下才能确认。 */
const { modalRef, activate, deactivate } = useModalA11y({
  close: () => router.push('/tool'),
  auto: false,
  initialFocus: '.risk-confirm',
})

const confirm = () => {
  if (isCompact()) {
    try {
      window.localStorage.setItem(ACK_KEY, '1')
    } catch {
      // 存不进去也能继续用，只是下次还会问
    }
  }
  confirmed.value = true
  deactivate()
}

onMounted(() => {
  if (!confirmed.value) activate()
})
</script>

<style scoped>
/*
 * 弹窗 = 三行节奏：标题组 /（两格）风险清单 / 动作行。
 * 宽屏用 ec-dialog--lg（720px）让两格并排；窄屏让回单列，避免每格只剩 12 个字。
 */
.risk-dialog {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2.5);
  padding: calc(var(--card-padding-lg) * 1.25);
  max-height: calc(100vh - var(--space-unit) * 6);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* ── 标题组 ────────────────────────────────────────────────── */
.risk-head {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
}

.risk-kicker {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--text-muted);
}

/* 一枚红点：把「这是安全检查」放在标题之前，而不是用整块红色标题条抢注意力 */
.risk-kicker-dot {
  width: calc(var(--space-unit) * 0.75);
  height: calc(var(--space-unit) * 0.75);
  background: var(--danger);
  border-radius: var(--radius-pill);
}

.risk-title {
  font-size: var(--fs-h2);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.risk-lead {
  max-width: 44em;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 两条风险：编号清单 ─────────────────────────────────────── */
.risk-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 每格 = 顶部一道语义色线 + 等宽编号，读起来像「检查项」而不是警告横幅 */
.risk-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    'no label'
    'no title'
    'no text';
  column-gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 1.75)
    calc(var(--space-unit) * 1.75);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-top: calc(var(--space-unit) * 0.375) solid currentColor;
  border-radius: var(--radius-panel);
}

.risk-item--critical {
  color: var(--danger);
}

.risk-item--scam {
  color: var(--warning);
}

.risk-no {
  grid-area: no;
  align-self: start;
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  line-height: 1;
  color: currentColor;
  opacity: 0.55;
}

.risk-label {
  grid-area: label;
  margin-bottom: calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: currentColor;
}

.risk-item-title {
  grid-area: title;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.risk-text {
  grid-area: text;
  margin-top: calc(var(--space-unit) * 0.5);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 动作行 ────────────────────────────────────────────────── */
.risk-actions {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
  padding-top: calc(var(--space-unit) * 0.5);
}

/* 主按钮按内容取宽：拉满整行会变成一条横幅，把「次要动作」挤到角落 */
.risk-back.u-btn-secondary {
  flex: 0 0 auto;
  margin-inline-end: auto;
}

.risk-confirm.u-btn-primary {
  flex: 0 0 auto;
  min-width: calc(var(--space-unit) * 26);
}

.risk-confirm :deep(svg) {
  font-size: 1.05em;
}

@media (max-width: 767px) {
  .risk-dialog {
    gap: calc(var(--space-unit) * 2);
    padding: var(--card-padding-lg);
  }

  .risk-title {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }

  /* 手机上两格并排会把每格压成 8 个字一行，改为竖排 */
  .risk-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .risk-item {
    padding: calc(var(--space-unit) * 1.5);
  }

  /* 主按钮独占一行、贴拇指区，次要动作用文字链放到下面 */
  .risk-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .risk-back.u-btn-secondary {
    height: auto;
    padding-inline: 0;
    color: var(--text-secondary);
    background: none;
    border-color: transparent;
    box-shadow: none;
  }
}
</style>
