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
        <AppIcon name="video" aria-hidden="true" />
        <span>{{ PAGE.inputTitle }}</span>
      </h2>

      <div class="u-field">
        <label class="u-field-label" for="video-link">{{ PAGE.linkLabel }}</label>
        <input
          id="video-link"
          v-model="link"
          class="u-input"
          type="url"
          inputmode="url"
          autocomplete="off"
          :placeholder="PAGE.linkPlaceholder"
          @input="linkError = ''"
        />
        <p class="u-field-hint">{{ PAGE.linkHint }}</p>
      </div>

      <p v-if="linkError" class="u-field-error" role="alert">{{ linkError }}</p>

      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="video-quality">{{ PAGE.qualityLabel }}</label>
          <SelectField
            id="video-quality"
            v-model="quality"
            :options="PAGE.qualityOptions"
            :aria-label="PAGE.qualityLabel"
          />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="video-format">{{ PAGE.formatLabel }}</label>
          <SelectField
            id="video-format"
            v-model="format"
            :options="PAGE.formatOptions"
            :aria-label="PAGE.formatLabel"
          />
        </div>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!link.trim() || busy" @click="start">
          {{ PAGE.submit }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="!link" @click="clear">
          {{ PAGE.reset }}
        </button>
      </div>
    </section>

    <!-- 结果区 -->
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
        icon="video"
      >
        <template #empty-actions>
          <button type="button" class="u-btn-secondary" @click="fillSample">
            {{ PAGE.sample }}
          </button>
        </template>

        <template v-if="result">
          <div class="tool-result-meta">
            <span class="tool-result-meta-item">
              {{ META.link }}
              <span class="tool-result-value">{{ result.link }}</span>
            </span>
            <span class="tool-result-meta-item">
              {{ META.quality }}
              <span class="tool-result-value">{{ result.quality }}</span>
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

        <template #error>
          <button type="button" class="u-btn-secondary" @click="start">{{ TOOL_RESULT.retry }}</button>
        </template>
      </ToolResultPane>
    </section>

    <!-- 辅助信息 -->
    <template #aside>
      <!-- 顺序与其余四个工具页一致：先「使用说明」，再「注意事项」 -->
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
            <AppIcon name="alert-triangle" />
          </span>
          <span>{{ TOOL_PAGE.noticeTitle }}</span>
        </h3>

        <!-- 解析服务还没接通，这一格必须如实说明：付过费的用户点进来，
             看到「功能开发中」比看到一个转不出来的转圈要有用得多 -->
        <p class="tool-shell-card-tag u-tag u-tag--warning">
          <AppIcon name="clock" />
          <span>{{ VIDEO_TOOL.status }}</span>
        </p>

        <p class="tool-aside-note">
          <span class="tool-aside-note-icon" aria-hidden="true"><AppIcon name="info" /></span>
          <span>{{ VIDEO_TOOL.body }}</span>
        </p>

        <div class="tool-aside-links">
          <RouterLink class="tool-aside-link" :to="{ path: '/user/kami' }">
            <AppIcon name="key" />
            <span>{{ VIDEO_TOOL.myCards }}</span>
          </RouterLink>
        </div>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
/**
 * 视频下载工具页（骨架）。
 *
 * 这一页的前身是一个「开发中」说明卡：解析服务没接通（候选服务是会员制接口，
 * 文档给的地址实测 404），但它至少不会让已激活卡密的用户撞上 404。
 * 现在它有了完整骨架 —— 链接输入、清晰度与输出格式、四态结果区、辅助信息 ——
 * 但**解析仍然是占位的**：点「解析链接」走完加载与成功流转，结果是回显你要的参数，
 * 页面上如实标注了这一点。
 *
 * 为什么先搭骨架再做服务：真实解析涉及第三方接口、限流与失败重试，
 * 而「工具页长什么样」是这一期要定下来的东西。服务接通后只需要替换 `parse()`
 * 的实现，路由与数据库里的 `tool_path` 都不用动。
 *
 * 链接的合法性只在本地做形态校验（协议 + 非空）；能不能解析由服务端说了算。
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT, VIDEO_TOOL } from '@/constants/index.js'
import { useToolJob } from '@/hooks/useToolJob/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/video/downloader']
const META = TOOL_RESULT.meta
const usage = useToolUsage('/video/downloader')

/** 只接受带协议的完整链接：短链也带协议，粘进来不带协议的一定是没复制全 */
const LINK_PATTERN = /^\s*https?:\/\/\S+$/i

const PARSE_DELAY_MS = 700

const link = ref('')
const quality = ref('1080p')
const format = ref('mp4')
const linkError = ref('')

const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({
  run: parse,
  // 走 job 的主流程由 useToolJob 自动上报（含耗时与失败码）
  usage,
})

const busy = computed(() => jobState.value === 'loading')

// 占位解析的「耗时」：让加载态有机会渲染一帧，接入真实解析服务后去掉
const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

function optionLabel(options, value) {
  const found = options.find((item) => item.value === value)
  return found ? found.label : value
}

/**
 * 真实解析替换这里：把链接交给解析服务，拿回可下载的地址。
 * 现在返回的是回显参数 —— 不是「假数据」，而是明确标注为占位的结果。
 */
async function parse() {
  const value = link.value.trim()
  if (!LINK_PATTERN.test(value)) throw new Error(PAGE.invalidLink)

  await delay(PARSE_DELAY_MS)

  return {
    link: value,
    quality: optionLabel(PAGE.qualityOptions, quality.value),
    format: optionLabel(PAGE.formatOptions, format.value),
  }
}

function start() {
  if (!LINK_PATTERN.test(link.value.trim())) {
    linkError.value = PAGE.invalidLink
    // 本地校验就先拦下，不走 job，所以这里手动上报失败
    usage.record({ ok: false, errorCode: 'VIDEO_LINK_INVALID' })
    return
  }
  linkError.value = ''
  run()
}

function clear() {
  link.value = ''
  linkError.value = ''
  resetJob()
}

function fillSample() {
  link.value = PAGE.sampleLink
  linkError.value = ''
  resetJob()
}
</script>
