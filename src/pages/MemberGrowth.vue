<template>
  <div class="page-shell page-shell--narrow growth-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">
        <router-link class="growth-back" :to="{ name: 'Member' }">会员中心</router-link>
      </p>
      <h1 class="page-shell-title">成长值</h1>
      <p class="page-shell-desc">
        消费、签到、开通会员与卡密兑奖都会攒成长值。成长值只升不降、不过期，攒够门槛就升级。
      </p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="sparkles" class="u-mm-state-icon" />
      <p class="u-mm-state-title">请先登录账号</p>
      <p class="u-mm-state-desc">登录后可查看成长值明细与升级进度</p>
      <div class="u-mm-state-actions">
        <button
          type="button"
          class="u-btn-primary"
          @click="userStore.openLoginModal('登录后可查看成长值明细与升级进度')"
        >
          立即登录
        </button>
      </div>
    </div>

    <template v-else>
      <!-- 汇总：三个数字直接来自服务端 `summary`，前端不做换算（卡面见 ui-kit-member.css §23） -->
      <section class="u-mm-stat-grid" aria-label="成长值汇总">
        <div class="u-mm-stat">
          <span class="u-mm-stat-label">累计成长值</span>
          <span class="u-mm-stat-num">{{ summary.growth }}</span>
          <span class="growth-stat-hint">只升不降，不过期</span>
        </div>
        <div class="u-mm-stat">
          <span class="u-mm-stat-label">成长值等级</span>
          <span class="u-mm-stat-num">{{ summary.level_name || '——' }}</span>
          <span class="growth-stat-hint">门槛 {{ summary.growth_threshold }}</span>
        </div>
        <div class="u-mm-stat">
          <span class="u-mm-stat-label">当前生效等级</span>
          <span class="u-mm-stat-num">{{ summary.effective_level_name || '未开通' }}</span>
          <span class="growth-stat-hint">{{ effectiveHint }}</span>
        </div>
      </section>

      <!-- 升级进度：满级（V8）时后端不下发下一档那四个键，整块不渲染（几何见 §8） -->
      <section v-if="hasNext" class="ui-card u-mm-growth">
        <p class="u-mm-growth-head">
          <span>
            再攒 <strong class="u-mm-growth-num">{{ summary.growth_to_next }}</strong> 成长值升到
            {{ summary.next_level_name }}
          </span>
          <span class="u-mm-growth-hint">（{{ summary.next_level_name }} 门槛 {{ summary.next_level_threshold }}）</span>
        </p>
        <div
          class="u-mm-growth-track"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuenow="progressPercent"
          :aria-valuetext="`已攒 ${summary.growth}，还差 ${summary.growth_to_next}`"
        >
          <div class="u-mm-growth-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </section>

      <!-- 来源说明：文案由服务端下发（「签到 5 点」「卡密 ×10」这些数字只在服务端有一份） -->
      <section class="growth-rules" aria-labelledby="growth-rules-title">
        <h2 id="growth-rules-title" class="growth-section-title">怎么攒成长值</h2>
        <ul class="growth-rules-list">
          <li v-for="rule in rules" :key="rule.key" class="ui-card growth-rule">
            <AppIcon :name="ruleIcon(rule.key)" class="growth-rule-icon" />
            <div class="growth-rule-text">
              <p class="growth-rule-name">{{ rule.name }}</p>
              <p class="growth-rule-desc">{{ rule.desc }}</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- 等级门槛：与套餐页共用同一张表（`MemberLevelLadder`），这里隐藏折扣/倍率两列 -->
      <MemberLevelLadder
        :levels="thresholds"
        :current-level="summary.level"
        title="等级门槛"
        description="成长值决定「成长值等级」；实际权益档位取会员等级与成长值等级里更高的一档。"
        :show-rewards="false"
      />

      <!-- 逐档对照：阈值表的六列（v1.4.0 新增）+ 折扣/加速，回答「升上去多拿什么」。
           门槛表只放门槛，权益数值放这里 —— 两处职责分开，避免一张表塞十列。 -->
      <section class="growth-matrix" aria-labelledby="growth-matrix-title">
        <h2 id="growth-matrix-title" class="growth-section-title">升到各档多拿什么</h2>
        <div class="u-table-wrap">
          <table class="u-table u-table--zebra u-mm-ladder u-mm-matrix-table">
            <caption class="visually-hidden">各等级档位的权益数值对照</caption>
            <thead>
              <tr>
                <th scope="col">等级</th>
                <th scope="col">成长值门槛</th>
                <th v-for="column in matrixColumns" :key="column.key" scope="col">
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="level in thresholds"
                :key="level.level"
                :class="{ 'is-current': level.level === summary.level }"
              >
                <th scope="row">{{ level.name || level.level }}</th>
                <td class="u-mm-ladder-num">{{ level.growth_threshold }}</td>
                <td v-for="column in matrixColumns" :key="column.key" class="u-mm-matrix-cell">
                  {{ thresholdCell(level, column) || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="growth-history" aria-labelledby="growth-history-title">
        <h2 id="growth-history-title" class="growth-section-title">成长值明细</h2>

        <div v-if="memberStore.loadingGrowth && !memberStore.growth.length" class="ui-card growth-skeleton">
          <span v-for="n in 3" :key="n" class="u-skeleton growth-skeleton-line"></span>
        </div>

        <!-- 出错与「空数据」分开：出错不该显示成「暂无记录」 -->
        <div v-else-if="memberStore.error" class="ui-card u-mm-state u-mm-state--error" role="alert">
          <AppIcon name="alert-triangle" class="u-mm-state-icon" />
          <p class="u-mm-state-title">{{ memberStore.error }}</p>
          <div class="u-mm-state-actions">
            <button type="button" class="u-btn-secondary" @click="memberStore.fetchGrowthHistory()">重试</button>
          </div>
        </div>

        <div v-else-if="!memberStore.growth.length" class="ui-card u-mm-state">
          <AppIcon name="file" class="u-mm-state-icon" />
          <p class="u-mm-state-title">还没有成长值记录</p>
          <p class="u-mm-state-desc">下单、签到、开通会员都会在这里留下记录</p>
        </div>

        <template v-else>
          <ul class="ui-card u-mm-ledger">
            <li v-for="row in memberStore.growth" :key="row.id" class="u-mm-ledger-row">
              <div class="u-mm-ledger-main">
                <span class="u-mm-ledger-type">{{ row.type_text }}</span>
                <span class="u-mm-ledger-sub">
                  <span>{{ formatTime(row.created_at) }}</span>
                  <span v-if="row.remark">{{ row.remark }}</span>
                  <!-- 关联单号：客服核对时要能定位到具体订单，与积分明细同一做法 -->
                  <span v-if="row.ref_order_no" class="u-mm-ledger-ref">单号 {{ row.ref_order_no }}</span>
                </span>
              </div>
              <div class="u-mm-ledger-right">
                <span
                  class="u-mm-ledger-delta"
                  :class="row.delta > 0 ? 'u-mm-ledger-delta--earn' : 'u-mm-ledger-delta--spend'"
                >
                  {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
                </span>
                <span class="u-mm-ledger-balance">累计 {{ row.growth_after }}</span>
              </div>
            </li>
          </ul>

          <!-- 分页：只有一页时不渲染控件（避免出现点不动的按钮） -->
          <nav v-if="memberStore.growthTotalPages > 1" class="u-mm-pager" aria-label="成长值明细分页">
            <span class="u-mm-pager-info">
              {{ memberStore.growthPage }} / {{ memberStore.growthTotalPages }}（共 {{ memberStore.growthTotal }} 条）
            </span>
            <div class="u-mm-pager-btns">
              <button
                type="button"
                class="u-btn-secondary"
                :disabled="!memberStore.growthHasPrev"
                @click="goPage(memberStore.growthPage - 1)"
              >
                上一页
              </button>
              <button
                type="button"
                class="u-btn-secondary"
                :disabled="!memberStore.growthHasNext"
                @click="goPage(memberStore.growthPage + 1)"
              >
                下一页
              </button>
            </div>
          </nav>
        </template>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * 成长值页（`/member/growth`，旧 `/growth` 重定向到此）
 *
 * 属于会员中心详情子页：顶部给回「会员中心」的入口，
 * 逐档对照表直接吃 `thresholds[]` 的 v1.4.0 六列新字段。
 *
 * 需求的原话是「缺少成长值体系的有效展示页，用户无法了解如何增加成长值」，
 * 所以这一页要回答两个问题，且**只回答这两个**：
 *   1. **怎么涨** —— `rules`（服务端下发的来源说明）+ 三张数字卡；
 *   2. **涨到哪一级** —— `MemberLevelLadder` 的门槛表 + 一条升级进度条。
 *
 * ## 纪律
 *
 *   1. **所有门槛、进度、发放额都来自 `summary`**（服务端 `get_growth_history` 算好的），
 *      前端只做两件展示算术：进度条百分比、`+` 号。门槛数字一个都不在本地抄。
 *   2. **满级靠「键不存在」判定**：V8 时后端不下发 `next_level` 系列四个键，
 *      所以这里判 `growth_to_next !== undefined`，**不能用 `> 0`**
 *      （0 也是有效值；用 `> 0` 会在「刚好攒满下一档」时把进度条整块藏掉）。
 *   3. **成长值等级 ≠ 生效等级**：`summary.level` 是成长值挣到的档，
 *      `summary.effective_level` 是取高者之后的档。两个都显示，并说清关系 ——
 *      否则用户会疑惑「我 V5 了为什么权益还是 V1」。
 *   4. 时间格式化用项目既有的 `formatISOTime`，不再抄第三份 `formatTime`。
 */
import { computed, onMounted } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import MemberLevelLadder from '@/components/MemberLevelLadder.vue'
import { MEMBER_BENEFIT_MAP, formatBenefitValue, memberMatrixColumns } from '@/constants/member.js'
import { formatISOTime } from '@/hooks/useSimpleTimeFormatter/index.js'
import { useMemberStore } from '@/stores/member.js'
import { useUserStore } from '@/stores/user.js'

const memberStore = useMemberStore()
const userStore = useUserStore()

/** 安全默认：历史为空时页面仍要能渲染（growth 是真实状态，不是「不适用」） */
const summary = computed(() => memberStore.growthSummary || {
  growth: 0,
  level: 'none',
  level_name: '',
  growth_threshold: 0,
  is_member: false,
  effective_level: 'none',
  effective_level_name: '',
  thresholds: [],
})

const thresholds = computed(() => summary.value.thresholds || [])
const rules = computed(() => memberStore.growthRules || [])

/**
 * 逐档对照表的列：列顺序与字段名来自 `constants/member.js` 的唯一实例，
 * 这里只覆盖三个标题（避开门槛表已有的「门槛 / 成长值」两列语义）
 */
const MATRIX_COLUMNS = memberMatrixColumns({
  discount: '折扣率',
  points_boost: '积分加速',
  points_deduct: '抵扣上限',
})

const matrixColumns = computed(() => MATRIX_COLUMNS)

/** 单格文案：类型与翻译表都来自 constants，数值来自服务端；缺数据给空串（由模板兜 '—'） */
function thresholdCell(level, column) {
  const meta = MEMBER_BENEFIT_MAP[column.key]
  if (!meta) return ''
  return formatBenefitValue({ type: meta.valueType, current: level[column.field] }, meta.tierLabels)
}

const hasNext = computed(() => summary.value.growth_to_next !== undefined)

const progressPercent = computed(() => {
  if (!hasNext.value) return 100
  const from = Number(summary.value.growth_threshold ?? 0)
  const to = Number(summary.value.next_level_threshold ?? 0)
  const growth = Number(summary.value.growth ?? 0)
  if (!(to > from)) return 0
  return Math.min(100, Math.max(0, Math.round(((growth - from) / (to - from)) * 100)))
})

const effectiveHint = computed(() => {
  if (!summary.value.effective_level_name) return '开通会员或攒成长值都会提升'
  if (summary.value.effective_level === summary.value.level) return '与成长值等级一致'
  return '会员等级更高，按更高的一档算'
})

/** 来源 → 图标（图标名来自 `AppIcon` 的图标集，没有 emoji） */
const RULE_ICONS = {
  earn_member: 'crown',
  earn_order: 'package',
  earn_checkin: 'clock',
  earn_card: 'key',
  note: 'info',
}

function ruleIcon(key) {
  return RULE_ICONS[key] || 'info'
}

function formatTime(value) {
  return formatISOTime(value, 'YYYY-MM-DD HH:mm')
}

function goPage(page) {
  memberStore.fetchGrowthHistory({ page })
}

onMounted(() => {
  if (!userStore.isLoggedIn) return
  memberStore.fetchGrowthHistory({ page: 1 })
})
</script>

<style scoped>
.growth-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 未登录 / 空态 —— 容器与文案层走共享分片 .u-mm-state（见 ui-kit-member.css §2） */

/* 汇总卡见 §23 的 .u-mm-stat-*；分片的统计卡没有「脚注」位，
   每张卡下面那行解释留在页面 */
.growth-stat-hint {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 升级进度：几何见 §8 的 .u-mm-growth-*（卡片留白由 .ui-card 给） */

.growth-section-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}

/* 来源说明 */
.growth-rules-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.growth-rule {
  display: flex;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
}
.growth-rule-icon {
  flex: none;
  font-size: var(--fs-h3);
  color: var(--accent);
}
.growth-rule-text {
  min-width: 0;
}
.growth-rule-name {
  margin: 0 0 calc(var(--space-unit) * 0.5);
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
}
.growth-rule-desc {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 明细：行与增减符号见 §16 的 .u-mm-ledger-*，分页见 §4 的 .u-mm-pager */
.growth-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2.5);
}
.growth-skeleton-line {
  height: calc(var(--space-unit) * 2);
}

/* ── 返回会员中心（详情子页回枢纽） ─────────────────── */
.growth-back {
  color: var(--accent);
}
.growth-back:hover {
  text-decoration: underline;
}

/* ── 逐档权益对照：门槛表只放门槛，权益数值集中在这里 ── */
.growth-matrix {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}
/* 表格本体与数值单元格见 §10 的 .u-mm-ladder-* 与 §11 的 .u-mm-matrix-*；
   这里只补一条分片没规定的排版：首列等级名不折行 */
.growth-matrix tbody th[scope='row'] {
  white-space: nowrap;
}
</style>
