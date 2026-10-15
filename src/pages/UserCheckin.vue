<template>
  <div class="page-shell page-shell--narrow checkin-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">
        <router-link class="checkin-back" :to="{ name: 'Profile' }">个人中心</router-link>
      </p>
      <h1 class="page-shell-title">每日签到</h1>
      <p class="page-shell-desc">
        连续签到积分更多：3 天起 15 分，7 天起 20 分；会员等级倍率对签到积分同样生效
      </p>
    </header>

    <div v-if="!userStore.isLoggedIn" class="ui-card checkin-state">
      <AppIcon name="check-circle" class="checkin-state-icon" />
      <p class="checkin-state-title">请先登录账号</p>
      <p class="checkin-state-desc">登录后即可每日签到赚积分</p>
      <button type="button" class="u-btn-primary" @click="userStore.openLoginModal('登录后即可签到')">
        立即登录
      </button>
    </div>

    <template v-else>
      <!-- ① 主签到区 -->
      <section class="ui-card checkin-hero">
        <div class="checkin-hero-info">
          <p class="checkin-streak">
            已连续签到 <strong>{{ pointsStore.streak }}</strong> 天
          </p>
          <p class="checkin-month">本月已签 {{ monthCount }} 天</p>
          <p v-if="pointsStore.points > 0" class="checkin-balance">
            当前 <router-link :to="{ name: 'Points' }">{{ pointsStore.points }} 积分</router-link>
            （可抵 ¥{{ pointsValueText }}）
          </p>
        </div>

        <button
          type="button"
          class="u-btn-primary checkin-btn"
          :disabled="pointsStore.todayChecked || pointsStore.checkingIn"
          @click="handleCheckin"
        >
          {{ checkinButtonText }}
        </button>
      </section>

      <!-- ② 日历。加载中给骨架，不显示「暂无记录」—— 那在数据回来前是错的 -->
      <section class="checkin-calendar">
        <div class="checkin-calendar-head">
          <h2 class="checkin-section-title">{{ calendarTitle }}</h2>
          <span class="checkin-calendar-hint">
            <template v-if="calendar">
              补签 {{ REPLENISH_COST }} 积分/次 · 剩余补签 {{ calendar.replenish_left }} 次
            </template>
          </span>
        </div>

        <div v-if="!calendar" class="ui-card checkin-skeleton">
          <span class="u-skeleton checkin-skeleton-line"></span>
        </div>

        <ul v-else class="ui-card checkin-grid">
          <li
            v-for="day in calendar.days"
            :key="day.date"
            class="checkin-cell"
            :class="{
              'is-checked': day.checked,
              'is-today': day.is_today,
              'is-future': day.future,
              'is-replenishable': canReplenish(day),
            }"
            :title="cellTitle(day)"
          >
            <!--
              可补签的日子渲染成按钮（1.5.0 M4）：不可补签的照旧是纯展示。
              不把每个格子都做成按钮 —— 那会让「已签到」「还没到」这些日子
              也能被聚焦，读屏时一路 Tab 过去全是无效目标。
            -->
            <button
              v-if="canReplenish(day)"
              type="button"
              class="checkin-cell-hit"
              :disabled="pointsStore.replenishingDate === day.date"
              :aria-label="cellTitle(day)"
              @click="handleReplenish(day)"
            >
              <span class="checkin-cell-day">{{ dayNumber(day.date) }}</span>
            </button>
            <template v-else>
              <span class="checkin-cell-day">{{ dayNumber(day.date) }}</span>
              <AppIcon v-if="day.checked" name="check-circle" class="checkin-cell-icon" />
            </template>
          </li>
        </ul>

        <!-- ③ 规则：连签档位与后端 sstc.checkin_base_points 必须一致 -->
        <ul class="ui-card checkin-rules">
          <li v-for="rule in rules" :key="rule.text" class="checkin-rule">
            <AppIcon :name="rule.icon" />
            <span>{{ rule.text }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * 每日签到（`/user/checkin`，旧 `/checkin` 重定向到此）—— 方案 §P0-5
 *
 * 语义归属：签到是**个人中心功能**，不是会员权益 —— 非会员同样每天签到赚积分，
 * 所以它挂在 `/user/*` 下，入口在顶栏下拉与个人中心，而不是会员中心。
 *
 * 与会员的关系只剩一处，且**方向是「会员影响签到」而不是「签到属于会员」**：
 * 服务端 `sstc.checkin` 会拿 `get_member_snapshot(...)->>'points_multiplier'`
 * 乘在每天的基础积分上（`v_points := round(v_base * v_mult)`），
 * 即等级倍率对签到积分同样生效。文案必须照实说 —— 早期版本写的是
 * 「会员消费积分另有等级倍率加成」，读起来像「签到不吃倍率」，与库里的公式相反。
 *
 * 三条纪律：
 *   1. **签到不传日期**：服务端按 `Asia/Shanghai` 判定「今天」。客户端传日期会让
 *      「客户端时区与服务器不一致」变成 bug 来源，而签到最在意这一点。
 *   2. **「今天已签到」是正常状态，不是错误**：服务端对重复签到返回 200 +
 *      `already=true`（不是 409），按钮因此置灰而不是弹错误。
 *   3. **余额用服务端返回的快照**（store 里已处理），不本地 +10。
 */
import { computed, onMounted } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { notify } from '@/hooks/useToast/index.js'
import { usePointsStore } from '@/stores/points.js'
import { useUserStore } from '@/stores/user.js'
import { formatPointsValue, REPLENISH_COST, REPLENISH_MONTHLY_LIMIT } from '@/constants/member.js'
import {
  canReplenishDay,
  checkinCellTitle,
  replenishErrorMessage,
  replenishRuleText,
} from '@/utils/checkinDisplay.js'

const pointsStore = usePointsStore()
const userStore = useUserStore()

const calendar = computed(() => pointsStore.calendar)
const monthCount = computed(() => calendar.value?.month_count ?? 0)
const pointsValueText = computed(() => formatPointsValue(pointsStore.points))

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

async function handleReplenish(day) {
  try {
    const result = await pointsStore.doReplenish(day.date)
    if (!result) return
    notify.success(
      `已补签 ${day.date}（消耗 ${result.cost} 积分，本月还可补签 ${result.replenish_left} 次）`,
    )
  } catch (error) {
    // 四种失败码各有各的说法（超出月度上限 / 这天已签 / 跨月或未来 / 积分不够）
    notify.error(replenishErrorMessage(error))
    // 失败也可能是「日历已经过期」（比如另一个标签页刚补过），重新拉一次对齐
    await pointsStore.fetchCalendar()
  }
}

/** 与后端 `sstc.checkin_base_points` 的档位一致，改一处必须改另一处 */
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
    // 日历里的连签与今日状态由服务端维护，签完重新拉一次保证一致
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

/* 未登录 */
.checkin-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 5);
  text-align: center;
}
.checkin-state-icon {
  font-size: var(--fs-h2);
  color: var(--accent);
}
.checkin-state-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.checkin-state-desc {
  margin: 0;
  color: var(--text-muted);
}

/* 主签到区 */
.checkin-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 3);
  padding: calc(var(--space-unit) * 4);
}
.checkin-streak {
  margin: 0;
  font-size: var(--fs-h3);
}
.checkin-streak strong {
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  color: var(--accent);
}
.checkin-month {
  margin: var(--space-unit) 0 0;
  color: var(--text-muted);
}
.checkin-balance {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.checkin-btn {
  flex-shrink: 0;
  min-width: calc(var(--space-unit) * 16);
}

/* 日历 */
.checkin-calendar-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: calc(var(--space-unit) * 2);
}
.checkin-section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.checkin-calendar-hint {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.checkin-skeleton {
  padding: calc(var(--space-unit) * 3);
}
.checkin-skeleton-line {
  display: block;
  height: calc(var(--space-unit) * 12);
  border-radius: var(--radius-media);
}
.checkin-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
  padding: calc(var(--space-unit) * 2);
  list-style: none;
}
.checkin-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 0.25);
  padding: calc(var(--space-unit) * 0.75) 0;
  font-size: var(--fs-label);
  border: var(--stroke-width) solid transparent;
  border-radius: var(--radius-media);
  color: var(--text-muted);
}
/* 已签到：用强调色底纹表达，不新增色值 */
.checkin-cell.is-checked {
  color: var(--accent);
  background: var(--bg-surface-2);
}
/* 今天：描边强调（与「已签到」是两件事，可能同时成立） */
.checkin-cell.is-today {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: var(--fw-heading);
}
.checkin-cell.is-future {
  opacity: 0.45;
}
/*
 * 可补签：虚线描边 + 手型光标，明确「这个格子能点」。
 * 用虚线而不是换色，是为了与「今天」（实线强调描边）区分开 ——
 * 两者可能同时成立于同一天（今天当然不可补签，但历史上曾经如此）。
 */
.checkin-cell.is-replenishable {
  border-style: dashed;
  border-color: var(--border);
  cursor: pointer;
}
.checkin-cell.is-replenishable:hover {
  border-color: var(--accent);
  color: var(--accent);
}
/*
 * 格子里的按钮：视觉上必须与父级 li 完全重合（否则点击热区只有数字那么大，
 * 手机上一半的点按会落空）。因此清掉按钮自身的边框/内边距/背景，只留交互语义。
 */
.checkin-cell-hit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.checkin-cell-hit:disabled {
  cursor: progress;
}
.checkin-cell-hit:focus-visible {
  outline: var(--stroke-width) solid var(--accent);
  outline-offset: calc(var(--stroke-width) * 2);
  border-radius: var(--radius-media);
}
.checkin-cell-icon {
  font-size: var(--fs-label);
}

/* 规则 */
.checkin-rules {
  margin: calc(var(--space-unit) * 2) 0 0;
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 3);
  list-style: none;
}
.checkin-rule {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 0.5) 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* 窄屏：主签到区改竖排，按钮占满宽度 */
@media (max-width: 575px) {
  .checkin-hero {
    flex-direction: column;
    align-items: stretch;
  }
  .checkin-btn {
    width: 100%;
  }
}

/* 返回个人中心（签到是个人中心功能，不是会员权益） */
.checkin-back {
  color: var(--accent);
}
.checkin-back:hover {
  text-decoration: underline;
}
</style>
