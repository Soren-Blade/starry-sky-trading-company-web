<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="gamepad" aria-hidden="true" /><span>趣味工具</span></h2>
      <div class="u-field"><label class="u-field-label">游戏</label>
        <SelectField v-model="mode" :options="PAGE.modeOptions" />
      </div>

      <template v-if="mode === 'dice'">
        <div class="u-field"><label class="u-field-label">骰子个数</label><input v-model.number="diceCount" type="number" min="1" max="10" class="u-input" /></div>
        <div class="tool-actions">
          <button type="button" class="u-btn-primary" @click="rollDice">投掷</button>
        </div>
        <div v-if="diceResult.length" class="dice-display">
          <div v-for="(d, i) in diceResult" :key="i" class="die">{{ d }}</div>
        </div>
        <p v-if="diceResult.length" class="tool-result-note">总和: {{ diceSum }}</p>
      </template>

      <template v-if="mode === 'coin'">
        <div class="tool-actions">
          <button type="button" class="u-btn-primary" @click="flipCoin">投掷</button>
        </div>
        <div v-if="coinResult" class="coin-display" :class="{ flipping: coinFlipping }">
          <span class="coin-face">{{ coinResult }}</span>
        </div>
        <p v-if="coinStats.total > 0" class="tool-result-note">总计: {{ coinStats.total }} 次 | 正面: {{ coinStats.heads }} | 反面: {{ coinStats.tails }}</p>
      </template>

      <template v-if="mode === 'random-pick'">
        <div class="u-field"><label class="u-field-label">选项（每行一个）</label><textarea v-model="pickList" class="u-input tool-textarea" placeholder="选项1&#10;选项2&#10;选项3" /></div>
        <div class="tool-actions">
          <button type="button" class="u-btn-primary" :disabled="!pickOptions.length" @click="pickRandom">抽取</button>
        </div>
        <div v-if="pickResult" class="pick-result">{{ pickResult }}</div>
      </template>
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
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/fun/box']
const usage = useToolUsage('/fun/box')
// 三个小工具共用这一个上报点，用 kind 区分
function reportUsage(kind, startedAt) {
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { kind } })
}
const mode = ref('dice')
const diceCount = ref(1)
const diceResult = ref([])
const coinResult = ref('')
const coinFlipping = ref(false)
const coinStats = ref({ total: 0, heads: 0, tails: 0 })
const pickList = ref('')
const pickResult = ref('')

const diceSum = computed(() => diceResult.value.reduce((a, b) => a + b, 0))
const pickOptions = computed(() => pickList.value.split('\n').map(s => s.trim()).filter(Boolean))

function rand(max) { const arr = new Uint32Array(1); crypto.getRandomValues(arr); return (arr[0] % max) + 1 }
function rollDice() {
  const startedAt = performance.now()
  diceResult.value = Array.from({ length: diceCount.value }, () => rand(6))
  reportUsage('dice', startedAt)
}

function flipCoin() {
  const startedAt = performance.now()
  coinFlipping.value = true
  coinResult.value = ''
  setTimeout(() => {
    const isHead = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0
    coinResult.value = isHead ? '正面' : '反面'
    coinStats.value.total++
    if (isHead) coinStats.value.heads++; else coinStats.value.tails++
    coinFlipping.value = false
    reportUsage('coin', startedAt)
  }, 600)
}

function pickRandom() {
  if (!pickOptions.value.length) return
  const startedAt = performance.now()
  pickResult.value = pickOptions.value[rand(pickOptions.value.length) - 1]
  reportUsage('pick', startedAt)
}
</script>

<style scoped>
.dice-display { display: flex; justify-content: center; gap: calc(var(--space-unit) * 2); padding: calc(var(--space-unit) * 3); }
.die { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: var(--bg-surface-2); border-radius: var(--radius-card); font-family: var(--font-mono); font-size: var(--fs-h2); font-weight: var(--fw-heading); color: var(--accent); border: var(--stroke-width) solid var(--stroke-color); }
.coin-display { display: flex; justify-content: center; padding: calc(var(--space-unit) * 3); }
.coin-face { display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: var(--bg-surface-2); border-radius: 50%; font-size: var(--fs-h3); font-weight: var(--fw-heading); color: var(--accent); border: 2px solid var(--accent); transition: transform 0.3s; }
.coin-display.flipping .coin-face { animation: coinFlip 0.6s ease-in-out; }
@keyframes coinFlip { 0% { transform: rotateY(0); } 50% { transform: rotateY(900deg); } 100% { transform: rotateY(1080deg); } }
.pick-result { text-align: center; padding: calc(var(--space-unit) * 3); font-size: var(--fs-h2); font-weight: var(--fw-heading); color: var(--accent); background: var(--bg-surface-2); border-radius: var(--radius-card); }
</style>
