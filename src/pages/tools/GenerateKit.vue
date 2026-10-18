<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="shuffle" aria-hidden="true" /><span>生成器</span></h2>
      <div class="u-field"><label class="u-field-label">类型</label>
        <SelectField v-model="genType" :options="PAGE.typeOptions" />
      </div>

      <template v-if="genType === 'uuid'">
        <div class="u-field"><label class="u-field-label">数量</label><input v-model.number="uuidCount" type="number" min="1" max="100" class="u-input" /></div>
      </template>
      <template v-if="genType === 'password'">
        <div class="u-field"><label class="u-field-label">长度</label><input v-model.number="pwdLength" type="number" min="4" max="128" class="u-input" /></div>
        <div class="tool-form">
          <label class="u-switch"><input type="checkbox" v-model="pwdUpper" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">大写字母</span></label>
          <label class="u-switch"><input type="checkbox" v-model="pwdLower" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">小写字母</span></label>
          <label class="u-switch"><input type="checkbox" v-model="pwdNumber" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">数字</span></label>
          <label class="u-switch"><input type="checkbox" v-model="pwdSymbol" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">符号</span></label>
        </div>
        <div v-if="passwordResult" class="pwd-strength" :class="pwdStrengthClass">
          <span class="pwd-strength-bar" :style="{ width: pwdStrength + '%' }"></span>
          <span class="pwd-strength-label">{{ pwdStrengthLabel }}</span>
        </div>
      </template>
      <template v-if="genType === 'random'">
        <div class="u-field"><label class="u-field-label">最小值</label><input v-model.number="randMin" type="number" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label">最大值</label><input v-model.number="randMax" type="number" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label">数量</label><input v-model.number="randCount" type="number" min="1" max="100" class="u-input" /></div>
      </template>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="generate">生成</button>
        <button type="button" class="u-btn-secondary" :disabled="!results.length" @click="copyAll">复制全部</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>结果</span></h2>
      <ToolResultPane :state="results.length ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="shuffle">
        <template v-if="results.length">
          <div class="gen-results">
            <div v-for="(r, i) in results" :key="i" class="gen-result-row">
              <code class="gen-result-text">{{ r }}</code>
              <button type="button" class="u-btn-secondary" style="padding:4px 8px;font-size:12px;" @click="copyOne(r)">复制</button>
            </div>
          </div>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
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
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/utility/generate']
const usage = useToolUsage('/utility/generate')
const genType = ref('uuid')
const uuidCount = ref(5)
const pwdLength = ref(16)
const pwdUpper = ref(true)
const pwdLower = ref(true)
const pwdNumber = ref(true)
const pwdSymbol = ref(true)
const randMin = ref(1)
const randMax = ref(100)
const randCount = ref(5)
const results = ref([])
const passwordResult = ref('')

function uuidv4() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === 'x' ? 0 : 1); return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) }) }
function randInt(min, max) { const arr = new Uint32Array(1); crypto.getRandomValues(arr); return min + (arr[0] % (max - min + 1)) }
function generatePassword() {
  let chars = ''; if (pwdLower.value) chars += 'abcdefghijklmnopqrstuvwxyz'; if (pwdUpper.value) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; if (pwdNumber.value) chars += '0123456789'; if (pwdSymbol.value) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  if (!chars) return ''
  const arr = new Uint32Array(pwdLength.value); crypto.getRandomValues(arr)
  passwordResult.value = Array.from(arr).map(v => chars[v % chars.length]).join('')
  return passwordResult.value
}

const pwdStrength = computed(() => {
  if (!passwordResult.value) return 0
  let s = 0; if (pwdLower.value) s += 10; if (pwdUpper.value) s += 10; if (pwdNumber.value) s += 10; if (pwdSymbol.value) s += 10
  s += Math.min(40, passwordResult.value.length * 2.5)
  return Math.min(100, s)
})
const pwdStrengthLabel = computed(() => { const s = pwdStrength.value; if (s < 40) return '弱'; if (s < 70) return '中'; return '强' })
const pwdStrengthClass = computed(() => { const s = pwdStrength.value; if (s < 40) return 'weak'; if (s < 70) return 'medium'; return 'strong' })

function generate() {
  const startedAt = performance.now()
  results.value = []
  switch (genType.value) {
    case 'uuid': for (let i = 0; i < uuidCount.value; i++) results.value.push(uuidv4()); break
    case 'password': results.value = [generatePassword()]; break
    case 'random': for (let i = 0; i < randCount.value; i++) results.value.push(randInt(randMin.value, randMax.value)); break
  }
  // 多种生成器共用这一个上报点，用 kind 区分
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { kind: genType.value, count: results.value.length } })
}

function copyAll() { navigator.clipboard.writeText(results.value.join('\n')) }
function copyOne(r) { navigator.clipboard.writeText(r) }
</script>

<style scoped>
.gen-results { display: flex; flex-direction: column; gap: calc(var(--space-unit)); }
.gen-result-row { display: flex; align-items: center; gap: calc(var(--space-unit)); padding: calc(var(--space-unit)); background: var(--bg-surface-2); border-radius: var(--radius-input); }
.gen-result-text { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); flex: 1; word-break: break-all; }
.pwd-strength { position: relative; height: 8px; background: var(--bg-surface-2); border-radius: 4px; margin-top: calc(var(--space-unit)); overflow: hidden; }
.pwd-strength-bar { position: absolute; left: 0; top: 0; height: 100%; border-radius: 4px; transition: width 0.3s; }
.pwd-strength.weak .pwd-strength-bar { background: var(--danger); }
.pwd-strength.medium .pwd-strength-bar { background: var(--warning); }
.pwd-strength.strong .pwd-strength-bar { background: var(--success); }
.pwd-strength-label { position: absolute; right: 0; top: -18px; font-size: var(--fs-label); color: var(--text-secondary); }
</style>
