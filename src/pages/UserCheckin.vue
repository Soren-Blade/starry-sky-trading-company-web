<template>
  <div class="page-shell page-shell--narrow checkin-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">
        <router-link class="checkin-back" :to="{ name: 'Profile' }">个人中心</router-link>
      </p>
      <h1 class="page-shell-title">签到日历</h1>
      <p class="page-shell-desc">
        连续签到积分更多：3 天起 15 分、7 天起 20 分；会员等级倍率对签到积分同样生效
      </p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card u-mm-state u-mm-state--locked">
      <AppIcon name="check-circle" class="u-mm-state-icon" />
      <p class="u-mm-state-title">请先登录账号</p>
      <p class="u-mm-state-desc">登录后即可每日签到赚积分</p>
      <div class="u-mm-state-actions">
        <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后即可签到')">
          立即登录
        </button>
      </div>
    </div>

    <template v-else>
      <!--
        ① 今天的状态与唯一主操作。
        2.6.1 重排：原先把「连续天数 / 本月已签 / 当前积分」和签到按钮挤在同一行，
        按钮只是行内一个普通按钮；现在把「今天签没签」提到最前，按钮独占一栏，
        签完由状态徽标 + 按钮文案同时翻面，避免「签了但看不出签了」。
      -->
      <section class="ui-card checkin-hero" :class="{ 'is-done': pointsStore.todayChecked }">
        <div class="checkin-hero-main">
          <p class="checkin-today">
            <AppIcon :name="pointsStore.todayChecked ? 'check-circle' : 'clock'" />
            <span>{{ pointsStore.todayChecked ? '今天已签到' : '今天还没签到' }}</span>
          </p>
          <p class="checkin-streak">
            <strong>{{ pointsStore.streak }}</strong>
            <span>天连续签到</span>
          </p>
          <p class="checkin-tier-now">
            当前每天 <b>{{ tierPoints }}</b> 积分
            <span v-if="pointsStore.points > 0" class="checkin-balance">
              · 账户 {{ pointsStore.points }} 积分（可抵 ¥{{ pointsValueText }}）
            </span>
          </p>
        </div>

        <div class="checkin-hero-action">
          <button
            type="button"
            class="u-btn-primary checkin-btn"
            :disabled="pointsStore.todayChecked || pointsStore.checkingIn"
            @click="handleCheckin"
          >
            {{ checkinButtonText }}
          </button>
          <router-link class="checkin-detail-link" :to="{ name: 'Points' }">积分明细</router-link>
        </div>
      </section>

      <!-- ② 本月日历（左）+ 档位进度（右，垂直居中） -->
      <section class="ui-card checkin-calendar" aria-labelledby="checkin-cal-title">
        <div class="checkin-section-head checkin-cal-head">
          <div class="checkin-cal-titles">
            <h2 id="checkin-cal-title" class="checkin-section-title">{{ calendarTitle }}</h2>
            <span class="checkin-section-hint">
              <template v-if="calendar">
                本月已签 {{ monthCount }} 天 · 剩余补签 {{ calendar.replenish_left }} 次
                <template v-if="calendarFilter !== 'all'"> · 筛选命中 {{ filteredCount }} 天</template>
              </template>
            </span>
          </div>

          <!--
            1.1 日期显示筛选：只筛「日历里显示哪些日子」，不改统计口径
            （本月已签 / 剩余补签仍是整月的真实数字），避免筛完数字跟着变让人以为数据丢了。
          -->
          <!--
            3.0.0 月切换：服务端 `getCheckinCalendar` 本来就接受任意 month，
            前端只是把「上/下月 + 回到今天」接出来。往后没有意义（未来月全是空签），
            因此「下一个月」在当前月时禁用；「回到今天」也顺手把选择清掉。
          -->
          <div class="checkin-cal-tools">
            <div class="checkin-month-nav">
              <button
                type="button"
                class="checkin-nav-btn"
                aria-label="上一个月"
                @click="goMonth(-1)"
              >
                <AppIcon name="chevron-left" />
              </button>
              <button
                type="button"
                class="checkin-today-btn"
                :disabled="isCurrentMonth && !selectedOffToday"
                @click="goToday"
              >
                回到今天
              </button>
              <button
                type="button"
                class="checkin-nav-btn"
                :disabled="!canGoNext"
                aria-label="下一个月"
                @click="goMonth(1)"
              >
                <AppIcon name="chevron-right" />
              </button>
            </div>

            <SelectField
              id="checkin-date-filter"
              v-model="calendarFilter"
              class="checkin-cal-filter"
              :options="CALENDAR_FILTERS"
              aria-label="筛选日期显示"
            />
          </div>
        </div>

        <div class="checkin-cal-body">
          <div class="checkin-cal-main">
            <div v-if="!calendar" class="checkin-skeleton">
              <span class="u-skeleton checkin-skeleton-line"></span>
            </div>

            <template v-else>
              <ul class="checkin-weekdays" aria-hidden="true">
                <li v-for="label in WEEKDAYS" :key="label">{{ label }}</li>
              </ul>

              <!--
                3.0.0：格子从「点了直接补签」改成「点了选中」——
                选中后在右栏详情里再决定签到/补签，一个格子只会触发一件事，
                也才有位置放第二行（农历/节气/节日）与「休/班」角标。
              -->
              <ul class="checkin-grid">
                <li
                  v-for="cell in cells"
                  :key="cell.key"
                  class="checkin-cell"
                  :class="{
                    'checkin-blank': cell.type === 'blank',
                    'is-checked': cell.type === 'day' && cell.day.checked,
                    'is-today': cell.type === 'day' && cell.day.is_today,
                    'is-future': cell.type === 'day' && cell.day.future,
                    'is-replenishable': cell.type === 'day' && canReplenish(cell.day),
                    'is-selected': cell.type === 'day' && isSelected(cell.day),
                    'is-filtered-out': cell.type === 'day' && !dayMatchesFilter(cell.day),
                  }"
                >
                  <template v-if="cell.type === 'day'">
                    <button
                      v-if="dayMatchesFilter(cell.day)"
                      type="button"
                      class="checkin-cell-hit"
                      :aria-current="isSelected(cell.day) ? 'date' : undefined"
                      :aria-label="cellTitle(cell.day)"
                      @click="selectDay(cell.day)"
                    >
                      <span class="checkin-cell-top">
                        <span class="checkin-cell-day">{{ dayNumber(cell.day.date) }}</span>
                        <span v-if="badgeOf(cell.day)" class="checkin-cell-badge" :class="`is-${cell.day.dayType}`">
                          {{ badgeOf(cell.day) }}
                        </span>
                      </span>
                      <span class="checkin-cell-sub">{{ subLabel(cell.day) }}</span>
                      <AppIcon v-if="cell.day.checked" name="check-circle" class="checkin-cell-icon" />
                    </button>
                  </template>
                </li>
              </ul>

              <ul class="checkin-legend">
                <li v-for="item in legend" :key="item.label" class="checkin-legend-item">
                  <span class="checkin-legend-mark" :class="item.mark" aria-hidden="true" />
                  <span>{{ item.label }}</span>
                </li>
              </ul>
            </template>
          </div>

          <!--
            档位进度并入本卡片右侧并垂直居中：它回答的是「这一个月签下来值多少」，
            与左边的月历是同一件事的两个面，分成两张卡会把视线拉成 Z 字。
            档位数值与后端 sstc.checkin_base_points 一致，改一处必须改另一处。
          -->
          <aside class="checkin-cal-side" aria-label="签到详情">
            <!--
              ②-0 选中日详情：月历的天然搭档。
              点一格 → 右栏回答「这天是什么日子、我签没签、还能不能补」，
              补签按钮也从格子里搬到这儿（格子只负责选，避免误触直接扣积分）。
            -->
            <div class="checkin-side-block checkin-side-detail">
              <p class="checkin-side-eyebrow">{{ selectedTitle }}</p>
              <p class="checkin-side-sub">{{ selectedSubtitle }}</p>
              <p class="checkin-side-status" :class="`is-${selectedStatus.key}`">
                <AppIcon :name="selectedStatus.key === 'checked' ? 'check-circle' : 'clock'" />
                <span>{{ selectedStatus.label }}</span>
              </p>
              <button
                v-if="selectedStatus.action"
                type="button"
                class="u-btn-primary checkin-side-action"
                :disabled="actionBusy"
                @click="actOnSelected"
              >
                {{ selectedStatus.action === 'checkin' ? checkinButtonText : '补签这一天' }}
              </button>
            </div>

            <!--
              ②-1 今日档位：先回答「现在每天值多少」，再用进度条回答「还差几天」。
              三段共用一条左对齐轴与全宽分隔线，读起来是一个侧栏而不是四张卡。
            -->
            <div class="checkin-side-block">
              <h3 id="checkin-tiers-title" class="checkin-side-title">每日积分档位</h3>
              <p class="checkin-side-points">
                <strong>{{ tierPoints }}</strong>
                <span class="checkin-side-unit">积分 / 天</span>
              </p>
              <div
                class="checkin-side-progress"
                role="img"
                :aria-label="tierProgressLabel"
              >
                <span class="checkin-side-progress-bar" :style="{ width: `${tierProgressPercent}%` }" />
              </div>
              <p class="checkin-side-hint">{{ tierHint }}</p>
            </div>

            <!-- ②-2 三档阶梯：已达成/当前用边框与底色区分，不填实色（竖排填色会压沉卡片） -->
            <div class="checkin-side-block">
              <h3 class="checkin-side-title">连签里程碑</h3>
              <ol class="checkin-tier-rail">
                <li
                  v-for="tier in TIERS"
                  :key="tier.days"
                  class="checkin-tier"
                  :class="{
                    'is-reached': pointsStore.streak >= tier.days,
                    'is-current': currentTier.days === tier.days,
                  }"
                >
                  <span class="checkin-tier-dot" aria-hidden="true">
                    <AppIcon v-if="pointsStore.streak >= tier.days" name="check-circle" />
                  </span>
                  <span class="checkin-tier-days">连签 {{ tier.days }}+ 天</span>
                  <span class="checkin-tier-points">{{ tier.points }} 积分/天</span>
                </li>
              </ol>
            </div>

            <!--
              ②-3 本月账本：已签 / 最长连签 / 剩余补签。
              这三项都是月历上「看得见但数不出来」的量，放在侧栏底部收口。
              规则入口不在这里重复——下方 `checkin-rules` 卡片本身就是入口。
            -->
            <div class="checkin-side-block checkin-side-foot">
              <div class="checkin-side-figures">
                <div class="checkin-side-figure">
                  <span class="checkin-side-figure-value">{{ monthCount }}</span>
                  <span class="checkin-side-figure-label">已签天数</span>
                </div>
                <div class="checkin-side-figure">
                  <span class="checkin-side-figure-value">{{ monthLongestStreak }}</span>
                  <span class="checkin-side-figure-label">最长连签</span>
                </div>
                <div class="checkin-side-figure">
                  <span class="checkin-side-figure-value">{{ replenishLeft }}</span>
                  <span class="checkin-side-figure-label">剩余补签</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <!--
        ④ 规则与补签说明：6 条规则对老用户是「看一次就够」，常驻会把日历挤到屏幕外，
        因此收进 details（默认折叠），标题上写清里面有什么。
      -->
      <details class="ui-card checkin-rules">
        <summary class="checkin-rules-summary">签到规则与补签说明</summary>
        <ul class="checkin-rules-list">
          <li v-for="rule in rules" :key="rule.text" class="checkin-rule">
            <AppIcon :name="rule.icon" />
            <span>{{ rule.text }}</span>
          </li>
        </ul>
      </details>
    </template>
  </div>
</template>

<script setup>
/**
 * 每日签到（`/user/checkin`，旧 `/checkin` 重定向到此）
 *
 * 语义归属：签到是**个人中心功能**，不是会员权益 —— 非会员同样每天签到赚积分，
 * 所以它挂在 `/user/*` 下，入口在顶栏下拉与个人中心。
 *
 * 与会员的关系只剩一处，且**方向是「会员影响签到」而不是「签到属于会员」**：
 * 服务端 `sstc.checkin` 会拿 `get_member_snapshot(...)->>'points_multiplier'`
 * 乘在每天的基础积分上（`v_points := round(v_base * v_mult)`）。
 *
 * 版面（2.6.1 重排）：今天状态与主按钮 → 档位进度 → 本月日历 → 规则（折叠）。
 * 目标是在首屏回答三个问题：今天签没签、连签几天、还要签几天才涨到下一档。
 *
 * 三条纪律：
 *   1. **签到不传日期**：服务端按 `Asia/Shanghai` 判定「今天」。
 *   2. **「今天已签到」是正常状态，不是错误**：服务端返回 200 + `already=true`。
 *   3. **余额用服务端返回的快照**（store 里已处理），不本地 +10。
 */
import { computed, onMounted, ref } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import { notify } from '@/hooks/useToast/index.js'
import { createClickGuard } from '@/utils/rateLimit.js'
import { usePointsStore } from '@/stores/points.js'
import { useUserStore } from '@/stores/user.js'
import { formatPointsValue, REPLENISH_COST, REPLENISH_MONTHLY_LIMIT } from '@/constants/member.js'
import {
  buildCalendarCells,
  formatDayTitle,
  resolveDayBadge,
  resolveDayStatus,
  resolveDaySubLabel,
  shiftMonth,
} from '@/utils/checkinCalendar.js'
import {
  canReplenishDay,
  checkinCellTitle,
  checkinTierProgress,
  replenishErrorMessage,
  replenishRuleText,
} from '@/utils/checkinDisplay.js'

const pointsStore = usePointsStore()
const userStore = useUserStore()

/** 与后端 `sstc.checkin_base_points` 的档位一致，改一处必须改另一处 */
const TIERS = [
  { days: 1, points: 10 },
  { days: 3, points: 15 },
  { days: 7, points: 20 },
]

/** 周一为一周之始，与服务端「本周」口径一致（`date_trunc('week')` 在 PG 里也是周一） */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const calendar = computed(() => pointsStore.calendar)
const monthCount = computed(() => calendar.value?.month_count ?? 0)
const pointsValueText = computed(() => formatPointsValue(pointsStore.points))

const currentTier = computed(() => {
  const streak = pointsStore.streak || 0
  let hit = TIERS[0]
  for (const tier of TIERS) {
    if (streak >= tier.days) hit = tier
  }
  return hit
})

const tierPoints = computed(() => currentTier.value.points)

const nextTier = computed(() => TIERS.find((tier) => tier.days > (pointsStore.streak || 0)) || null)

const tierHint = computed(() => {
  const next = nextTier.value
  if (!next) return '已在最高档：每天 20 积分'
  const gap = next.days - (pointsStore.streak || 0)
  return `再连签 ${gap} 天升到 ${next.points} 积分/天`
})

/**
 * 侧栏三段的数据（2.6.3）。
 *
 * 背景：右栏原本只有「档位」一块、约 225px，却占着约 480px 的内容区高度，
 * 上下各空 128px —— 留白没有形状，看起来像内容没加载完。
 * 填充的正确做法不是把卡片加高（高度由 7×64px 的日历格决定，加高只会让洞更大），
 * 而是给这块空间补上「还差几天」与「本月账本」两类**本来就有**的真实数据。
 */
const replenishLeft = computed(() => calendar.value?.replenish_left ?? 0)

/** 本月最长连续签到：从 `days` 里数最长的一段 checked，不额外请求接口 */
const monthLongestStreak = computed(() => {
  let best = 0
  let run = 0
  for (const day of calendar.value?.days || []) {
    if (day.checked) {
      run += 1
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
})

/** 到下一档的进度：按「上一档 → 下一档」这一段算，跨档瞬间从 0% 重新开始 */
const tierProgressPercent = computed(
  () => checkinTierProgress(pointsStore.streak || 0, TIERS).percent,
)

const tierProgressLabel = computed(() => {
  const next = nextTier.value
  if (!next) return `连续签到 ${pointsStore.streak} 天，已在最高档`
  const gap = next.days - (pointsStore.streak || 0)
  return `连续签到 ${pointsStore.streak} 天，再连签 ${gap} 天升到每天 ${next.points} 积分`
})

const calendarTitle = computed(() => {
  const month = calendar.value?.month
  if (!month) return '本月签到'
  const [y, m] = month.split('-')
  return `${y} 年 ${Number(m)} 月`
})

const checkinButtonText = computed(() => {
  if (pointsStore.checkingIn) return '签到中…'
  return pointsStore.todayChecked ? '今天已签到' : '立即签到'
})

/**
 * 3.0.0 月历状态。
 *
 * `currentMonth` 为空表示「跟着服务端返回的当月走」——这样签到、补签之后
 * 调 `fetchCalendar()` 不用自己算今天是哪个月；只有用户翻了月才写死月份。
 */
const currentMonth = ref('')
const selectedDate = ref('')

const viewingMonth = computed(() => currentMonth.value || calendar.value?.month || '')
const isCurrentMonth = computed(() => !calendar.value || viewingMonth.value === calendar.value.month)
const canGoNext = computed(() => Boolean(calendar.value) && !isCurrentMonth.value)

/** 选中日：默认落在今天（不在本月时落在 1 号），翻月后重新落位 */
const selectedDay = computed(() => {
  const list = calendar.value?.days || []
  const hit = selectedDate.value ? list.find((day) => day.date === selectedDate.value) : null
  if (hit) return hit
  return list.find((day) => day.is_today) || list[0] || null
})

const todayIso = computed(() => calendar.value?.today || '')

/** 「回到今天」按钮只在「翻到了别的月」或「选了非今天的日期」时可点 */
const selectedOffToday = computed(() => Boolean(selectedDate.value) && selectedDate.value !== todayIso.value)

const selectedStatus = computed(() =>
  resolveDayStatus(selectedDay.value, todayIso.value, {
    // 与格子的虚线口径保持一致：次数或积分不够时右栏也不给补签按钮
    canReplenish: selectedDay.value ? canReplenish(selectedDay.value) : false,
  }),
)

const selectedTitle = computed(() => formatDayTitle(selectedDay.value?.date || ''))

/*
 * 选中日的副标题：**节日/节气放前面**，农历垫后。
 * 3.0.1 起服务端只在「正日子」下发 `holidayName`，所以这里能同时列出
 * 「国庆节 · 寒露 · 农历 八月廿八」而不会出现七天连续的「国庆节」。
 */
const selectedSubtitle = computed(() => {
  const day = selectedDay.value
  if (!day) return ''
  const parts = []
  if (day.holidayName) parts.push(day.holidayName)
  if (day.festival && day.festival !== day.holidayName) parts.push(day.festival)
  if (day.solarTerm) parts.push(day.solarTerm)
  if (day.lunarMonth) {
    // 初一只写月名（「农历 九月」），其余写「农历 八月廿八」
    parts.push(`农历 ${day.lunarMonth}${Number(day.lunarDay) === 1 ? '' : day.lunar || ''}`)
  }
  return parts.join(' · ')
})

const actionBusy = computed(() => pointsStore.checkingIn || Boolean(pointsStore.replenishingDate))

/** 格子：前导占位 + 整月日期，占位让 1 号落在正确的星期列 */
const cells = computed(() => buildCalendarCells(calendar.value?.days || []))

function isSelected(day) {
  return Boolean(day) && Boolean(selectedDay.value) && day.date === selectedDay.value.date
}

function selectDay(day) {
  if (!day) return
  selectedDate.value = day.date
}

function subLabel(day) {
  return resolveDaySubLabel(day)
}

function badgeOf(day) {
  return resolveDayBadge(day)
}

/** 翻月：服务端 `getCheckinCalendar` 支持任意 month，这里只负责把月份传下去 */
async function goMonth(delta) {
  const target = shiftMonth(viewingMonth.value, delta)
  if (!target) return
  currentMonth.value = target
  selectedDate.value = ''
  await pointsStore.fetchCalendar({ month: target })
}

async function goToday() {
  currentMonth.value = ''
  selectedDate.value = ''
  calendarFilter.value = 'all'
  await pointsStore.fetchCalendar()
}

/** 右栏详情里的主操作：今天→签到；过去漏签→补签 */
async function actOnSelected() {
  const day = selectedDay.value
  if (!day) return
  if (selectedStatus.value.action === 'checkin') {
    await handleCheckin()
    return
  }
  if (selectedStatus.value.action === 'replenish') {
    await handleReplenish(day)
  }
}

/** 翻着月看的时候刷新，必须留在用户当前看的月份上 */
async function refreshCalendar() {
  await pointsStore.fetchCalendar(currentMonth.value ? { month: currentMonth.value } : undefined)
}

const legend = [
  { label: '已签到', mark: 'is-checked' },
  { label: '今天', mark: 'is-today' },
  { label: `可补签（${REPLENISH_COST} 积分）`, mark: 'is-replenishable' },
  { label: '还没到', mark: 'is-future' },
]

/**
 * 1.1 日期显示筛选。
 *
 * 只筛「显示」，不改统计：`本月已签 N 天` 与 `剩余补签 N 次` 始终是整月的真实值 ——
 * 筛完让数字跟着变，用户会以为数据丢了。被筛掉的格子留空占位，网格因此不会塌行。
 */
const CALENDAR_FILTERS = [
  { value: 'all', label: '全部日期' },
  { value: 'checked', label: '只看已签到' },
  { value: 'pending', label: '只看待签到' },
  { value: 'replenishable', label: '只看可补签' },
]

const calendarFilter = ref('all')

function dayMatchesFilter(day) {
  if (calendarFilter.value === 'all') return true
  if (calendarFilter.value === 'checked') return Boolean(day.checked)
  if (calendarFilter.value === 'pending') return !day.checked && !day.future
  if (calendarFilter.value === 'replenishable') return canReplenish(day)
  return true
}

const filteredCount = computed(() => (calendar.value?.days || []).filter(dayMatchesFilter).length)

function dayNumber(date) {
  return Number(String(date).slice(-2))
}

/**
 * 补签的三条前置判断（纯函数在 `utils/checkinDisplay.js`）。
 *
 * 前端只判断「点了会不会白点」，真正的裁决仍在服务端 ——
 * 两边都判一次是有意的：置灰是为了别让用户点，服务端校验是为了防并发与绕过。
 */
function replenishOptions() {
  return {
    replenishLeft: calendar.value?.replenish_left ?? 0,
    points: pointsStore.points,
    cost: REPLENISH_COST,
  }
}

function canReplenish(day) {
  return canReplenishDay(day, replenishOptions()).ok
}

function cellTitle(day) {
  return checkinCellTitle(day, replenishOptions())
}

/**
 * 补签的点击闸门：补签是「消耗积分 + 占用当月名额」的写操作，连点两次会重复扣分。
 * 用 800ms 同步闸门而不是 store 的忙碌标记，因为补签按钮是日历格里的图标，没有 disabled 态可依赖。
 */
const replenishGuard = createClickGuard(800)

async function handleReplenish(day) {
  if (!replenishGuard()) return
  try {
    const result = await pointsStore.doReplenish(day.date)
    if (!result) return
    notify.success(
      `已补签 ${day.date}（消耗 ${result.cost} 积分，本月还可补签 ${result.replenish_left} 次）`,
    )
    // 补签会改「已签 / 剩余次数 / 连签」，留在当前翻到的月份上刷新
    await refreshCalendar()
  } catch (error) {
    // 四种失败码各有各的说法（超出月度上限 / 这天已签 / 跨月或未来 / 积分不够）
    notify.error(replenishErrorMessage(error))
    // 失败也可能是「日历已经过期」（比如另一个标签页刚补过），重新拉一次对齐
    await refreshCalendar()
  }
}

const rules = [
  { icon: 'check-circle', text: `连续签到 1-2 天：每天 10 积分` },
  { icon: 'check-circle', text: `连续签到 3-6 天：每天 15 积分` },
  { icon: 'check-circle', text: `连续签到 7 天以上：每天 20 积分` },
  { icon: 'landmark', text: `会员等级倍率对每天的基础积分同样生效；成长值固定 +5（100 积分 = ¥1）` },
  { icon: 'clock', text: `断签后连续天数从头计算；积分有效期 12 个月` },
  // 补签的数值与后端 `replenish_cost()` / `replenish_monthly_limit()` 必须一致
  { icon: 'clipboard', text: replenishRuleText(REPLENISH_COST, REPLENISH_MONTHLY_LIMIT) },
]

async function handleCheckin() {
  try {
    const result = await pointsStore.doCheckin()
    if (!result) return
    if (result.already) {
      notify.info('今天已经签过到了')
    } else {
      notify.success(`签到成功，获得 ${result.awarded} 积分（连签 ${result.streak} 天）`)
    }
    // 日历里的连签与今日状态由服务端维护，签完重新拉一次保证一致；
    // 同时把视图拉回当月 —— 停在旧月份会看不到刚签的那一天
    currentMonth.value = ''
    selectedDate.value = ''
    await pointsStore.fetchCalendar()
  } catch (error) {
    // 服务端不可达与业务失败都给同一句提示：用户能做的动作只有重试
    notify.error(error?.response?.data?.message || '签到失败，请稍后重试')
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) return
  pointsStore.fetchCalendar()
  if (!pointsStore.account) pointsStore.fetchAccount()
})
</script>

<style scoped>
.checkin-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* ── ① 今天的状态 ───────────────────────────────────────────── */

.checkin-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: calc(var(--space-unit) * 3);
  padding: calc(var(--space-unit) * 4);
}

.checkin-hero-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
  min-width: 0;
}

.checkin-today {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  color: var(--text-muted);
}

/* 已签到用成功色，未签到用主色 —— 状态靠「图标 + 颜色 + 文案」三重表达，不只靠颜色 */
.checkin-hero.is-done .checkin-today {
  color: var(--ec-success);
}

.checkin-streak {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  color: var(--text-muted);
}

.checkin-streak strong {
  font-family: var(--font-mono);
  font-size: calc(var(--fs-h1) * 0.9);
  line-height: 1;
  color: var(--text-primary);
}

.checkin-tier-now {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.checkin-tier-now b {
  color: var(--accent);
  font-family: var(--font-mono);
}

.checkin-balance {
  color: var(--text-muted);
}

.checkin-hero-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1);
  flex-shrink: 0;
}

.checkin-btn {
  min-width: calc(var(--space-unit) * 18);
}

.checkin-detail-link {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.checkin-detail-link:hover {
  color: var(--accent);
}

/* ── ② 档位进度 ─────────────────────────────────────────────── */

.checkin-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 2);
}

.checkin-section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}

.checkin-section-hint {
  font-size: var(--fs-label);
  color: var(--text-muted);
  text-align: right;
}

/* ── ② 日历（左）+ 档位（右） ─────────────────────────────── */

.checkin-calendar {
  padding: calc(var(--space-unit) * 3);
}

/* 标题在左、筛选器在右；窄屏自动折行（筛选器落到第二行靠左）。 */
.checkin-cal-head {
  align-items: flex-start;
  gap: calc(var(--space-unit) * 2);
}

.checkin-cal-titles {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}

.checkin-cal-titles .checkin-section-hint {
  text-align: left;
}

.checkin-cal-filter {
  flex: 0 0 auto;
  width: calc(var(--space-unit) * 30);
}

/* 月切换与筛选并排；窄屏时改成两行，筛选器占满一行 */
.checkin-cal-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: calc(var(--space-unit) * 1.5);
  flex: 0 0 auto;
}

.checkin-month-nav {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
}

.checkin-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 4.5);
  height: calc(var(--space-unit) * 4.5);
  border: 1px solid var(--ec-border-subtle);
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
}

.checkin-nav-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--ec-action-primary-dim);
}

.checkin-nav-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.checkin-today-btn {
  height: calc(var(--space-unit) * 4.5);
  padding: 0 calc(var(--space-unit) * 1.5);
  border: 1px solid var(--ec-border-subtle);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--fs-label);
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease;
}

.checkin-today-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.checkin-today-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 右栏第一段：选中日详情（3.0.0） */
.checkin-side-eyebrow {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.checkin-side-sub {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
  line-height: 1.5;
}

.checkin-side-status {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-secondary);
}

.checkin-side-status.is-checked {
  color: var(--ec-success);
}

.checkin-side-status.is-today-pending {
  color: var(--accent);
}

.checkin-side-status.is-missed {
  color: var(--ec-warning-text);
}

.checkin-side-action {
  width: 100%;
  margin-top: calc(var(--space-unit) * 0.5);
}

/*
 * 日期靠左、档位靠右并垂直居中（2.6.2）：
 * 月历格只有 7×64px 宽，居中会左右各留一大块空白；档位是「这个月值多少」的另一面，
 * 挪到右侧同一张卡里，视线从「今天」向右就是「能拿多少」。
 */
/*
 * 3.0.1：左栏按内容宽（7×64px 格 + 间距 ≈ 496px），右栏固定 320px，
 * 中间只留 24px gap，整体在卡片里居中 —— 两侧留白对称，不再出现「日历贴左、侧栏甩到最右」。
 * 3.0.0 是 `auto + space-between`，正是那段空白的来源。
 * 高度方向靠默认的 `align-items: stretch` + 侧栏 `justify-content: space-between`，
 * 让四段撑满，与左侧月历上下齐平。
 */
.checkin-cal-body {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, calc(var(--space-unit) * 40));
  justify-content: center;
  align-items: stretch;
  gap: calc(var(--space-unit) * 3);
  margin-top: calc(var(--space-unit) * 2.5);
}

.checkin-cal-main {
  min-width: 0;
  /* 侧栏通常比月历高：让日历在自己的那一行里垂直居中，底部的空白两侧才对称 */
  align-self: center;
}

.checkin-cal-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2.5);
  border: 1px solid var(--ec-border-subtle);
  border-radius: 12px;
  background: var(--bg-surface-2);
  min-width: 0;
}

/* 三段共用一条左对齐轴、分隔线全宽、段内不缩进 —— 读起来是一个侧栏，不是三张卡。 */
.checkin-side-block {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1);
  min-width: 0;
}

.checkin-side-block + .checkin-side-block {
  padding-top: calc(var(--space-unit) * 2);
  border-top: 1px solid var(--ec-border-subtle);
}

.checkin-side-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

/* 主数字：整个右栏只留这一个最大号，让「现在每天值多少」第一个被看见 */
.checkin-side-points {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
}

.checkin-side-points strong {
  font-family: var(--font-mono);
  font-size: calc(var(--space-unit) * 2.75);
  line-height: 1;
  color: var(--accent);
}

.checkin-side-unit {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 到下一档的进度：细条不抢主数字，但把「还差几天」变成可测量的距离 */
.checkin-side-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ec-border-subtle);
}

.checkin-side-progress-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 240ms ease;
}

.checkin-side-hint {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.checkin-side-figures {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: calc(var(--space-unit) * 1);
}

.checkin-side-figure {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.checkin-side-figure-value {
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
  line-height: 1.2;
  color: var(--text-primary);
}

.checkin-side-figure-label {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 右侧是竖排三档：横排的话每块只剩 60px 宽，数字与文案都要换行。 */
.checkin-tier-rail {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: calc(var(--space-unit) * 1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.checkin-tier {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1);
  padding: calc(var(--space-unit) * 1) calc(var(--space-unit) * 1.5);
  border: 1px solid var(--ec-border-subtle);
  border-radius: 10px;
  background: var(--bg-surface);
}

/* 已达成的档位：边框与数字用主色，但不填实色 —— 竖排三块，实色会把卡片压沉 */
.checkin-tier.is-reached {
  border-color: var(--ec-action-primary-border);
}

.checkin-tier.is-current {
  background: var(--ec-action-primary-dim);
}

.checkin-tier-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 2.5);
  height: calc(var(--space-unit) * 2.5);
  border-radius: 50%;
  border: 1px solid var(--ec-border-subtle);
  color: var(--accent);
}

.checkin-tier.is-reached .checkin-tier-dot {
  border-color: var(--ec-action-primary-border);
  background: var(--ec-action-primary-dim);
}

.checkin-tier-days {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.checkin-tier-points {
  font-family: var(--font-mono);
  font-size: var(--fs-h3);
  color: var(--text-primary);
}

/* ── ③ 日历 ─────────────────────────────────────────────────── */

.checkin-calendar {
  padding: calc(var(--space-unit) * 3);
}

/* 轨道宽度（不是容器宽度）：格子是 aspect-ratio: 1 的正方形、七列等分容器宽。
 * 本页容器最宽到 --container-page-narrow，照抄 1fr 会让桌面每格被撑成 160px 的巨块，
 * 与「月份标题 + 提示」的文字层级脱节。页面不得自设 max-width（componentClasses.test.js 把关），
 * 所以这里收的是轨道：每格 8 × 8px = 64px。
 * 2.6.2 起 `justify-content: start`：月历移到卡片左侧，右侧让给档位栏。 */
.checkin-weekdays,
.checkin-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, calc(var(--space-unit) * 8)));
  justify-content: start;
  gap: calc(var(--space-unit) * 1);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 被筛选隐藏的日子：留占位保持网格对齐，但不显示日期、勾选与任何状态底色。
 * 选择器带 `.checkin-grid` 是为了压过 `.checkin-cell.is-checked`（同层都要 0,3,0）。 */
.checkin-grid .checkin-cell.is-filtered-out,
.checkin-grid .checkin-cell.is-filtered-out.is-checked,
.checkin-grid .checkin-cell.is-filtered-out.is-today,
.checkin-grid .checkin-cell.is-filtered-out.is-future,
.checkin-grid .checkin-cell.is-filtered-out.is-replenishable {
  border-color: transparent;
  background: none;
  box-shadow: none;
  opacity: 1;
  color: transparent;
  pointer-events: none;
}

.checkin-cell.is-filtered-out::before {
  content: '';
  width: calc(var(--space-unit) * 0.5);
  height: calc(var(--space-unit) * 0.5);
  border-radius: 999px;
  background: var(--ec-border-subtle);
}

.checkin-weekdays {
  margin-bottom: calc(var(--space-unit) * 1);
  font-size: var(--fs-label);
  color: var(--text-muted);
  text-align: center;
}

/*
 * 前导占位与日期格共用 `.checkin-cell`（网格列宽要一致），
 * 所以必须把格子的边框与底色显式去掉，否则月初会出现一排空方块。
 *
 * 用 `.checkin-grid .checkin-blank` 而不是单个类：`.checkin-cell` 在本文件里定义得更晚，
 * 同为 0,1,0 时后者胜出，单价选择器会被它的 `border`/`background` 盖掉（已踩过一次）。
 */
.checkin-grid .checkin-blank {
  aspect-ratio: 1;
  border-color: transparent;
  background: transparent;
}

/*
 * 3.0.0：格子从 64×64 的正方形改成 76px 高的竖长条 —— 第二行（农历/节气/节日）
 * 需要一条独立基线，挤在正方形里会把日期数字压扁。宽度仍由 7 等分决定。
 */
.checkin-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(var(--space-unit) * 9.5);
  border: 1px solid var(--ec-border-subtle);
  border-radius: 10px;
  background: var(--bg-surface-2);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.checkin-cell.is-checked {
  border-color: var(--ec-success-border, var(--ec-border-subtle));
  background: var(--ec-success-soft);
  color: var(--ec-success);
}

/* 今天用内描边环表示，不抢「已签到」的实心底色 —— 两者的信息量不同 */
.checkin-cell.is-today {
  box-shadow: inset 0 0 0 1.5px var(--accent);
  color: var(--text-primary);
}

/*
 * 选中：底色提亮 + 边框换成主色。**不用外描边环**，
 * 因为「今天」已经占用了 box-shadow 这个通道，两环叠在一起会变成双层描边。
 */
.checkin-cell.is-selected {
  border-color: var(--accent);
  background: var(--ec-action-primary-dim);
  color: var(--text-primary);
}

.checkin-cell.is-future {
  opacity: 0.5;
}

/* 可补签：虚线 + 主色，与「已签到」的实线实心明确区分 */
.checkin-cell.is-replenishable {
  border-style: dashed;
  border-color: var(--ec-action-primary-border);
  background: transparent;
  color: var(--accent);
}

.checkin-cell-hit {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 1px;
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 0.75);
  border: none;
  border-radius: inherit;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
}

.checkin-cell-hit:disabled {
  cursor: progress;
}

.checkin-cell-top {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
}

.checkin-cell-day {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  line-height: 1.1;
}

/* 休 / 班：12px 放不下两个字，用单字 + 语义色区分 */
.checkin-cell-badge {
  font-size: 10px;
  font-weight: var(--fw-label);
  line-height: 1;
}

.checkin-cell-badge.is-holiday {
  color: var(--ec-danger);
}

.checkin-cell-badge.is-workday {
  color: var(--ec-warning-text);
}

/* 第二行只放一条（优先级见 `resolveDaySubLabel`），超长省略而不是换行 */
.checkin-cell-sub {
  display: block;
  font-size: 10px;
  line-height: 1.2;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checkin-cell.is-checked .checkin-cell-sub {
  color: var(--ec-success);
}

.checkin-cell-icon {
  position: absolute;
  right: 3px;
  bottom: 2px;
  font-size: 10px;
}

.checkin-legend {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 2);
  margin: calc(var(--space-unit) * 2) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.checkin-legend-item {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
}

.checkin-legend-mark {
  width: 12px;
  height: 12px;
  border: 1px solid var(--ec-border-subtle);
  border-radius: 4px;
  background: var(--bg-surface-2);
}

.checkin-legend-mark.is-checked {
  border-color: var(--ec-success-border, var(--ec-border-subtle));
  background: var(--ec-success-soft);
}

.checkin-legend-mark.is-today {
  box-shadow: inset 0 0 0 1.5px var(--accent);
}

.checkin-legend-mark.is-replenishable {
  border-style: dashed;
  border-color: var(--ec-action-primary-border);
  background: transparent;
}

.checkin-legend-mark.is-future {
  opacity: 0.5;
}

.checkin-skeleton {
  padding: calc(var(--space-unit) * 3);
}

/* ── ④ 规则（折叠） ─────────────────────────────────────────── */

.checkin-rules {
  padding: calc(var(--space-unit) * 2.5) calc(var(--space-unit) * 3);
}

.checkin-rules-summary {
  cursor: pointer;
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  color: var(--text-primary);
}

.checkin-rules-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1);
  margin: calc(var(--space-unit) * 2) 0 0;
  padding: 0;
  list-style: none;
}

.checkin-rule {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* ── 窄屏 ─────────────────────────────────────────────────── */

@media (max-width: 767px) {
  .checkin-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--space-unit) * 2);
  }

  .checkin-hero-action {
    align-items: stretch;
  }

  .checkin-btn {
    width: 100%;
  }

  .checkin-detail-link {
    text-align: center;
  }

  .checkin-tier-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 窄屏放不下「日期在左、档位在右」：先日历、后档位竖排 */
  .checkin-cal-body {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--space-unit) * 2.5);
  }

  .checkin-cal-filter {
    width: 100%;
  }

  /* 窄屏把月切换与筛选各占一行，避免挤成两个半截控件 */
  .checkin-cal-tools {
    width: 100%;
    justify-content: space-between;
  }

  .checkin-section-head {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 0.5);
  }

  .checkin-section-hint {
    text-align: left;
  }

  .checkin-weekdays,
  .checkin-grid {
    grid-template-columns: repeat(7, minmax(0, calc(var(--space-unit) * 5.5)));
  }

  /*
   * 窄屏格子只有 44px 宽，第二行（农历/节气）会被压成两个字一行 ——
   * 宁可只留日期数字，也不要在手机上塞一条读不全的副标题。
   * 副数据在右栏详情里仍然完整（选中日那里会写「农历 八月廿八 · 寒露」）。
   */
  .checkin-cell-sub {
    display: none;
  }

  .checkin-cell {
    min-height: calc(var(--space-unit) * 6.5);
  }
}
</style>
