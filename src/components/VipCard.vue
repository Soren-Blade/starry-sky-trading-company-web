<template>
  <article
    class="ec-vip vip-card"
    :class="appearanceClass"
    :data-appearance="appearance"
    :aria-label="`会员卡：${displayName}`"
  >
    <div class="ec-vip__head vip-card__head">
      <AppIcon name="crown" class="ec-vip__crown" />
      <span class="ec-vip__name vip-card__name">{{ displayName }}</span>
      <span
        v-if="expiryText"
        class="ec-vip__exp"
        :class="{ 'vip-card__exp--warning': expiring }"
      >
        {{ expiryText }}
      </span>
    </div>

    <div v-if="hasGrowth" class="ec-vip__growth">
      <div
        class="ec-progress"
        :class="{ 'ec-progress--gold': appearance === 'black' }"
        role="progressbar"
        aria-label="成长值进度"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="percentValue"
        :aria-valuetext="growthAriaText"
      >
        <div class="ec-progress__bar" :style="{ width: `${percentValue}%` }"></div>
      </div>
      <div class="ec-vip__growth-row">
        <span>成长值 {{ growthValue }}</span>
        <span>{{ growthHintText }}</span>
      </div>
    </div>

    <ul v-if="visibleBenefits.length" class="ec-vip__perks vip-card__perks" aria-label="会员权益">
      <li
        v-for="perk in visibleBenefits"
        :key="perk.key || perk.name"
        class="vip-card__perk"
        :class="{ 'is-locked': !perk.unlocked }"
      >
        <AppIcon
          :name="perk.icon || (perk.unlocked ? 'star' : 'lock')"
          class="vip-card__perk-icon"
        />
        <span class="vip-card__perk-name">{{ perk.name }}</span>
        <span class="vip-card__perk-value">
          {{ perk.valueText || (perk.unlocked ? '已拥有' : '未拥有') }}
        </span>
      </li>
    </ul>

    <p v-if="note" class="vip-card__note">{{ note }}</p>

    <div v-if="visibleActions.length" class="vip-card__actions">
      <router-link
        v-for="action in visibleActions"
        :key="action.label"
        :to="action.to"
        class="ec-btn ec-btn--sm"
        :class="actionClass(action)"
      >
        {{ action.label }}
      </router-link>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

import AppIcon from './AppIcon.vue'
import { memberLevelLabel } from '../constants/member.js'

/**
 * 会员等级 → 卡片外观的唯一映射表。
 *
 * 分档依据是 README 里「权益随等级递进」的业务语义，而不是在这里重算任何门槛数字：
 *   - v1–v3 silver：入门档，权益以积分、折扣、包邮等基础项为主；
 *   - v4–v6 gold：进阶档，开始出现专属客服、生日礼遇等有人力成本的权益；
 *   - v7–v8 black：顶阶，权益是更高倍率/专属通道一类稀缺项，数量少、身份属性最强。
 *
 * 三个外观与 ec-design-system 的 `.ec-vip--silver/--gold/--black` 一一对应。
 * 数值门槛仍只由 MemberLevelLadder 展示的接口数据提供，这里绝不复制第二份。
 */
const LEVEL_APPEARANCES = Object.freeze({
  v1: 'silver',
  v2: 'silver',
  v3: 'silver',
  v4: 'gold',
  v5: 'gold',
  v6: 'gold',
  v7: 'black',
  v8: 'black',
})

/** 卡内动作只开放两种低风险按钮，且渲染时再硬截断到 3 个。 */
const ACTION_VARIANTS = Object.freeze({
  primary: 'ec-btn--primary',
  secondary: 'ec-btn--secondary',
})

const props = defineProps({
  level: { type: String, default: 'v1' },
  name: { type: String, default: '' },
  expireAt: { type: String, default: '' },
  expireHint: { type: String, default: '' },
  expiring: { type: Boolean, default: false },
  growth: { type: Number, default: 0 },
  growthMax: { type: Number, default: 0 },
  percent: { type: Number, default: null },
  growthHint: { type: String, default: '' },
  benefits: { type: Array, default: () => [] },
  actions: { type: Array, default: () => [] },
  note: { type: String, default: '' },
})

const rawLevel = computed(() => String(props.level ?? '').trim().toLowerCase())

/** 未知等级（含空值、脏数据）安全回落到 v1，不抛错也不渲染空外观。 */
const levelKey = computed(() =>
  Object.prototype.hasOwnProperty.call(LEVEL_APPEARANCES, rawLevel.value)
    ? rawLevel.value
    : 'v1'
)

const appearance = computed(() => LEVEL_APPEARANCES[levelKey.value])
const appearanceClass = computed(() => `ec-vip--${appearance.value}`)

const displayName = computed(() => {
  if (props.name) return props.name
  // none 是 member.js 里已登记的非会员态，名称不该伪装成 V1。
  if (rawLevel.value === 'none') return '非会员'
  return memberLevelLabel(levelKey.value) || '会员卡'
})

/**
 * 只做日期展示，不做剩余天数计算：剩余天数由调用方按接口返回值传入，
 * 避免前端再算一份与服务端不一致的到期逻辑。
 */
const expiryText = computed(() => {
  const raw = String(props.expireAt || '').trim()
  const datePart = raw.match(/^\d{4}-\d{2}-\d{2}/)
  const base = datePart ? `${datePart[0]} 到期` : raw
  const hint = String(props.expireHint || '').trim()
  if (!base) return hint
  return hint ? `${base} · ${hint}` : base
})

const growthValue = computed(() => {
  const value = Number(props.growth)
  return Number.isFinite(value) ? Math.max(0, value) : 0
})

const growthMaxValue = computed(() => {
  const value = Number(props.growthMax)
  return Number.isFinite(value) ? Math.max(0, value) : 0
})

const hasGrowth = computed(
  () => growthMaxValue.value > 0 || growthValue.value > 0 || Boolean(props.growthHint)
)

function clampPercent(value) {
  return Math.min(100, Math.max(0, value))
}

/** 优先用调用方传入的百分比；否则按 growth / growthMax 换算，两者都不改数据源。 */
const percentValue = computed(() => {
  const explicit = Number(props.percent)
  if (props.percent !== null && props.percent !== undefined && Number.isFinite(explicit)) {
    return clampPercent(Math.round(explicit))
  }
  if (growthMaxValue.value <= 0) return growthValue.value > 0 ? 100 : 0
  return clampPercent(Math.round((growthValue.value / growthMaxValue.value) * 100))
})

const growthHintText = computed(() => {
  const hint = String(props.growthHint || '').trim()
  if (hint) return hint
  if (!hasGrowth.value) return ''
  if (growthValue.value >= growthMaxValue.value) return '已达当前档位'
  return `距下一档还差 ${growthMaxValue.value - growthValue.value}`
})

const growthAriaText = computed(() => {
  const parts = [`成长值 ${growthValue.value}`]
  if (growthHintText.value) parts.push(growthHintText.value)
  return parts.join('，')
})

const visibleBenefits = computed(() =>
  (Array.isArray(props.benefits) ? props.benefits : []).filter(
    (perk) => perk && (perk.name || perk.key)
  )
)

const visibleActions = computed(() =>
  (Array.isArray(props.actions) ? props.actions : [])
    .filter((action) => action && action.label && action.to)
    .slice(0, 3)
)

function actionClass(action) {
  return ACTION_VARIANTS[action.variant] || ACTION_VARIANTS.secondary
}
</script>

<style scoped>
.vip-card__head {
  flex-wrap: wrap;
}

.vip-card__name {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* 即将到期只加粗 + 警示色令牌，不引入危险红。 */
.vip-card__exp--warning {
  color: var(--ec-warning-text);
  font-weight: 600;
  opacity: 1;
}

.vip-card__perks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: var(--ec-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.vip-card__perk {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ec-space-2);
  min-width: 0;
  padding: var(--ec-space-2) var(--ec-space-3);
  border-radius: var(--ec-radius-md);
  background: var(--ec-bg-wash);
}

/*
 * 金色/黑色卡面底色很深，令牌边框在这两种卡上会显得突兀；
 * 用半透明 currentColor 描边，让边线跟着卡面文字色走。
 */
.vip-card__perk::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid currentColor;
  border-radius: inherit;
  opacity: 0.16;
  pointer-events: none;
}

.vip-card__perk-icon {
  flex: none;
  font-size: var(--ec-body-size);
}

.vip-card__perk-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.vip-card__perk-value {
  flex: none;
  font-family: var(--ec-font-num);
  white-space: nowrap;
  opacity: 0.82;
}

/* 未拥有权益：整项降到 0.4 透明度，图标转灰；文字仍可读，不用危险色。 */
.vip-card__perk.is-locked {
  opacity: 0.4;
}

.vip-card__perk.is-locked .vip-card__perk-icon {
  color: var(--ec-text-tertiary);
}

.vip-card__note {
  margin: 0;
  font-size: var(--ec-caption-size);
  opacity: 0.8;
}

.vip-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ec-space-2);
}
</style>
