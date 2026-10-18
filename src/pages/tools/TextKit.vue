<template>
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
    :requires-card="PAGE.requiresCard"
  >
    <!-- 模式选择 -->
    <section class="ui-card tool-panel">
      <div class="u-field">
        <label class="u-field-label" for="text-kit-mode">{{ PAGE.modeLabel }}</label>
        <SelectField
          id="text-kit-mode"
          v-model="currentMode"
          :options="PAGE.modeOptions"
          :aria-label="PAGE.modeLabel"
        />
      </div>
    </section>

    <!-- 输入区 -->
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="file-text" aria-hidden="true" />
        <span>{{ PAGE.inputTitle }}</span>
      </h2>

      <div class="u-field">
        <label class="u-field-label" for="text-source">{{ PAGE.sourceLabel }}</label>
        <textarea
          id="text-source"
          v-model="source"
          class="u-input tool-textarea"
          :placeholder="PAGE.sourcePlaceholder"
          spellcheck="false"
        ></textarea>
        <p class="u-field-hint">{{ PAGE.sourceHint }}</p>
      </div>

      <!-- 动态参数区 -->
      <div class="tool-form">
        <!-- 查找替换模式 -->
        <template v-if="currentMode === 'find-replace'">
          <div class="u-field">
            <label class="u-field-label" for="find-text">{{ PAGE.findLabel }}</label>
            <input id="find-text" v-model="findText" class="u-input" :placeholder="PAGE.findPlaceholder" />
          </div>
          <div class="u-field">
            <label class="u-field-label" for="replace-text">{{ PAGE.replaceLabel }}</label>
            <input id="replace-text" v-model="replaceText" class="u-input" :placeholder="PAGE.replacePlaceholder" />
          </div>
          <div class="u-field">
            <label class="u-switch" :aria-checked="useRegex ? 'true' : 'false'">
              <input type="checkbox" :checked="useRegex" @change="useRegex = $event.target.checked" />
              <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
              <span class="u-switch-label">{{ PAGE.regexLabel }}</span>
            </label>
            <label class="u-switch" :aria-checked="globalReplace ? 'true' : 'false'">
              <input type="checkbox" :checked="globalReplace" @change="globalReplace = $event.target.checked" />
              <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
              <span class="u-switch-label">{{ PAGE.globalLabel }}</span>
            </label>
          </div>
        </template>

        <!-- 大小写转换模式 -->
        <template v-if="currentMode === 'case-convert'">
          <div class="u-field">
            <label class="u-field-label">{{ PAGE.caseLabel }}</label>
            <div class="tool-actions">
              <button
                v-for="opt in PAGE.caseOptions"
                :key="opt.value"
                type="button"
                class="u-btn-secondary"
                :class="{ 'u-btn-primary': caseType === opt.value }"
                @click="caseType = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </template>

        <!-- 行排序模式 -->
        <template v-if="currentMode === 'line-sort'">
          <div class="u-field">
            <label class="u-field-label" for="sort-mode">{{ PAGE.sortLabel }}</label>
            <SelectField id="sort-mode" v-model="sortMode" :options="PAGE.sortOptions" />
          </div>
          <label class="u-switch" :aria-checked="sortUnique ? 'true' : 'false'">
            <input type="checkbox" :checked="sortUnique" @change="sortUnique = $event.target.checked" />
            <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
            <span class="u-switch-label">{{ PAGE.uniqueLabel }}</span>
          </label>
        </template>

        <!-- 行去重模式 -->
        <template v-if="currentMode === 'line-dedup'">
          <div class="u-field">
            <label class="u-field-label" for="dedup-mode">{{ PAGE.dedupLabel }}</label>
            <SelectField id="dedup-mode" v-model="dedupMode" :options="PAGE.dedupOptions" />
          </div>
        </template>

        <!-- 文本清理模式 -->
        <template v-if="currentMode === 'text-clean'">
          <div class="u-field">
            <label class="u-field-label">{{ PAGE.cleanLabel }}</label>
            <div class="tool-form">
              <label class="u-switch" :aria-checked="cleanEmptyLines ? 'true' : 'false'">
                <input type="checkbox" :checked="cleanEmptyLines" @change="cleanEmptyLines = $event.target.checked" />
                <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
                <span class="u-switch-label">{{ PAGE.cleanEmpty }}</span>
              </label>
              <label class="u-switch" :aria-checked="cleanTrim ? 'true' : 'false'">
                <input type="checkbox" :checked="cleanTrim" @change="cleanTrim = $event.target.checked" />
                <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
                <span class="u-switch-label">{{ PAGE.cleanTrim }}</span>
              </label>
              <label class="u-switch" :aria-checked="cleanCollapse ? 'true' : 'false'">
                <input type="checkbox" :checked="cleanCollapse" @change="cleanCollapse = $event.target.checked" />
                <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
                <span class="u-switch-label">{{ PAGE.cleanCollapse }}</span>
              </label>
              <label class="u-switch" :aria-checked="cleanNewlines ? 'true' : 'false'">
                <input type="checkbox" :checked="cleanNewlines" @change="cleanNewlines = $event.target.checked" />
                <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
                <span class="u-switch-label">{{ PAGE.cleanNewlines }}</span>
              </label>
            </div>
          </div>
        </template>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!canSubmit" @click="start">
          {{ PAGE.submit }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">
          {{ PAGE.reset }}
        </button>
        <button type="button" class="u-btn-secondary" @click="fillSample">
          {{ PAGE.sample }}
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
        icon="file-text"
      >
        <template v-if="result">
          <!-- 字数统计展示 -->
          <template v-if="currentMode === 'word-count'">
            <div class="tool-result-stats">
              <div v-for="stat in result.stats" :key="stat.label" class="tool-stat-card">
                <span class="tool-stat-value">{{ stat.value }}</span>
                <span class="tool-stat-label">{{ stat.label }}</span>
              </div>
            </div>
          </template>
          <!-- 其他模式展示格式化文本 -->
          <template v-else>
            <pre class="tool-preview">{{ result.text }}</pre>
          </template>

          <div v-if="result.meta" class="tool-result-meta">
            <span v-for="(value, key) in result.meta" :key="key" class="tool-result-meta-item">
              {{ key }}: <span class="tool-result-value">{{ value }}</span>
            </span>
          </div>
        </template>

        <template #actions>
          <button type="button" class="u-btn-primary" :disabled="!result" @click="copyResult">
            {{ copyLabel }}
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
          <span class="tool-aside-title-icon" aria-hidden="true"><AppIcon name="alert-triangle" /></span>
          <span>{{ TOOL_PAGE.noticeTitle }}</span>
        </h3>
        <p class="tool-aside-note">
          <span class="tool-aside-note-icon" aria-hidden="true"><AppIcon name="alert-triangle" /></span>
          <span>{{ PAGE.asideNotice }}</span>
        </p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolJob } from '@/hooks/useToolJob/index.js'

const PAGE = TOOL_PAGES['/text/kit']

const currentMode = ref('markdown-html')
const source = ref('')

// 查找替换参数
const findText = ref('')
const replaceText = ref('')
const useRegex = ref(false)
const globalReplace = ref(true)

// 大小写参数
const caseType = ref('upper')

// 行排序参数
const sortMode = ref('asc')
const sortUnique = ref(false)

// 行去重参数
const dedupMode = ref('first')

// 文本清理参数
const cleanEmptyLines = ref(true)
const cleanTrim = ref(true)
const cleanCollapse = ref(false)
const cleanNewlines = ref(false)

const copyState = ref('idle')

const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({
  run: processText,
})

const busy = computed(() => jobState.value === 'loading')
const canSubmit = computed(() => Boolean(source.value.trim()) && !busy.value)

const copyLabel = computed(() => {
  if (copyState.value === 'ok') return TOOL_RESULT.copied
  if (copyState.value === 'fail') return TOOL_RESULT.copyFailed
  return TOOL_RESULT.copy
})

// 字数统计模式：即时计算，不走useToolJob
watch([source, currentMode], () => {
  if (currentMode.value === 'word-count' && source.value.trim()) {
    const text = source.value
    const chars = text.length
    const charsNoSpace = text.replace(/\s/g, '').length
    const lines = text.split('\n').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const bytes = new Blob([text]).size

    result.value = {
      text: '',
      stats: [
        { label: '字符数', value: chars },
        { label: '字符数（不含空格）', value: charsNoSpace },
        { label: '词数', value: words },
        { label: '行数', value: lines },
        { label: '字节数', value: bytes },
      ],
      meta: { 原文本: `${chars} 字符 · ${lines} 行` },
    }
    jobState.value = 'success'
  } else if (currentMode.value === 'word-count') {
    resetJob()
  }
}, { immediate: true })

async function processText() {
  const text = source.value
  if (!text.trim()) throw new Error(PAGE.invalidEmpty)

  await new Promise((resolve) => { setTimeout(resolve, 0) })

  let output = text
  let meta = {}

  switch (currentMode.value) {
    case 'markdown-html':
      // 简化的 Markdown → HTML 转换
      output = simpleMarkdownToHtml(text)
      meta = { 模式: 'Markdown → HTML' }
      break
    case 'html-markdown':
      output = simpleHtmlToMarkdown(text)
      meta = { 模式: 'HTML → Markdown' }
      break
    case 'html-entity':
      output = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
      meta = { 模式: 'HTML 实体编码' }
      break
    case 'html-decode':
      output = text.replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[e]))
      meta = { 模式: 'HTML 实体解码' }
      break
    case 'find-replace':
      if (!findText.value) throw new Error(PAGE.needFindText)
      if (useRegex.value) {
        try {
          const flags = globalReplace.value ? 'g' : ''
          const regex = new RegExp(findText.value, flags)
          output = text.replace(regex, replaceText.value)
        } catch (e) {
          throw new Error(PAGE.invalidRegex + e.message)
        }
      } else {
        if (globalReplace.value) {
          output = text.split(findText.value).join(replaceText.value)
        } else {
          output = text.replace(findText.value, replaceText.value)
        }
      }
      meta = { 查找: findText.value, 替换: replaceText.value }
      break
    case 'case-convert':
      switch (caseType.value) {
        case 'upper': output = text.toUpperCase(); break
        case 'lower': output = text.toLowerCase(); break
        case 'capitalize': output = text.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase()); break
        case 'sentence': output = text.replace(/(?:^|[.!?]\s+)\S/g, (a) => a.toUpperCase()); break
        case 'toggle': output = text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''); break
      }
      meta = { 转换: PAGE.caseOptions.find(o => o.value === caseType.value)?.label }
      break
    case 'line-sort':
      {
        let lines = text.split('\n')
        if (sortUnique.value) lines = [...new Set(lines)]
        lines.sort((a, b) => {
          if (sortMode.value === 'asc') return a.localeCompare(b)
          if (sortMode.value === 'desc') return b.localeCompare(a)
          if (sortMode.value === 'length-asc') return a.length - b.length
          if (sortMode.value === 'length-desc') return b.length - a.length
          return 0
        })
        output = lines.join('\n')
        meta = { 排序: sortMode.value, 去重: sortUnique.value ? '是' : '否' }
      }
      break
    case 'line-dedup':
      {
        const lines = text.split('\n')
        const seen = new Map()
        lines.forEach((line, i) => {
          if (!seen.has(line)) seen.set(line, { line, index: i, count: 1 })
          else seen.get(line).count++
        })
        let resultLines
        if (dedupMode.value === 'first') resultLines = [...seen.values()].sort((a, b) => a.index - b.index).map(v => v.line)
        else if (dedupMode.value === 'last') {
          const lastSeen = new Map()
          lines.forEach((line, i) => lastSeen.set(line, { line, index: i }))
          resultLines = [...lastSeen.values()].sort((a, b) => a.index - b.index).map(v => v.line)
        }
        else if (dedupMode.value === 'count') {
          resultLines = [...seen.entries()].sort((a, b) => b[1].count - a[1].count).map(([line, info]) => `${line} (${info.count})`)
        }
        output = resultLines.join('\n')
        meta = { 原行数: lines.length, 去重后: resultLines.length }
      }
      break
    case 'text-clean':
      output = text
      if (cleanEmptyLines.value) output = output.replace(/\n[\t ]*(?=\n)/g, '')
      if (cleanTrim.value) output = output.split('\n').map(l => l.trim()).join('\n')
      if (cleanCollapse.value) output = output.replace(/[ \t]+/g, ' ')
      if (cleanNewlines.value) output = output.replace(/\r\n/g, '\n').replace(/\n+/g, '\n')
      meta = { 原长度: text.length, 处理后: output.length }
      break
    case 'zh-convert':
      // 简繁转换：使用基础映射
      output = simpleZhConvert(text)
      meta = { 模式: '简繁转换' }
      break
    default:
      output = text
  }

  return { text: output, meta }
}

function simpleMarkdownToHtml(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
    .replace(/\n/gim, '<br>')
}

function simpleHtmlToMarkdown(html) {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

function simpleZhConvert(text) {
  // 基础简繁映射（常用字，去重后）
  const s2t = {
    '万': '萬', '与': '與', '丑': '醜', '专': '專', '业': '業', '丛': '叢', '东': '東', '丝': '絲',
    '丢': '丟', '两': '兩', '严': '嚴', '丧': '喪', '个': '個', '丰': '豐', '临': '臨', '为': '為',
    '丽': '麗', '举': '舉', '么': '麼', '义': '義', '乌': '烏', '乐': '樂', '乔': '喬', '习': '習',
    '乡': '鄉', '书': '書', '买': '買', '乱': '亂', '争': '爭', '于': '於', '云': '雲', '亚': '亞',
    '产': '產', '亩': '畝', '亲': '親', '亵': '褻', '亿': '億', '仅': '僅', '从': '從', '仑': '侖',
    '仓': '倉', '仪': '儀', '们': '們', '价': '價', '众': '眾', '优': '優', '会': '會', '伟': '偉',
    '传': '傳', '伤': '傷', '伦': '倫', '伪': '偽', '伫': '佇', '体': '體', '余': '餘', '佣': '傭',
    '佥': '僉', '侠': '俠', '侣': '侶', '侥': '僥', '侦': '偵', '侧': '側', '侨': '僑', '侩': '儈',
    '诲': '誨', '债': '債', '倾': '傾', '偻': '僂', '偿': '償', '杰': '傑', '备': '備', '傥': '儻',
    '妆': '妝', '妇': '婦', '妈': '媽', '妩': '嫵', '妪': '嫗', '姗': '姍', '姹': '奼', '娄': '婁',
    '娅': '婭', '娆': '嬈', '娇': '嬌', '娈': '孌', '娱': '娛', '娲': '媧', '娴': '嫻', '婳': '嫿',
    '婴': '嬰', '婵': '嬋', '婶': '嬸', '媪': '媼', '嫒': '嬡', '嫔': '嬪', '嫱': '嬙', '嬷': '嬤',
    '孙': '孫', '学': '學', '孪': '孿', '宁': '寧', '宝': '寶', '实': '實', '宠': '寵', '审': '審',
    '宪': '憲', '宫': '宮', '宽': '寬', '宾': '賓', '寝': '寢', '对': '對', '寻': '尋', '导': '導',
    '寿': '壽', '将': '將', '尔': '爾', '尘': '塵', '尝': '嘗', '尧': '堯', '尴': '尷', '尸': '屍',
    '层': '層', '属': '屬', '届': '屆', '屉': '屜', '岗': '崗', '岘': '峴', '岚': '嵐', '岛': '島',
    '岭': '嶺', '岽': '崠', '岿': '巋', '峄': '嶧', '峡': '峽', '峣': '嶢', '峤': '嶠', '峥': '崢',
    '峦': '巒', '崂': '嶗', '崃': '崍', '崄': '嶮', '崭': '嶄', '嵘': '嶸', '嵚': '嶔', '嵛': '崳',
    '巅': '巔', '巩': '鞏', '巯': '巰', '币': '幣', '帅': '帥', '师': '師', '帏': '幃', '帐': '帳',
    '帘': '簾', '帜': '幟', '带': '帶', '帧': '幀', '帮': '幫', '帱': '幬', '帻': '幘', '帼': '幗',
    '幂': '冪', '幞': '幞', '并': '並', '广': '廣', '庆': '慶', '庄': '莊', '庐': '廬', '庑': '廡',
    '库': '庫', '应': '應', '庙': '廟', '庞': '龐', '废': '廢', '庼': '廎', '廪': '廩', '开': '開',
    '异': '異', '弃': '棄', '弑': '弒', '张': '張', '弥': '彌', '弪': '弳', '弯': '彎', '弹': '彈',
    '强': '強', '归': '歸', '当': '當', '录': '錄', '彟': '彠', '彦': '彥', '彻': '徹', '径': '徑',
    '徕': '徠', '忆': '憶', '忏': '懺', '忧': '憂', '忾': '愾', '怀': '懷', '态': '態', '怂': '慫',
    '怃': '憮', '怄': '慪', '怅': '悵', '怆': '愴', '怜': '憐', '总': '總', '怼': '懟', '怿': '懌',
    '恋': '戀', '恒': '恆', '恳': '懇', '恶': '惡', '恸': '慟', '恹': '懨', '恺': '愷', '恻': '惻',
    '恼': '惱', '恽': '惲', '悦': '悅', '悬': '懸', '悭': '慳', '悮': '悞', '悯': '憫', '惊': '驚',
    '惧': '懼', '惨': '慘', '惩': '懲', '惫': '憊', '惬': '愜', '惭': '慚', '惮': '憚', '惯': '慣',
    '愠': '慍', '愤': '憤', '愦': '憒', '愿': '願', '慑': '懾', '懑': '懣', '懒': '懶', '懔': '懍',
    '戆': '戇', '戋': '戔', '戏': '戲', '戗': '戧', '战': '戰', '戬': '戩', '戯': '戱', '户': '戶',
    '扑': '撲', '托': '託', '执': '執', '扩': '擴', '扪': '捫', '扫': '掃', '扬': '揚', '扰': '擾',
    '抚': '撫', '抛': '拋', '抟': '摶', '抠': '摳', '抡': '掄', '抢': '搶', '护': '護', '报': '報',
    '担': '擔', '拟': '擬', '拢': '攏', '拣': '揀', '拥': '擁', '拦': '攔', '拧': '擰', '拨': '撥',
    '择': '擇', '挂': '掛', '挚': '摯', '挛': '攣', '挜': '掗', '挝': '撾', '挞': '撻', '挟': '挾',
    '挠': '撓', '挡': '擋', '挢': '撟', '挣': '掙', '挤': '擠', '挥': '揮', '挦': '撏', '挽': '輓',
    '捝': '挩', '捞': '撈', '损': '損', '捡': '撿', '换': '換', '捣': '搗', '掳': '擄', '掴': '摑',
    '掷': '擲', '掸': '撣', '掺': '摻', '掼': '摜', '揽': '攬', '揾': '搵', '揿': '撳', '搀': '攙',
    '搁': '擱', '搂': '摟', '搅': '攪', '携': '攜', '摄': '攝', '摅': '攄', '摆': '擺', '摇': '搖',
    '摈': '擯', '摊': '攤', '撄': '攖', '撑': '撐', '撵': '攆', '撷': '擷', '撸': '擼', '撺': '攛',
    '擞': '擻', '攒': '攢', '敌': '敵', '敛': '斂', '数': '數', '斋': '齋', '斓': '斕', '斗': '鬥',
    '斩': '斬', '断': '斷', '无': '無', '旧': '舊', '时': '時', '旷': '曠', '旸': '暘', '昙': '曇',
    '昼': '晝', '昽': '曨', '显': '顯', '晋': '晉', '晒': '曬', '晓': '曉', '晔': '曄', '晕': '暈',
    '晖': '暉', '暂': '暫', '暧': '曖', '术': '術', '机': '機', '杀': '殺', '杂': '雜', '权': '權',
    '杆': '桿', '条': '條', '来': '來', '杨': '楊', '杩': '榪', '极': '極', '构': '構', '枞': '樅',
    '枢': '樞', '枣': '棗', '枥': '櫪', '枧': '梘', '枨': '棖', '枪': '槍', '枫': '楓', '枭': '梟',
    '柠': '檸', '柽': '檉', '栀': '梔', '栅': '柵', '标': '標', '栈': '棧', '栉': '櫛', '栊': '櫳',
    '栋': '棟', '栌': '櫨', '栎': '櫟', '栏': '欄', '树': '樹', '栖': '棲', '样': '樣', '栾': '欒',
    '桊': '棬', '桠': '椏', '桡': '橈', '桢': '楨', '档': '檔', '桤': '榿', '桥': '橋', '桦': '樺',
    '桧': '檜', '桨': '槳', '桩': '樁', '梦': '夢', '检': '檢', '棂': '欞', '椁': '槨', '椟': '櫝',
    '椠': '槧', '椤': '欏', '椭': '橢', '楼': '樓', '榄': '欖', '榅': '榲', '榇': '櫬', '榈': '櫚',
    '榉': '櫸', '槚': '檟', '槛': '檻', '槟': '檳', '槠': '櫧', '横': '橫', '樯': '檣', '樱': '櫻',
    '橥': '櫫', '橱': '櫥', '橹': '櫓', '橼': '櫞', '檩': '檁', '欢': '歡', '欤': '歟', '欧': '歐',
    '歼': '殲', '殁': '歿', '殇': '殤', '残': '殘', '殒': '殞', '殓': '殮', '殚': '殫', '殡': '殯',
    '殴': '毆', '毁': '毀', '毂': '轂', '毕': '畢', '毙': '斃', '毡': '氈', '毵': '毿', '氇': '氌',
    '气': '氣', '氢': '氫', '氩': '氬', '氲': '氳', '汇': '匯', '汉': '漢', '汤': '湯', '汹': '洶',
    '沈': '瀋', '沟': '溝', '没': '沒', '沣': '灃', '沤': '漚', '沥': '瀝', '沦': '淪', '沧': '滄',
    '沩': '溈', '沪': '滬', '泞': '濘', '泪': '淚', '泶': '澩', '泷': '瀧', '泸': '瀘', '泺': '濼',
    '泻': '瀉', '泼': '潑', '泽': '澤', '泾': '涇', '洁': '潔', '洒': '灑', '洼': '窪', '浃': '浹',
    '浅': '淺', '浆': '漿', '浇': '澆', '浈': '湞', '浊': '濁', '测': '測', '浍': '澮', '济': '濟',
    '浏': '瀏', '浐': '滻', '浑': '渾', '浒': '滸', '浓': '濃', '浔': '潯', '浕': '濜', '涂': '塗',
    '涌': '湧', '涛': '濤', '涝': '澇', '涞': '淶', '涟': '漣', '涠': '潿', '涡': '渦', '涣': '煥',
    '涤': '滌', '润': '潤', '涧': '澗', '涨': '漲', '涩': '澀', '渊': '淵', '渌': '淥', '渍': '漬',
    '渎': '瀆', '渐': '漸', '渑': '澠', '渔': '漁', '渖': '瀋', '渗': '滲', '温': '溫', '湾': '灣',
    '湿': '濕', '溃': '潰', '溅': '濺', '溆': '漵', '滗': '潷', '滚': '滾', '滞': '滯', '滟': '灧',
    '滠': '灄', '满': '滿', '滢': '瀅', '滤': '濾', '滥': '濫', '滦': '灤', '滨': '濱', '滩': '灘',
    '滪': '澦', '漓': '漓', '潆': '瀠', '潇': '瀟', '潋': '瀲', '潍': '濰', '潜': '潛', '潴': '瀦',
    '澛': '瀂', '澜': '瀾', '濑': '瀨', '濒': '瀕', '灏': '灝', '灭': '滅', '灯': '燈', '灵': '靈',
    '灾': '災', '灿': '燦', '炀': '煬', '炉': '爐', '炖': '燉', '炜': '煒', '炝': '熗', '点': '點',
    '炼': '煉', '炽': '熾', '烁': '爍', '烂': '爛', '烃': '烴', '烛': '燭', '烟': '煙', '烦': '煩',
    '烧': '燒', '烨': '燁', '烩': '燴', '烫': '燙', '烬': '燼', '热': '熱', '焕': '煥', '焖': '燜',
    '焘': '燾', '煅': '煅', '爱': '愛', '爷': '爺', '牍': '牘', '牦': '犛', '牵': '牽', '牺': '犧',
    '犊': '犢', '状': '狀', '犷': '獷', '犸': '獁', '犹': '猶', '狈': '狽', '狝': '獮', '狞': '獰',
    '独': '獨', '狭': '狹', '狮': '獅', '狯': '獪', '狰': '猙', '狱': '獄', '狲': '猻', '猃': '獫',
    '猎': '獵', '猕': '獼', '猡': '玀', '猪': '豬', '猫': '貓', '献': '獻', '獭': '獺', '玑': '璣',
    '玚': '瑒', '玛': '瑪', '玮': '瑋', '环': '環', '现': '現', '玱': '瑲', '玺': '璽', '珐': '琺',
    '珑': '瓏', '珰': '璫', '珲': '琿', '琎': '璡', '琏': '璉', '琐': '瑣', '琼': '瓊', '瑶': '瑤',
    '瑷': '璦', '瑸': '璸', '璎': '瓔', '瓒': '瓚', '瓮': '甕', '瓯': '甌', '电': '電', '画': '畫',
    '畅': '暢', '畴': '疇', '疖': '癤', '疗': '療', '疟': '瘧', '疠': '癘', '疡': '瘍', '疬': '癧',
    '疭': '瘲', '疮': '瘡', '疯': '瘋', '疱': '皰', '疴': '痾', '痈': '癰', '痉': '痙', '痒': '癢',
    '痖': '瘂', '痨': '癆', '痪': '瘓', '痫': '癇', '瘅': '癉', '瘆': '瘮', '瘗': '瘞', '瘪': '癟',
    '瘫': '癱', '瘾': '癮', '瘿': '癭', '癞': '癩', '癣': '癬', '癫': '癲', '皑': '皚', '皱': '皺',
    '皲': '皸', '盏': '盞', '盐': '鹽', '监': '監', '盖': '蓋', '盗': '盜', '盘': '盤', '眍': '瞘',
    '眦': '眥', '眬': '矓', '着': '著', '睁': '睜', '睐': '睞', '睑': '瞼', '瞒': '瞞', '瞩': '矚',
    '矫': '矯', '矶': '磯', '矾': '礬', '矿': '礦', '码': '碼', '砀': '碭', '厕': '廁', '䦶': '䦛',
    '䦷': '䦟', '厦': '廈', '厨': '廚', '厮': '廝', '县': '縣', '叁': '叄', '参': '參', '双': '雙',
    '变': '變', '叙': '敘', '叠': '疊', '号': '號', '叹': '嘆', '叽': '嘰', '吓': '嚇', '吕': '呂',
    '吗': '嗎', '启': '啟', '吴': '吳', '呐': '吶', '呕': '嘔', '呖': '嚦', '呗': '唄', '员': '員',
    '呙': '咼', '呛': '嗆', '呜': '嗚', '咏': '詠', '咙': '嚨', '咛': '嚀', '咝': '噝', '咸': '鹹',
    '响': '響', '哑': '啞', '哒': '噠', '哔': '嗶', '哕': '噦', '哗': '嘩', '哙': '噲', '哜': '嚌',
    '哝': '噥', '哟': '喲', '唛': '嘜', '唝': '嗊', '唠': '嘮', '唡': '啢', '唢': '嗩', '唤': '喚',
    '啧': '嘖', '啬': '嗇', '啭': '囀', '啮': '嚙', '啯': '嘓', '啰': '囉', '啴': '嘽', '啸': '嘯',
    '喷': '噴', '喽': '嘍', '喾': '嚳', '嗫': '囁', '嗳': '噯', '嘘': '噓', '嘤': '嚶', '嘱': '囑',
    '噜': '嚕', '嚣': '囂', '园': '園', '囱': '囪', '围': '圍', '囵': '圇', '国': '國', '图': '圖',
    '圆': '圓', '圣': '聖', '圹': '壙', '场': '場', '坂': '阪', '坏': '壞', '块': '塊', '坚': '堅',
    '坛': '壇', '坜': '壢', '坝': '壩', '坞': '塢', '坟': '墳', '坠': '墜', '垄': '壟', '垅': '壟',
    '垆': '壚', '垒': '壘', '垦': '墾', '垩': '堊', '垫': '墊', '垭': '埡', '垯': '墶', '垱': '壋',
    '垲': '塏', '垴': '堖', '埘': '塒', '埙': '壎', '埚': '堝', '埝': '墊', '埯': '垵', '埴': '埴',
    '埸': '埸', '培': '培', '基': '基', '堕': '墮', '塆': '壪', '墙': '牆', '墒': '墒', '壤': '壤',
    '壮': '壯', '声': '聲', '壳': '殼', '壶': '壺', '壸': '壼', '处': '處', '复': '復', '够': '夠',
    '头': '頭', '夸': '誇', '夹': '夾', '夺': '奪', '奁': '奩', '奂': '奐', '奋': '奮', '奖': '獎',
    '奥': '奧'
  }
  let result = ''
  for (const char of text) {
    result += s2t[char] || char
  }
  return result
}

function start() {
  copyState.value = 'idle'
  run()
}

function clear() {
  source.value = ''
  copyState.value = 'idle'
  resetJob()
}

function fillSample() {
  source.value = PAGE.sampleText
  copyState.value = 'idle'
  resetJob()
}

async function copyResult() {
  const text = result.value?.text
  if (!text) return
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('clipboard unavailable')
    }
    await navigator.clipboard.writeText(text)
    copyState.value = 'ok'
  } catch (e) {
    copyState.value = 'fail'
  }
}
</script>

<style scoped>
.tool-result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: calc(var(--space-unit) * 1.5);
}

.tool-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 2);
  border-radius: var(--radius-card);
  background: var(--bg-surface-2);
}

.tool-stat-value {
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--accent);
}

.tool-stat-label {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}
</style>
