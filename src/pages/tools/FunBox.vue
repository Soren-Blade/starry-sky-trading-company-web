<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="gamepad" aria-hidden="true" /><span>娱乐模式</span></h2>
      <p class="tool-result-note">以下只是本地随机数带来的娱乐结果，不测算任何真实概率或运势，也不连接服务器。</p>
      <div class="u-field"><label class="u-field-label">玩法</label>
        <SelectField v-model="mode" :options="PAGE.modeOptions" />
      </div>

      <template v-if="mode === 'dice'">
        <div class="u-field"><label class="u-field-label">骰子个数（1-10）</label><input v-model.number="diceCount" type="number" min="1" max="10" class="u-input" /></div>
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
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/fun/box']
const usage = useToolUsage('/fun/box')
// 三种玩法共用一个上报点，用 kind 区分
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

// 拒绝采样取 [0, max) 的均匀随机整数：直接取模会让小 index 略占优，骰子就不公平了
function randomBelow(max) {
  const buffer = new Uint32Array(1)
  const limit = Math.floor(4294967296 / max) * max
  let value = 0
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)
  return value % max
}

function rollDice() {
  const startedAt = performance.now()
  const count = Math.max(1, Math.min(10, Math.floor(diceCount.value) || 1))
  diceResult.value = Array.from({ length: count }, () => randomBelow(6) + 1)
  reportUsage('dice', startedAt)
}

// 硬币动画用 setTimeout：卸载时清掉，避免在已销毁组件上写状态
let flipTimer = null
onUnmounted(() => {
  if (flipTimer) clearTimeout(flipTimer)
  flipTimer = null
})

function flipCoin() {
  const startedAt = performance.now()
  coinFlipping.value = true
  coinResult.value = ''
  flipTimer = setTimeout(() => {
    const isHead = randomBelow(2) === 0
    coinResult.value = isHead ? '正面' : '反面'
    coinStats.value.total++
    if (isHead) coinStats.value.heads++; else coinStats.value.tails++
    coinFlipping.value = false
    flipTimer = null
    reportUsage('coin', startedAt)
  }, 600)
}

function pickRandom() {
  if (!pickOptions.value.length) return
  const startedAt = performance.now()
  pickResult.value = pickOptions.value[randomBelow(pickOptions.value.length)]
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
