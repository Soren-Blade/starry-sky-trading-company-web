<template>
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
    :requires-card="PAGE.requiresCard"
  >
    <!-- 输入区 -->
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="image" aria-hidden="true" />
        <span>{{ PAGE.inputTitle }}</span>
      </h2>

      <!-- 视觉隐藏的 input 放在 label 里：点整块拖拽区都能唤起文件选择，
           键盘 Tab 也仍然能到达那个 input（不用 display:none，那样等于移除控件）。 -->
      <label
        class="tool-file-drop"
        :class="{ 'tool-file-drop--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <span class="tool-file-icon" aria-hidden="true"><AppIcon name="image" /></span>
        <span class="tool-file-title">{{ PAGE.dropTitle }}</span>
        <span class="tool-result-note">{{ PAGE.dropHint }}</span>
        <input
          ref="fileInput"
          class="tool-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="handleChange"
        />
      </label>

      <!-- 校验失败提示在输入区就地给出（`.u-field-error`），
           它和处理失败（结果区的红色块）是两件事：前者是「没选对文件」，后者是「跑失败了」。 -->
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <p v-else-if="file" class="tool-file-name">
        <AppIcon name="check-circle" aria-hidden="true" />
        <span>{{ file.name }} · {{ formatBytes(file.size) }}</span>
      </p>

      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="compressor-quality">{{ PAGE.qualityLabel }}</label>
          <SelectField
            id="compressor-quality"
            v-model="quality"
            :options="PAGE.qualityOptions"
            :aria-label="PAGE.qualityLabel"
          />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="compressor-format">{{ PAGE.formatLabel }}</label>
          <SelectField
            id="compressor-format"
            v-model="format"
            :options="PAGE.formatOptions"
            :aria-label="PAGE.formatLabel"
          />
        </div>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!file || busy" @click="start">
          {{ PAGE.submit }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="!file" @click="reset">
          {{ PAGE.reset }}
        </button>
      </div>
    </section>

    <!-- 结果区（空 / 加载 / 成功 / 失败四态由 ToolResultPane 渲染） -->
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="check-circle" aria-hidden="true" />
        <span>{{ PAGE.resultTitle }}</span>
      </h2>

      <ToolResultPane
        :state="jobState"
        :title="PAGE.emptyTitle"
        :description="PAGE.emptyDesc"
        :error="jobError"
        icon="image"
      >
        <template v-if="result">
          <div class="tool-preview-media">
            <img :src="result.previewUrl" :alt="PAGE.resultTitle" />
          </div>

          <div class="tool-result-meta">
            <span class="tool-result-meta-item">
              {{ META.originalSize }}
              <span class="tool-result-value">{{ formatBytes(result.originalBytes) }}</span>
            </span>
            <span class="tool-result-meta-item">
              {{ META.outputSize }}
              <span class="tool-result-value">{{ formatBytes(result.compressedBytes) }}</span>
            </span>
            <span class="tool-result-meta-item">
              {{ META.saved }}
              <span class="tool-result-value">{{ savedPercent }}</span>
            </span>
            <span class="tool-result-meta-item">
              {{ META.format }}
              <span class="tool-result-value">{{ result.format }}</span>
            </span>
          </div>

          <p class="tool-result-note">{{ PAGE.resultNote }}</p>
        </template>

        <template #actions>
          <button type="button" class="u-btn-secondary" disabled :title="PAGE.resultNote">
            {{ PAGE.download }}
          </button>
        </template>
      </ToolResultPane>
    </section>

    <!-- 辅助信息 -->
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true"><AppIcon name="info" /></span>
          <span>{{ TOOL_PAGE.usageTitle }}</span>
        </h3>
        <ul class="tool-aside-list">
          <li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true">
            <AppIcon name="shield-alert" />
          </span>
          <span>{{ TOOL_PAGE.noticeTitle }}</span>
        </h3>
        <p class="tool-aside-note">
          <span class="tool-aside-note-icon" aria-hidden="true">
            <AppIcon name="alert-triangle" />
          </span>
          <span>{{ PAGE.asideNotice }}</span>
        </p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
/**
 * 图片压缩工具页（骨架）。
 *
 * 真实能力（读取图片 → 重新编码 → 下载）本期**没有接入**，但这一页不是空壳：
 * 选图、格式校验、档位与输出格式、四态流转、体积估算、本地预览都是真的，
 * 只有「编码」那一步是按档位系数估算的占位实现（页面上如实标注）。
 * 这样做的理由：编码器（canvas / WebCodecs）要处理跨域、色彩空间、超大图与降级，
 * 一旦引入就必须有对应的测试与兜底；而这一期的目标是**把工具页骨架立起来**，
 * 让真实实现将来只需要替换一个 `compress()`。
 *
 * 图片始终留在浏览器里：这里不发起任何请求，也没有上传入口。
 * 预览用的 objectURL 在换图 / 重置 / 卸载时都要 revoke，否则一张大图会一直占着内存。
 */
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolJob } from '@/hooks/useToolJob/index.js'

const PAGE = TOOL_PAGES['/image/compressor']
const META = TOOL_RESULT.meta

/** 与 input 的 accept 一致：这里再校验一次，拖拽进来的文件不经过 accept 过滤 */
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

/** 占位编码的档位系数（真实编码接入后连同 resultNote 一起换掉） */
const QUALITY_RATIO = { high: 0.8, medium: 0.6, low: 0.4 }
const ENCODE_DELAY_MS = 600

const file = ref(null)
const fileError = ref('')
const dragging = ref(false)
const quality = ref('medium')
const format = ref('keep')
const previewUrl = ref('')
const fileInput = ref(null)

const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({
  run: compress,
})

const busy = computed(() => jobState.value === 'loading')

const savedPercent = computed(() => {
  const current = result.value
  if (!current || !current.originalBytes) return '—'
  const saved = Math.max(0, current.originalBytes - current.compressedBytes)
  return `${Math.round((saved / current.originalBytes) * 100)}%`
})

// 占位编码的「耗时」：让加载态有机会渲染一帧，真实编码接入后换成实际工作
const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** 体积按 B / KB / MB 三档展示，够用且不会出现「0.00 MB」 */
function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

/** 结果里的格式：保持原格式时如实回显原文件的 MIME，而不是编一个「原格式」 */
function outputFormat() {
  if (format.value === 'keep') return file.value?.type || '保持原格式'
  const option = PAGE.formatOptions.find((item) => item.value === format.value)
  return option ? option.label : format.value
}

/**
 * 真实实现将来就替换这里：读文件 → 编码 → 得到新的 Blob 与体积。
 * 现在返回的是按档位系数估算的体积 + 本地预览地址。
 */
async function compress() {
  if (!file.value) throw new Error(PAGE.needFile)
  await delay(ENCODE_DELAY_MS)
  const ratio = QUALITY_RATIO[quality.value] ?? QUALITY_RATIO.medium
  return {
    originalBytes: file.value.size,
    compressedBytes: Math.max(1, Math.round(file.value.size * ratio)),
    format: outputFormat(),
    previewUrl: previewUrl.value,
  }
}

function releasePreview() {
  const url = previewUrl.value
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url)
  }
  previewUrl.value = ''
}

/** 选中/拖入的文件都要过这一道：类型与体积不合格时**不**进入状态，只留一条就地提示 */
function acceptFile(next) {
  if (!next) return

  if (!ACCEPT_TYPES.includes(next.type)) {
    fileError.value = PAGE.invalidType
    return
  }

  if (next.size > MAX_BYTES) {
    fileError.value = PAGE.invalidSize
    return
  }

  fileError.value = ''
  releasePreview()
  file.value = next
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    previewUrl.value = URL.createObjectURL(next)
  }
  resetJob()
}

function handleChange(event) {
  const input = event?.target
  acceptFile(input?.files?.[0] || null)
  // 清掉 input 的值：否则再选**同一个文件**不会触发 change，看起来像是点了没反应
  if (input) input.value = ''
}

function handleDrop(event) {
  dragging.value = false
  acceptFile(event?.dataTransfer?.files?.[0] || null)
}

function start() {
  run()
}

function reset() {
  releasePreview()
  file.value = null
  fileError.value = ''
  if (fileInput.value) fileInput.value.value = ''
  resetJob()
}

onUnmounted(releasePreview)
</script>
