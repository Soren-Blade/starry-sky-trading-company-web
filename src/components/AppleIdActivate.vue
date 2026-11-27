<template>
  <div class="activate-panel">
    <p class="activate-kicker">{{ t('appleId.activateKicker') }}</p>
    <h2 class="activate-title">{{ t('appleId.activateTitle') }}</h2>
    <p class="activate-lead">{{ t('appleId.activateLead') }}</p>

    <form class="activate-form" @submit.prevent="submit">
      <label class="activate-label" for="apple-id-card-code">
        {{ t('appleId.activateLabel') }}
      </label>
      <div class="activate-row">
        <input
          id="apple-id-card-code"
          v-model="activateCode"
          class="u-input activate-input"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          :placeholder="t('appleId.activatePlaceholder')"
          :aria-invalid="hasError ? 'true' : 'false'"
          :aria-describedby="hasError ? 'apple-id-card-feedback' : undefined"
        />
        <button
          class="u-btn-primary activate-submit"
          type="submit"
          :disabled="activating || !activateCode.trim()"
          :aria-busy="activating"
        >
          {{ activating ? t('appleId.activateSubmitting') : t('appleId.activateSubmit') }}
        </button>
      </div>
    </form>

    <!--
      结果用一行内联文字，不弹 toast：激活成功之后紧接着就是账号列表出现，
      再弹一条「激活成功」会在视觉上和列表抢位置。
    -->
    <p
      v-if="feedback"
      id="apple-id-card-feedback"
      class="activate-feedback"
      :class="{ 'activate-feedback--error': hasError }"
      role="status"
    >
      {{ feedback }}
    </p>

    <p class="activate-buy">
      <!-- 用整页跳转而不是 RouterLink：这是「去下单」的离开动作，
           且 SSR 单测环境没有注册 RouterLink（会渲染成未解析组件）。 -->
      <a class="activate-buy-link" :href="BUY_HREF">
        {{ t('appleId.activateBuy') }}
      </a>
    </p>

    <ul class="activate-notes">
      <li>{{ t('appleId.activateWhere') }}</li>
      <li>{{ t('appleId.activateSafe') }}</li>
    </ul>
  </div>
</template>

<script setup>
/**
 * Apple ID 卡密激活面板（4.33.0）。
 *
 * 只在服务端返回 `TOOL_CARD_REQUIRED` 时出现：那个工具已经改成卡密制，
 * 没有有效权益的账号连数据接口都拿不到（服务端 403，`getAppleIds` 不发出上游请求），
 * 所以这里不是「提示一下」，而是这个工具唯一的入口。
 *
 * 复用 `useKamiActivation` 而不是重写一份提交逻辑：本地校验、服务端报文原样展示、
 * 成功后清理表单与刷新列表这三段分支都在那个 hook 里被单测覆盖过。
 * `selectedToolId` 固定为 Apple ID 的工具 id —— 管理端签发的通用卡（`unused`）
 * 靠它确定要解锁哪个工具；商品卡（`issued`）则由服务端强制用卡上绑定的工具，
 * 传什么都不影响。
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import kamiApi from '@/api/ask/kami.js'
import { useKamiActivation } from '@/hooks/useKamiActivation/index.js'
import { useToolStore } from '@/stores/tool.js'
import { useUserStore } from '@/stores/user.js'

/** Apple ID 工具 id（`tools.tool_slug = 'appleId'`），与 2026-11-27 的迁移同源 */
const TOOL_ID = '5'

/** 卡密商品详情页：由 2026-11-27 的种子脚本创建（product_code = APPLEID-PERM-001） */
const BUY_HREF = '/product/11'

const { t } = useI18n()
const toolStore = useToolStore()
const userStore = useUserStore()

const lastSucceeded = ref(false)

const { activateCode, selectedToolId, activationResult, activating, activate } = useKamiActivation({
  activateCard: (payload) => kamiApi.activateCard(payload),
  getUserId: () => userStore.userId,
  onActivated: async () => {
    lastSucceeded.value = true
    // 先刷新授权（工具页其它卡密制工具也读它），再取账号列表；
    // 列表成功会把 appleIdsGate 清空，本面板随之被列表替换。
    await toolStore.fetchEntitlements()
    await toolStore.fetchAppleIds()
  },
})

selectedToolId.value = TOOL_ID

const hasError = computed(() => {
  if (lastSucceeded.value) return false
  return Boolean(activationResult.value && activationResult.value.success !== true)
})

const feedback = computed(() => {
  const result = activationResult.value
  if (!result) return ''
  if (result.success === true) return t('appleId.activateSuccess')
  return result.message || t('appleId.activateFailed')
})

const submit = () => {
  lastSucceeded.value = false
  activate()
}
</script>

<style scoped>
.activate-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-3);
  padding: var(--card-padding-lg);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.activate-kicker {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--accent-strong);
}

.activate-title {
  font-size: var(--fs-h2);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.activate-lead {
  max-width: 42em;
  font-size: var(--fs-body);
  color: var(--text-secondary);
}

.activate-form {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-2);
  margin-block-start: var(--ec-space-2);
}

.activate-label {
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  color: var(--text-secondary);
}

.activate-row {
  display: flex;
  gap: var(--grid-gap);
  align-items: stretch;
}

.activate-input {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}

.activate-submit {
  flex: none;
}

.activate-feedback {
  font-size: var(--fs-sm);
  color: var(--success);
}

.activate-feedback--error {
  color: var(--danger);
}

.activate-buy {
  font-size: var(--fs-sm);
}

.activate-buy-link {
  color: var(--accent-strong);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.activate-buy-link:hover {
  color: var(--accent);
}

.activate-notes {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-1);
  margin-block-start: var(--ec-space-1);
  padding-block-start: var(--ec-space-2);
  border-block-start: var(--stroke-width) solid var(--divider);
  font-size: var(--fs-label);
  color: var(--text-muted);
}

@media (max-width: 767px) {
  .activate-panel {
    gap: calc(var(--ec-space-3) * 0.9);
    padding: var(--card-padding);
  }

  .activate-title {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }

  /* 窄屏：输入框与按钮各占一行，按钮铺满（拇指区更好点） */
  .activate-row {
    flex-direction: column;
  }

  .activate-submit {
    width: 100%;
  }
}
</style>
