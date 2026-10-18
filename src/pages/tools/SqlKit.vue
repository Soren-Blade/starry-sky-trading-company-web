<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="database" aria-hidden="true" /><span>SQL 格式化</span></h2>
      <div class="u-field">
        <label class="u-field-label">SQL 语句</label>
        <textarea v-model="source" class="u-input tool-textarea" placeholder="输入 SQL..." spellcheck="false" rows="8"></textarea>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="format">格式化</button>
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>
    </section>

    <section v-if="result" class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>结果</span></h2>
      <pre class="tool-preview">{{ result }}</pre>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="copy">复制</button>
      </div>
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
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/data/sql']
const usage = useToolUsage('/data/sql')
const source = ref('')
const result = ref('')

const keywords = [
  'SELECT','FROM','WHERE','AND','OR','INSERT','INTO','VALUES','UPDATE','SET','DELETE',
  'CREATE','TABLE','DROP','ALTER','COLUMN','INDEX','JOIN','LEFT','RIGHT','INNER','OUTER',
  'ON','GROUP','BY','ORDER','HAVING','LIMIT','OFFSET','UNION','ALL','DISTINCT','AS',
  'IN','BETWEEN','LIKE','IS','NULL','NOT','EXISTS','CASE','WHEN','THEN','ELSE','END',
  'ASC','DESC','PRIMARY','KEY','FOREIGN','REFERENCES','DEFAULT','AUTO_INCREMENT',
  'COUNT','SUM','AVG','MAX','MIN','CAST','COALESCE','CONCAT','SUBSTRING','LENGTH',
  'UPPER','LOWER','TRIM','REPLACE','ROUND','NOW','DATE','YEAR','MONTH','DAY',
]

function format() {
  if (!source.value) return
  const startedAt = performance.now()
  let sql = source.value.trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .trim()

  // Uppercase keywords
  const kwRegex = new RegExp('\\b(' + keywords.join('|') + ')\\b', 'gi')
  sql = sql.replace(kwRegex, m => m.toUpperCase())

  // Simple line breaks
  sql = sql
    .replace(/\bSELECT\b/gi, '\nSELECT')
    .replace(/\bFROM\b/gi, '\nFROM')
    .replace(/\bWHERE\b/gi, '\nWHERE')
    .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
    .replace(/\bORDER BY\b/gi, '\nORDER BY')
    .replace(/\bHAVING\b/gi, '\nHAVING')
    .replace(/\bLIMIT\b/gi, '\nLIMIT')
    .replace(/\bOFFSET\b/gi, '\nOFFSET')
    .replace(/\bJOIN\b/gi, '\nJOIN')
    .replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
    .replace(/\bRIGHT JOIN\b/gi, '\nRIGHT JOIN')
    .replace(/\bINNER JOIN\b/gi, '\nINNER JOIN')
    .replace(/\bOUTER JOIN\b/gi, '\nOUTER JOIN')
    .replace(/\bUNION\b/gi, '\nUNION')
    .replace(/\bINSERT INTO\b/gi, '\nINSERT INTO')
    .replace(/\bVALUES\b/gi, '\nVALUES')
    .replace(/\bUPDATE\b/gi, '\nUPDATE')
    .replace(/\bSET\b/gi, '\nSET')
    .replace(/\bDELETE FROM\b/gi, '\nDELETE FROM')
    .replace(/\bCREATE TABLE\b/gi, '\nCREATE TABLE')
    .replace(/\bALTER TABLE\b/gi, '\nALTER TABLE')
    .replace(/\bDROP TABLE\b/gi, '\nDROP TABLE')
    .trim()

  result.value = sql
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { length: source.value.length } })
}

function clear() { source.value = ''; result.value = '' }
async function copy() { if (!result.value) return; try { await navigator.clipboard.writeText(result.value) } catch (e) { /* 剪贴板被拒绝时静默 */ } }
</script>
