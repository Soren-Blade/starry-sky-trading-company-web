<template>
  <div class="page-shell page-shell--narrow member-benefits-page">
    <header class="page-shell-head">
      <h1 class="page-shell-title">会员权益详解</h1>
      <p class="page-shell-desc">
        八项权益的逐档数值、解锁条件与常见问题。文案来自服务端（取不到时用内置的同一份），数值全部来自服务端，页面上不写死任何折扣或倍率。
      </p>
    </header>

    <!-- 页内锚点：与路由 scrollBehavior 配合，跳到标题下方而不是被顶栏盖住 -->
    <nav class="benefits-anchors" aria-label="页内导航">
      <router-link class="u-tag benefits-anchor" :to="{ name: 'MemberBenefits', hash: '#benefits' }">
        权益说明
      </router-link>
      <router-link class="u-tag benefits-anchor" :to="{ name: 'MemberBenefits', hash: '#levels' }">
        等级权益对照
      </router-link>
      <router-link class="u-tag benefits-anchor" :to="{ name: 'MemberBenefits', hash: '#rules' }">
        规则与常见问题
      </router-link>
    </nav>

    <!-- ① 八项权益逐条说明：名称/描述/图标/详情来自 getBenefits（未取到时回落 constants），数值来自 overview.benefits -->
    <section id="benefits" class="benefits-section" aria-labelledby="benefits-title">
      <h2 id="benefits-title" class="benefits-section-title">八项权益</h2>
      <ul class="benefits-list">
        <li v-for="item in benefitDetails" :key="item.key" class="ui-card benefits-item">
          <div class="benefits-item-head">
            <AppIcon :name="item.icon" class="benefits-item-icon" aria-hidden="true" />
            <div class="benefits-item-title-box">
              <p class="benefits-item-name">{{ item.name }}</p>
              <p class="benefits-item-desc">{{ item.desc }}</p>
            </div>
            <span class="u-tag u-tag--accent benefits-item-value">{{ item.valueText || item.requiredText }}</span>
          </div>
          <ul v-if="item.detailLines.length" class="benefits-item-detail">
            <li v-for="line in item.detailLines" :key="line" class="benefits-item-detail-line">{{ line }}</li>
          </ul>
        </li>
      </ul>
    </section>

    <!-- ② 8 档 × 8 项完整矩阵：数据来自 getPlans 的 levels[]（八列含 v1.4.0 新增六列） -->
    <section id="levels" class="benefits-section" aria-labelledby="levels-title">
      <h2 id="levels-title" class="benefits-section-title">等级权益对照</h2>
      <p class="benefits-section-desc">
        每一档都能看到具体数值；横向可滚动查看全部八项权益。
      </p>

      <div v-if="levelsLoading && !matrixLevels.length" class="ui-card benefits-skeleton">
        <span v-for="n in 4" :key="n" class="u-skeleton benefits-skeleton-line"></span>
      </div>

      <div v-else-if="!matrixLevels.length" class="ui-card benefits-empty">
        <AppIcon name="info" class="benefits-empty-icon" aria-hidden="true" />
        <p class="benefits-empty-title">对照表暂时取不到</p>
        <p class="benefits-empty-desc">请稍后重试，或先返回会员中心查看成长值等级。</p>
        <button type="button" class="u-btn-secondary" @click="memberStore.fetchPlans()">重试</button>
      </div>

      <template v-else>
        <!-- 桌面/平板：宽表横向滚动 -->
        <div class="u-table-wrap benefits-matrix">
          <table class="u-table">
            <caption class="visually-hidden">八档会员等级与八项权益对照表</caption>
            <thead>
              <tr>
                <th scope="col">等级</th>
                <th scope="col">成长值门槛</th>
                <th v-for="column in matrixColumns" :key="column.key" scope="col">{{ column.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="level in matrixLevels"
                :key="level.level"
                :class="{ 'is-current': level.level === currentLevel }"
              >
                <th scope="row">
                  <span>{{ level.name || level.level }}</span>
                  <span v-if="level.level === currentLevel" class="u-tag u-tag--accent benefits-matrix-current">当前</span>
                </th>
                <td>{{ level.growth_threshold }}</td>
                <td v-for="column in matrixColumns" :key="column.key">
                  {{ cellText(level, column) || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 手机：同样的数据降级成卡片 -->
        <ul class="benefits-cards">
          <li
            v-for="level in matrixLevels"
            :key="level.level"
            class="ui-card benefits-card"
            :class="{ 'is-current': level.level === currentLevel }"
          >
            <p class="benefits-card-head">
              <span class="benefits-card-name">{{ level.name || level.level }}</span>
              <span class="benefits-card-threshold">门槛 {{ level.growth_threshold }}</span>
              <span v-if="level.level === currentLevel" class="u-tag u-tag--accent">当前</span>
            </p>
            <dl class="benefits-card-list">
              <template v-for="column in matrixColumns" :key="column.key">
                <dt>{{ column.label }}</dt>
                <dd>{{ cellText(level, column) || '—' }}</dd>
              </template>
            </dl>
          </li>
        </ul>
      </template>
    </section>

    <!-- ③ 规则与常见问题 -->
    <section id="rules" class="benefits-section" aria-labelledby="rules-title">
      <h2 id="rules-title" class="benefits-section-title">规则与常见问题</h2>

      <ul class="rules-list">
        <li v-for="rule in RULES" :key="rule.title" class="ui-card rules-item">
          <AppIcon :name="rule.icon" class="rules-item-icon" aria-hidden="true" />
          <div class="rules-item-text">
            <p class="rules-item-title">{{ rule.title }}</p>
            <p class="rules-item-desc">{{ rule.desc }}</p>
          </div>
        </li>
      </ul>

      <dl class="faq-list">
        <div v-for="item in faqList" :key="item.q" class="ui-card faq-item">
          <dt class="faq-question">{{ item.q }}</dt>
          <dd class="faq-answer">{{ item.a }}</dd>
        </div>
      </dl>
    </section>

    <p class="page-note">
      还没开通会员？
      <router-link :to="{ name: 'MemberPlans' }">查看套餐对比</router-link>
      ，或返回
      <router-link :to="{ name: 'Member' }">会员中心</router-link>
      查看你的成长值等级。
    </p>
  </div>
</template>

<script setup>
/**
 * 会员权益详解（`/member/benefits`）
 *
 * 三条纪律：
 *   1. **文案优先服务端、数值只认服务端**：名称/描述/图标/详情/FAQ 来自
 *      `GET /memberApi/getBenefits`（1.5.0 M6 端点，游客也能取；未取到时回落
 *      `constants/member.js` 的同一份说法）；数值来自 `getOverview` 的
 *      `benefits[].value` 与 `levels[]`。页面里不出现任何写死的「×2.5」「95 折」。
 *   2. **一张表服务两个数据源**：`getBenefits` 的 `levels[]` 与 `getPlans` 的
 *      同源（都是后端 `get_member_plans()`），矩阵只认字段名，不关心来源。
 *   3. **未解锁 ≠ 0**：`value` 键缺席时显示「V{n} 解锁」，由 `formatBenefitValue` 兜底。
 */
import { computed, onMounted } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { MEMBER_BENEFITS, MEMBER_BENEFIT_MAP, formatBenefitValue, memberMatrixColumns } from '@/constants/member.js'
import { useMemberStore } from '@/stores/member.js'

const memberStore = useMemberStore()

/** 八项权益 → 矩阵列（列顺序与字段名的唯一实例在 `constants/member.js`） */
const MATRIX_COLUMNS = memberMatrixColumns()

const RULES = [
  {
    icon: 'tag',
    title: '折扣与优惠券可叠加',
    desc: '会员折扣与优惠券可以同时使用，但合计优惠金额不超过商品原价的 50%。',
  },
  {
    icon: 'landmark',
    title: '积分抵扣的上限随等级提高',
    desc: '单笔订单的积分抵扣比例上限见上方对照表；抵扣金额必须是 100 积分的整数倍。',
  },
  {
    icon: 'zap',
    title: '积分倍率不加快成长值的累积',
    desc: '倍率作用于积分获取（下单所得与每日签到的基础分）；成长值按固定规则累加，不受倍率影响。',
  },
  {
    icon: 'key',
    title: '免卡密额度是「同时可用」的数量',
    desc: '额度表示同一时间可以免卡密使用几个工具；额度占满后需要先结束其中一个，或使用卡密。',
  },
  {
    icon: 'clock',
    title: '续费是叠加时长，不是重置',
    desc: '续费在现有到期时间上顺延，不会清空剩余天数；到期未续费即失去会员折扣与权益。',
  },
  {
    icon: 'flame',
    title: '成长值只升不降、不过期',
    desc: '成长值长期有效，跨过门槛即时升级；生效等级取「买到的等级」与「成长值挣到的等级」里更高的一档。',
  },
  {
    icon: 'gift',
    title: '生日礼遇需要先填写生日',
    desc: '在个人资料里填写生日后，生日当月自动发放，不补发往月。',
  },
]

/**
 * 常见问题兜底文案。
 *
 * 正常路径用服务端 `getBenefits` 的 `faq`（改说法不用发版）；这里保留同一份，
 * 只在该请求失败时使用 —— 两份必须一致，否则同一个问题会随「谁渲染」给出两种答案。
 */
const FAQ = [
  {
    q: '会员到期后会掉级吗？',
    a: '会。生效等级按「买到的等级」与「成长值挣到的等级」里更高的一档计算；到期未续费时，等级回落到成长值对应的档位。成长值本身不会清零，续费后立刻按成长值定级。',
  },
  {
    q: '折扣和优惠券能一起用吗？',
    a: '可以叠加，但合计优惠金额不超过商品原价的 50%。',
  },
  {
    q: '积分抵扣最多能抵多少？',
    a: '抵扣比例上限随等级递增，具体数值见上方对照表的「积分抵扣上限」一行；抵扣金额必须是 100 积分的整数倍。',
  },
  {
    q: '成长值会过期或减少吗？',
    a: '不会。成长值只升不降、长期有效；积分有 12 个月有效期，两者规则不同。',
  },
  {
    q: '续费是叠加还是重置时间？',
    a: '叠加。续费天数会加到现有到期时间上，剩余天数不归零。',
  },
  {
    q: '生日礼遇怎么领？',
    a: '先在个人资料里填写生日，平台会在生日当月自动发放对应档位的礼遇，不补发往月。',
  },
]

/** 服务端下发的权益文案（`getBenefits` 的 `benefits[]`），未取到时为 null */
const servedBenefitMap = computed(() => {
  const list = memberStore.benefitsPage?.benefits
  if (!Array.isArray(list) || !list.length) return null
  return list.reduce((acc, item) => {
    if (item && item.key) acc[item.key] = item
    return acc
  }, {})
})

/** 服务端下发的解锁状态与数值；未登录/取不到时按「全部未解锁」渲染，不留白页 */
const remoteBenefits = computed(() => {
  const list = memberStore.benefits
  if (list && list.length) return list
  return MEMBER_BENEFITS.map((item) => ({
    key: item.key,
    unlocked: false,
    required_level: item.requiredLevel,
  }))
})

/**
 * 八项权益卡片。
 *
 * 文案优先用服务端（`getBenefits`），未取到时回落 `constants/member.js` ——
 * 两份说法必须一致，否则同一个权益会在「在线/离线」之间换一种解释。
 *
 * `detail` 的两种形状都归一成**行数组**：服务端是字符串数组，常量是单段字符串。
 * （历史坑：把单段字符串当数组 `v-for`，会按字符竖排成「折 / 扣 / 与」。）
 */
const benefitDetails = computed(() =>
  remoteBenefits.value.map((remote) => {
    const meta = MEMBER_BENEFIT_MAP[remote.key] || {}
    const served = servedBenefitMap.value?.[remote.key] || {}
    const rawDetail = served.detail ?? meta.detail
    const detailLines = Array.isArray(rawDetail)
      ? rawDetail.filter((line) => Boolean(line))
      : (rawDetail ? [rawDetail] : [])
    return {
      key: remote.key,
      name: served.name || meta.name || remote.key,
      desc: served.desc || meta.desc || '',
      detailLines,
      icon: served.icon || meta.icon || 'info',
      valueText: formatBenefitValue(remote.value, meta.tierLabels),
      requiredText: requiredLabel(remote.required_level || served.required_level),
    }
  })
)

/** 常见问题：优先服务端 `faq`，未取到时用页面兜底文案 */
const faqList = computed(() => {
  const list = memberStore.benefitsPage?.faq
  return Array.isArray(list) && list.length ? list : FAQ
})

const matrixLevels = computed(() =>
  [...memberStore.matrixLevels].sort((a, b) => (a.growth_threshold ?? 0) - (b.growth_threshold ?? 0))
)

/** 对照表在等数据：两个来源（权益页 / 套餐页）任一在途都算 */
const levelsLoading = computed(() => memberStore.loadingBenefits || memberStore.loadingPlans)

const matrixColumns = computed(() => MATRIX_COLUMNS)

/** 当前生效等级：非会员是 'none'，此时不高亮任何一行 */
const currentLevel = computed(() => memberStore.level || 'none')

/** 单格文案：类型与翻译表都来自 constants，数值来自服务端 */
function cellText(level, column) {
  const meta = MEMBER_BENEFIT_MAP[column.key]
  if (!meta) return ''
  return formatBenefitValue({ type: meta.valueType, current: level[column.field] }, meta.tierLabels)
}

function requiredLabel(level) {
  if (!level || level === 'none') return '未解锁'
  return `V${String(level).replace(/^v/i, '')} 解锁`
}

onMounted(() => {
  memberStore.fetchBenefits({ silent: true })
  memberStore.fetchOverview({ silent: true })
  if (!memberStore.hasLevels) memberStore.fetchPlans({ silent: true })
})
</script>

<style scoped>
.member-benefits-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 页内锚点 */
.benefits-anchors {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1);
}
.benefits-anchor {
  color: inherit;
  text-decoration: none;
}
.benefits-anchor:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* 分节 */
.benefits-section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}
.benefits-section-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.benefits-section-desc {
  margin: 0;
  color: var(--text-muted);
}

/* 八项权益 */
.benefits-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.benefits-item {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
}
.benefits-item-head {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
}
.benefits-item-icon {
  font-size: var(--fs-h3);
  color: var(--accent);
  flex-shrink: 0;
}
.benefits-item-title-box {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  min-width: 0;
  flex: 1;
}
.benefits-item-name {
  margin: 0;
  font-weight: var(--fw-heading);
}
.benefits-item-desc {
  margin: 0;
  color: var(--text-muted);
}
.benefits-item-value {
  flex-shrink: 0;
}
/* `detail` 的行数组（服务端 `getBenefits` 下发字符串数组，未取到时回落
   `constants/member.js` 的单段字符串 —— 两种形状在脚本里已归一成数组）。
   历史坑：把单段字符串直接 `v-for`，会按字符竖排成「折 / 扣 / 与」。 */
.benefits-item-detail {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
  padding: 0;
  color: var(--text-secondary);
  list-style: none;
}
.benefits-item-detail-line {
  margin: 0;
}

/* 矩阵 */
.benefits-matrix {
  overflow-x: auto;
}
.benefits-matrix-current {
  margin-left: var(--space-unit);
}
.benefits-matrix tbody tr.is-current {
  background: var(--accent-soft);
}

/* 矩阵的移动端卡片降级：默认隐藏，窄屏互斥显示 */
.benefits-cards {
  display: none;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.benefits-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 2);
}
.benefits-card.is-current {
  border-color: var(--accent);
}
.benefits-card-head {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
  margin: 0;
}
.benefits-card-name {
  font-weight: var(--fw-heading);
}
.benefits-card-threshold {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.benefits-card-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 1.5);
  margin: 0;
}
.benefits-card-list dt {
  font-size: var(--fs-label);
  color: var(--text-muted);
}
.benefits-card-list dd {
  margin: 0;
}

/* 骨架 / 空态 */
.benefits-skeleton {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 3);
}
.benefits-skeleton-line {
  height: calc(var(--space-unit) * 3);
  border-radius: var(--radius-media);
}
.benefits-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 5);
  text-align: center;
}
.benefits-empty-icon {
  font-size: var(--fs-h2);
  color: var(--text-muted);
}
.benefits-empty-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
}
.benefits-empty-desc {
  margin: 0;
  color: var(--text-muted);
}

/* 规则与 FAQ */
.rules-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: calc(var(--space-unit) * 2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.rules-item {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 2);
}
.rules-item-icon {
  font-size: var(--fs-h3);
  color: var(--accent);
  flex-shrink: 0;
}
.rules-item-text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}
.rules-item-title {
  margin: 0;
  font-weight: var(--fw-heading);
}
.rules-item-desc {
  margin: 0;
  color: var(--text-muted);
}
.faq-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
}
.faq-item {
  padding: calc(var(--space-unit) * 2);
}
.faq-question {
  font-weight: var(--fw-heading);
}
.faq-answer {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .benefits-matrix {
    display: none;
  }
  .benefits-cards {
    display: flex;
  }
  .benefits-item-head {
    flex-wrap: wrap;
  }
}
</style>
