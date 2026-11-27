<template>
  <!--
    取号前的风险确认门禁（4.30.0）。

    为什么是「模态」而不是页内勾选：这两条提示是**取号的前置条件**，
    不是可选阅读。放在列表旁边时用户会直接滚到账号、跳过风险说明；
    做成遮罩后，页面在确认之前根本不渲染账号，请求也不会发出。

    为什么不做成「可以关掉但继续用」：那样等于没有门禁。这里只给
    一个确认动作 + 一个明确的退出（返回工具页），没有「稍后再说」。
  -->
  <div v-if="!confirmed" class="ec-overlay">
    <div
      ref="modalRef"
      class="ec-dialog risk-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="apple-id-risk-title"
      aria-describedby="apple-id-risk-lead"
    >
      <div class="risk-head">
        <span class="risk-icon" aria-hidden="true"><AppIcon name="shield-alert" /></span>
        <h2 id="apple-id-risk-title" class="risk-title">{{ t('appleId.riskGateTitle') }}</h2>
      </div>

      <p id="apple-id-risk-lead" class="risk-lead">{{ t('appleId.riskGateLead') }}</p>

      <ul class="risk-list">
        <li class="risk-item risk-item--critical">
          <p class="risk-kicker">{{ t('appleId.riskBadge') }}</p>
          <p class="risk-item-title">{{ t('appleId.riskTitle') }}</p>
          <p class="risk-text">{{ t('appleId.riskText') }}</p>
        </li>
        <li class="risk-item risk-item--scam">
          <p class="risk-kicker">{{ t('appleId.scamBadge') }}</p>
          <p class="risk-item-title">{{ t('appleId.scamTitle') }}</p>
          <p class="risk-text">{{ t('appleId.scamText') }}</p>
        </li>
      </ul>

      <div class="risk-actions">
        <RouterLink to="/tool" class="u-btn-secondary risk-back">
          {{ t('appleId.riskGateBack') }}
        </RouterLink>
        <button type="button" class="u-btn-primary risk-confirm" @click="confirm">
          {{ t('appleId.riskGateConfirm') }}
        </button>
      </div>

      <p class="risk-foot">{{ t('appleId.riskGateFoot') }}</p>
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
/* 弹窗本体：内容是一段说明 + 两条提示，宽度收在 520px 左右，
   长文按 1.6 行高排，避免手机上变成一整屏的警告色块 */
.risk-dialog {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  padding: var(--card-padding-lg);
  max-height: calc(100vh - var(--space-unit) * 6);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.risk-head {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

.risk-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 5);
  height: calc(var(--space-unit) * 5);
  flex: none;
  color: var(--danger);
  background: var(--danger-bg);
  border-radius: var(--radius-pill);
  font-size: var(--fs-h3);
}

.risk-title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.risk-lead {
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 两条提示沿用目录里原来的语言：左侧一道语义色竖线 + 等宽小字 kicker，
   不叠阴影、不叠边框，颜色只表达「这条属于哪一类风险」 */
.risk-item {
  padding: calc(var(--space-unit) * 1.5);
  border-inline-start: calc(var(--space-unit) * 0.5) solid currentColor;
  border-radius: var(--radius-input);
}

.risk-item--critical {
  color: var(--danger);
  background: var(--danger-bg);
}

.risk-item--scam {
  color: var(--warning);
  background: var(--warning-bg);
}

.risk-kicker {
  margin-bottom: calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: currentColor;
}

.risk-item-title {
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.risk-text {
  margin-top: calc(var(--space-unit) * 0.5);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.risk-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-unit);
}

.risk-back.u-btn-secondary {
  /* 次要动作不抢主按钮的宽度：它只是「我不取了」的出口 */
  flex: 0 0 auto;
}

.risk-confirm.u-btn-primary {
  flex: 1 1 auto;
  min-width: max-content;
}

.risk-foot {
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

@media (max-width: 767px) {
  .risk-dialog {
    padding: var(--card-padding);
    gap: calc(var(--space-unit) * 1.5);
  }

  /* 手机上主按钮独占一行、贴拇指区，次要动作用文字链放到下面 */
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
