<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="database" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">生成方式</label>
        <SelectField v-model="mockType" :options="mockTypeOptions" />
      </div>
      <div class="mock-config-row">
        <div class="u-field"><label class="u-field-label" for="mock-count">生成数量 (1-100)</label><input id="mock-count" v-model.number="mockCount" type="number" min="1" max="100" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label" for="mock-seed">随机种子（留空每次不同）</label><input id="mock-seed" v-model="seedText" class="u-input" placeholder="例如 demo-2024" /></div>
      </div>
      <div v-if="mockType === 'schema'" class="u-field">
        <label class="u-field-label" for="mock-schema">JSON Schema（type/properties/items/enum/format/minimum/maximum/minLength/maxLength/required）</label>
        <textarea id="mock-schema" v-model="schemaText" class="u-input tool-textarea" rows="13" spellcheck="false"></textarea>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="errorText" icon="database">
        <template v-if="results.length">
          <p v-if="usedSeed" class="tool-result-note">本次种子：{{ usedSeed }}（同一个种子重跑会得到完全相同的结果）</p>
          <div class="mock-results">
            <div v-for="(item, i) in results" :key="i" class="mock-result-row">
              <span class="mock-result-index">{{ i + 1 }}.</span>
              <code class="mock-result-text">{{ item }}</code>
              <button type="button" class="u-btn-secondary mock-copy-one" @click="copy(item, 'copyOne')">复制</button>
            </div>
          </div>
        </template>
        <template #actions>
          <button type="button" class="u-btn-primary" :disabled="!results.length" @click="copy(results.join('\n'), 'copyAll')">{{ copyAllLabel }}</button>
        </template>
      </ToolResultPane>
    </section>
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
        <p class="tool-aside-note"><span>{{ PAGE.asideNotice }} Schema 结果按 JSONL 导出（一行一条）；<code>$ref</code>、<code>oneOf</code> 暂不支持。</span></p>
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
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/data/mock']
const usage = useToolUsage('/data/mock')

// 默认示例就是一份能跑的真 Schema：改字段或加 items 就能立刻看到结构化结果
const DEFAULT_SCHEMA = JSON.stringify({ type: 'object', required: ['id', 'name', 'email'], properties: {
  id: { type: 'integer', minimum: 1, maximum: 9999 }, name: { type: 'string', minLength: 2, maxLength: 8 },
  email: { type: 'string', format: 'email' }, status: { type: 'string', enum: ['active', 'disabled', 'pending'] },
  createdAt: { type: 'string', format: 'date-time' }, homepage: { type: 'string', format: 'uri' },
  tags: { type: 'array', items: { type: 'string', format: 'uuid' } },
} }, null, 2)

const mockTypeOptions = [['schema', 'JSON Schema 自定义结构'], ['name', '中文姓名'], ['email', '邮箱'], ['phone', '手机号'], ['idcard', '身份证号'], ['ip', 'IP 地址'], ['uuid', 'UUID']].map(([value, label]) => ({ value, label }))

const mockType = ref('schema'); const mockCount = ref(10); const seedText = ref(''); const schemaText = ref(DEFAULT_SCHEMA)
const results = ref([]); const usedSeed = ref(''); const errorText = ref(''); const copyAllState = ref('idle')

const state = computed(() => (errorText.value ? 'error' : results.value.length ? 'success' : 'empty'))
const copyAllLabel = computed(() => copyAllState.value === 'ok' ? TOOL_RESULT.copied : copyAllState.value === 'fail' ? TOOL_RESULT.copyFailed : '复制全部')

const surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '蒋', '沈', '韩', '杨', '朱', '秦', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜', '谢', '柏', '章', '苏', '范', '彭', '鲁', '马', '方', '任', '袁', '柳', '鲍', '史', '唐', '薛', '雷', '倪', '汤', '罗', '毕', '安', '常', '于', '傅', '齐', '康', '伍', '余', '顾', '孟', '黄', '穆', '萧', '尹']
const nameChars = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀', '霞', '平', '刚', '英', '华', '建', '文', '辉', '玲', '婷', '宇', '浩', '欣', '怡', '佳', '翔', '志', '凯', '博', '涵', '梓', '轩', '子', '墨', '辰', '瑞', '嘉', '逸', '宸', '煜', '昊', '天', '皓', '骏', '铭', '睿', '哲', '彦', '霖', '熙', '航', '泽', '诚', '毅', '聪', '慧', '雅', '诗', '思', '梦', '雪', '冰', '清', '月', '云', '风', '雨', '阳', '春', '夏', '秋', '冬', '晨', '曦', '露', '霜', '虹', '星', '海', '山', '川', '河', '林', '森', '松', '柏', '梅', '兰', '菊', '荷', '桃', '李', '杏', '枫', '楠', '榕', '桐', '蕾', '薇', '菁', '蕊', '茜', '莹', '芬', '香', '馨', '韵', '歌', '琴', '笛', '锋', '锐', '剑', '珍', '宝', '珠', '玉', '金', '银', '翠', '琦', '琪', '琳', '琅', '瑜', '璇', '璨', '璟', '岩', '峰', '岳', '岗', '原', '野', '园', '苑', '池', '泽', '滨', '岸', '桥', '锦', '绮', '罗', '绢', '书', '画', '咏', '唱', '舞', '跃', '飞', '翔', '飘', '沉', '升', '起', '落', '立', '悟', '晓', '亮', '红', '橙', '黄', '绿', '青', '蓝', '紫', '灰', '丹', '彤', '墨', '素', '彩', '俊', '俏', '美', '秀', '贤', '善', '仁', '义', '礼', '智', '信', '忠', '孝', '勇', '刚', '健', '壮', '康', '宁', '安', '泰', '和', '顺', '祥', '瑞', '吉', '利', '福', '禄', '寿', '喜', '庆', '欢', '乐', '悦', '畅', '舒', '宜', '稳', '固', '坚', '实', '厚', '重', '轻', '逸', '旷', '达', '豪', '爽', '坦', '荡', '正', '直', '公', '明', '朗', '深', '博', '精', '渊', '源', '长', '久', '远', '恒', '永', '持', '耐', '绵', '延', '连', '续', '继', '承', '传', '拓', '展', '扩', '进', '步', '提', '高', '增', '繁', '荣', '昌', '盛', '兴', '旺', '富', '裕', '丰', '饶', '硕', '厚', '多', '缤', '纷', '绚', '烂', '辉', '煌', '灿', '耀', '夺', '目']
const phonePrefixes = ['138', '139', '135', '136', '137', '150', '151', '152', '157', '158', '159', '182', '183', '187', '188', '130', '131', '132', '155', '156', '185', '186', '133', '153', '180', '189', '177', '178', '147']
const emailDomains = ['qq.com', '163.com', '126.com', 'sina.com', 'sohu.com', 'aliyun.com', 'outlook.com', 'hotmail.com', 'gmail.com', 'foxmail.com']

// 当前随机源：没填种子就是 Math.random；填了种子换成可复现的 mulberry32
let activeRandom = Math.random
const randInt = (min, max) => Math.floor(activeRandom() * (max - min + 1)) + min
const pickFrom = (list) => list[Math.floor(activeRandom() * list.length)]

function uuidFromRandom() {
  const bytes = Array.from({ length: 16 }, () => Math.floor(activeRandom() * 256))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

function makeIdcard() {
  const area = pickFrom(['110101', '310101', '440106', '500101', '510107', '420106', '330106', '320106', '610104', '410105'])
  const base = `${area}${randInt(1970, 2005)}${String(randInt(1, 12)).padStart(2, '0')}${String(randInt(1, 28)).padStart(2, '0')}${String(randInt(0, 999)).padStart(3, '0')}`
  // 模 11 加权校验位：和真实身份证规则一致，能通过校验器
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  let sum = 0
  for (let i = 0; i < 17; i += 1) sum += Number(base[i]) * weights[i]
  return base + ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'][sum % 11]
}

function genPreset(kind) {
  if (kind === 'name') return pickFrom(surnames) + pickFrom(nameChars) + (activeRandom() > 0.4 ? '' : pickFrom(nameChars))
  if (kind === 'email') return `${genPreset('name')}${randInt(100, 9999)}@${pickFrom(emailDomains)}`
  if (kind === 'phone') return pickFrom(phonePrefixes) + String(randInt(0, 99999999)).padStart(8, '0')
  if (kind === 'idcard') return makeIdcard()
  if (kind === 'ip') return `${randInt(1, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`
  return uuidFromRandom()
}

function hashSeed(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}
// mulberry32：32 位状态的小 PRNG，同种子必然同序列，够 mock 用且不引入依赖
// 状态变量取名 seedState 而不是 state：本页另有一个 `const state`（结果区状态），
// 同名会让「const 被重新赋值」的静态检查按名字跨作用域误报。
function mulberry32(seed) {
  let seedState = seed >>> 0
  return () => {
    seedState = (seedState + 0x6d2b79f5) >>> 0
    let t = seedState
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randomWord = (length) => Array.from({ length }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(activeRandom() * 26)]).join('')
const randomDate = () => new Date(Date.UTC(2000, 0, 1) + Math.floor(activeRandom() * 9e11))
const FORMAT_MAKERS = {
  'date-time': () => randomDate().toISOString(), date: () => randomDate().toISOString().slice(0, 10),
  email: () => `${randomWord(6)}@${pickFrom(emailDomains)}`, uuid: () => uuidFromRandom(),
  uri: () => `https://example.com/${randomWord(8)}`,
}

function mockFromSchema(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 8) return null
  if (Array.isArray(schema.enum) && schema.enum.length) return pickFrom(schema.enum)
  if (schema.const !== undefined) return schema.const
  const type = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : 'string')
  if (type === 'object') {
    const required = Array.isArray(schema.required) ? schema.required : []
    const output = {}
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (child && child.default !== undefined) { output[key] = child.default; continue }
      // 未列进 required 的字段有 1/4 概率缺席，模拟接口里的可选字段
      if (!required.includes(key) && activeRandom() < 0.25) continue
      output[key] = mockFromSchema(child, depth + 1)
    }
    return output
  }
  if (type === 'array') {
    const min = Number.isInteger(schema.minItems) ? schema.minItems : 1
    const max = Number.isInteger(schema.maxItems) ? schema.maxItems : Math.max(min, 3)
    return Array.from({ length: randInt(min, Math.max(min, max)) }, () => mockFromSchema(schema.items, depth + 1))
  }
  if (type === 'boolean' || type === 'null') return type === 'boolean' ? activeRandom() < 0.5 : null
  if (type === 'integer' || type === 'number') {
    const min = typeof schema.minimum === 'number' ? schema.minimum : 0
    const max = typeof schema.maximum === 'number' ? schema.maximum : min + 1000
    const value = min + activeRandom() * (max - min)
    return type === 'integer' ? Math.round(value) : Number(value.toFixed(3))
  }
  const formatted = schema.format ? (FORMAT_MAKERS[schema.format]?.() ?? null) : null
  if (formatted !== null) return formatted
  const minLength = Number.isInteger(schema.minLength) ? schema.minLength : 6
  const maxLength = Number.isInteger(schema.maxLength) ? Math.max(minLength, schema.maxLength) : Math.max(minLength, 12)
  return randomWord(randInt(minLength, maxLength))
}

function process() {
  const startedAt = performance.now()
  const count = Math.max(1, Math.min(100, Math.floor(mockCount.value) || 10))
  const seed = seedText.value.trim()
  activeRandom = seed ? mulberry32(hashSeed(seed)) : Math.random
  try {
    let items
    if (mockType.value === 'schema') {
      const schema = JSON.parse(schemaText.value)
      items = Array.from({ length: count }, () => mockFromSchema(schema))
    } else {
      items = Array.from({ length: count }, () => genPreset(mockType.value))
    }
    results.value = items.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
    usedSeed.value = seed
    errorText.value = ''
    copyAllState.value = 'idle'
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { kind: mockType.value, count, seeded: Boolean(seed) } })
  } catch (error) {
    results.value = []
    usedSeed.value = ''
    errorText.value = `Schema 解析失败：${error.message}`
    usage.record({ ok: false, errorCode: 'MOCK_SCHEMA_INVALID', durationMs: Math.round(performance.now() - startedAt) })
  }
}

function clear() { results.value = []; usedSeed.value = ''; errorText.value = ''; copyAllState.value = 'idle' }

async function copy(text, action) {
  const startedAt = performance.now()
  try {
    await navigator.clipboard.writeText(text)
    if (action === 'copyAll') copyAllState.value = 'ok'
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action } })
  } catch {
    if (action === 'copyAll') copyAllState.value = 'fail'
    usage.record({ ok: false, errorCode: 'MOCK_COPY_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}
</script>

<style scoped>
.mock-config-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: calc(var(--space-unit) * 2); }
.mock-results { display: flex; flex-direction: column; gap: calc(var(--space-unit)); max-height: 400px; overflow-y: auto; }
.mock-result-row { display: flex; align-items: center; gap: calc(var(--space-unit)); padding: calc(var(--space-unit)); background: var(--bg-surface-2); border-radius: var(--radius-input); }
.mock-result-index { font-size: var(--fs-sm); color: var(--text-secondary); min-width: 24px; }
.mock-result-text { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); flex: 1; word-break: break-all; }
.mock-copy-one { padding: 4px 8px; font-size: var(--fs-label); }
@media (max-width: 575px) { .mock-config-row { grid-template-columns: 1fr; } }
</style>
