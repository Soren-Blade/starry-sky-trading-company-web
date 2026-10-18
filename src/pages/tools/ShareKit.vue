<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="share" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">标题</label>
        <input v-model="shareTitle" type="text" class="u-input" placeholder="输入分享标题" />
      </div>
      <div class="u-field">
        <label class="u-field-label">描述</label>
        <textarea v-model="shareDesc" class="u-input" rows="2" placeholder="输入分享描述"></textarea>
      </div>
      <div class="u-field">
        <label class="u-field-label">链接</label>
        <input v-model="shareUrl" type="text" class="u-input" placeholder="https://..." />
      </div>
      <div class="u-field">
        <label class="u-field-label">卡片模板</label>
        <SelectField v-model="shareTemplate" :options="shareTemplates" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="share">
        <template v-if="result">
          <div class="share-preview-wrapper">
            <div class="share-preview-label">预览</div>
            <div class="share-card" :class="`share-card--${shareTemplate}`">
              <div class="share-card-icon">
                <AppIcon name="link" aria-hidden="true" />
              </div>
              <div class="share-card-content">
                <div class="share-card-title">{{ shareTitle || '未命名' }}</div>
                <div class="share-card-desc">{{ shareDesc || '暂无描述' }}</div>
                <div class="share-card-url">{{ shareUrl || 'https://...' }}</div>
              </div>
            </div>
          </div>
          <pre class="tool-preview" style="margin-top:calc(var(--space-unit)*2);">{{ result }}</pre>
        </template>
        <template #actions><button type="button" class="u-btn-primary" :disabled="!result" @click="copy">{{ copyLabel }}</button></template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note"><AppIcon name="alert-triangle" /> {{ PAGE.asideNotice }}</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/net/share']
const shareTitle = ref('')
const shareDesc = ref('')
const shareUrl = ref('')
const shareTemplate = ref('simple')
const result = ref('')
const copyState = ref('idle')

const shareTemplates = [
  { label: '简约', value: 'simple' },
  { label: '科技', value: 'tech' },
  { label: '自然', value: 'nature' },
]

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function getCardStyles(template) {
  const styles = {
    simple: `
.share-card {
  display: flex; gap: 12px; padding: 16px;
  background: #ffffff; border: 1px solid #e5e7eb;
  border-radius: 12px; max-width: 400px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.share-card-icon { flex-shrink: 0; width: 48px; height: 48px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.share-card-icon svg { width: 24px; height: 24px; color: #6b7280; }
.share-card-content { min-width: 0; flex: 1; }
.share-card-title { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.share-card-desc { font-size: 14px; color: #6b7280; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.share-card-url { font-size: 12px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`,
    tech: `
.share-card {
  display: flex; gap: 12px; padding: 16px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155; border-radius: 12px;
  max-width: 400px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.share-card-icon { flex-shrink: 0; width: 48px; height: 48px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; }
.share-card-icon svg { width: 24px; height: 24px; color: #38bdf8; }
.share-card-content { min-width: 0; flex: 1; }
.share-card-title { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.share-card-desc { font-size: 14px; color: #94a3b8; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.share-card-url { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`,
    nature: `
.share-card {
  display: flex; gap: 12px; padding: 16px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 1px solid #a7f3d0; border-radius: 12px;
  max-width: 400px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.share-card-icon { flex-shrink: 0; width: 48px; height: 48px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; }
.share-card-icon svg { width: 24px; height: 24px; color: #059669; }
.share-card-content { min-width: 0; flex: 1; }
.share-card-title { font-size: 16px; font-weight: 600; color: #064e3b; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.share-card-desc { font-size: 14px; color: #065f46; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.share-card-url { font-size: 12px; color: #047857; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`,
  }
  return styles[template] || styles.simple
}

function process() {
  const html = `<div class="share-card">
  <div class="share-card-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  </div>
  <div class="share-card-content">
    <div class="share-card-title">${escapeHtml(shareTitle.value || '未命名')}</div>
    <div class="share-card-desc">${escapeHtml(shareDesc.value || '暂无描述')}</div>
    <div class="share-card-url">${escapeHtml(shareUrl.value || 'https://...')}</div>
  </div>
</div>
<style>${getCardStyles(shareTemplate.value)}</style>`
  result.value = html
  copyState.value = 'idle'
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function clear() { shareTitle.value = ''; shareDesc.value = ''; shareUrl.value = ''; shareTemplate.value = 'simple'; result.value = ''; copyState.value = 'idle' }
async function copy() { if (!result.value) return; try { await navigator.clipboard.writeText(result.value); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' } }
</script>

<style scoped>
.share-preview-wrapper { margin-bottom: calc(var(--space-unit) * 2); }
.share-preview-label { font-size: var(--fs-label); color: var(--text-secondary); margin-bottom: calc(var(--space-unit)); text-transform: uppercase; letter-spacing: 0.05em; }

.share-card { display: flex; gap: 12px; padding: 16px; border-radius: 12px; max-width: 400px; font-family: var(--font-body); }
.share-card-icon { flex-shrink: 0; width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.share-card-icon svg { width: 24px; height: 24px; }
.share-card-content { min-width: 0; flex: 1; }
.share-card-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.share-card-desc { font-size: 14px; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.share-card-url { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.share-card--simple { background: #ffffff; border: 1px solid #e5e7eb; }
.share-card--simple .share-card-icon { background: #f3f4f6; }
.share-card--simple .share-card-icon svg { color: #6b7280; }
.share-card--simple .share-card-title { color: #111827; }
.share-card--simple .share-card-desc { color: #6b7280; }
.share-card--simple .share-card-url { color: #9ca3af; }

.share-card--tech { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; }
.share-card--tech .share-card-icon { background: rgba(56, 189, 248, 0.15); }
.share-card--tech .share-card-icon svg { color: #38bdf8; }
.share-card--tech .share-card-title { color: #f1f5f9; }
.share-card--tech .share-card-desc { color: #94a3b8; }
.share-card--tech .share-card-url { color: #64748b; }

.share-card--nature { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; }
.share-card--nature .share-card-icon { background: rgba(16, 185, 129, 0.15); }
.share-card--nature .share-card-icon svg { color: #059669; }
.share-card--nature .share-card-title { color: #064e3b; }
.share-card--nature .share-card-desc { color: #065f46; }
.share-card--nature .share-card-url { color: #047857; }
</style>
