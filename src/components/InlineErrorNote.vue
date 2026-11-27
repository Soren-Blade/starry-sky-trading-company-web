<template>
  <!--
    区块级失败提示（design-partner §6.1 的 E3：一个模块加载失败时替换内容区，
    其它区块保持可用，并给出「重试」这条唯一出路）。

    为什么不是一句红字：
      1) 只说「失败」等于没说 —— 文案必须回答「发生了什么 / 怎么办」；
      2) 技术错误（`Request failed with status code 500`）不该进标题，
         它既长又像故障码裸奔，收进 <details> 供报障时复制即可；
      3) 用户的网络不该被指责 —— 说「我们这边没能连上」而不是「请检查网络」；
      4) 出口至少两个：重试 + 联系客服（弱化为文字链，不抢主操作）。
  -->
  <div class="inline-error" :class="{ 'inline-error--dense': dense }" role="alert">
    <span class="inline-error__icon" aria-hidden="true">
      <span v-if="loading" class="u-spinner u-spinner--sm"></span>
      <AppIcon v-else name="alert-triangle" />
    </span>

    <div class="inline-error__body">
      <p class="inline-error__title">{{ title }}</p>
      <p v-if="hint" class="inline-error__hint">{{ hint }}</p>

      <details v-if="detail" class="inline-error__detail">
        <summary>{{ detailLabel }}</summary>
        <code class="inline-error__code">{{ detail }}</code>
      </details>
    </div>

    <div class="inline-error__actions">
      <button
        type="button"
        class="inline-error__retry"
        :disabled="loading"
        :aria-busy="loading"
        @click="emit('retry')"
      >
        <span v-if="loading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
        <AppIcon v-else name="refresh-cw" />
        <span>{{ loading ? retryingLabel : retryLabel }}</span>
      </button>
      <a v-if="supportHref" class="inline-error__support" :href="supportHref">{{ supportLabel }}</a>
    </div>
  </div>
</template>

<script setup>
/**
 * 通用「区块加载失败」提示。
 *
 * 刻意不接受 `message` 这种「把后端原文直接塞进来」的用法：
 * 标题由调用方给业务语言（`商品加载失败`），技术细节走 `detail` 折进 <details>。
 */
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  /** 业务标题，如「商品加载失败」（调用方从常量取，便于 i18n） */
  title: { type: String, required: true },
  /** 一句「怎么办」，不责怪用户 */
  hint: { type: String, default: '' },
  /** 技术细节（错误原文/请求号），默认折叠 */
  detail: { type: String, default: '' },
  detailLabel: { type: String, default: '查看技术信息' },
  retryLabel: { type: String, default: '重新请求' },
  retryingLabel: { type: String, default: '正在重新请求…' },
  supportLabel: { type: String, default: '联系客服' },
  /** 客服/支持页地址；空字符串则不显示该出口 */
  supportHref: { type: String, default: '/support' },
  /** 请求进行中：按钮禁用 + 图标换 spinner */
  loading: { type: Boolean, default: false },
  /** 紧凑版：用于列表/表格内部的窄区块 */
  dense: { type: Boolean, default: false },
})

const emit = defineEmits(['retry'])
</script>

<style scoped>
.inline-error {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5);
  color: var(--danger);
  background: var(--danger-bg);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--radius-card);
}

.inline-error--dense {
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2);
}

.inline-error__icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 4);
  height: calc(var(--space-unit) * 4);
  font-size: var(--fs-label);
  color: var(--danger);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--radius-pill);
}

.inline-error__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
}

.inline-error__title {
  margin: 0;
  font-size: var(--fs-body);
  font-weight: var(--fw-label);
  line-height: var(--leading-title);
  color: var(--danger);
  overflow-wrap: anywhere;
}

.inline-error__hint {
  margin: 0;
  font-size: var(--fs-label);
  line-height: 1.5;
  color: var(--text-muted);
}

.inline-error__detail {
  margin-top: calc(var(--space-unit) * 0.5);
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.inline-error__detail > summary {
  cursor: pointer;
  text-underline-offset: 3px;
}

.inline-error__code {
  display: block;
  margin-top: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 1) calc(var(--space-unit) * 1.5);
  font-family: var(--font-mono, monospace);
  font-size: var(--fs-label);
  color: var(--text-primary);
  background: var(--bg-surface);
  border-radius: var(--radius-input);
  overflow-wrap: anywhere;
}

.inline-error__actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
}

.inline-error__retry {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  padding: 0;
  font-family: inherit;
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  color: var(--accent);
  background: none;
  border: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.inline-error__retry:hover:not(:disabled) {
  color: var(--accent-strong);
}

.inline-error__retry:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-input);
}

.inline-error__retry:disabled {
  color: var(--disabled-text);
  cursor: progress;
}

.inline-error__support {
  font-size: var(--fs-label);
  color: var(--text-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.inline-error__support:hover {
  color: var(--accent);
}

/* 窄屏：图标与文案并排保留（比整体竖排更省高度），动作区换到下一行铺满 */
@media (max-width: 767px) {
  .inline-error {
    flex-wrap: wrap;
    gap: calc(var(--space-unit) * 1.25);
  }

  .inline-error__actions {
    flex: 1 0 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 575px) {
  .inline-error__actions {
    justify-content: space-between;
  }
}
</style>
