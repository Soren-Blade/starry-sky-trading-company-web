<template>
  <div class="tool-row ec-tool u-enter" :class="{ 'is-maintain': isMaintain, 'is-offline': isOffline }">
    <span class="ec-tool__icon tool-row__icon" aria-hidden="true">
      <AppIcon v-if="iconName" :name="iconName" />
      <template v-else>{{ tool.icon }}</template>
    </span>

    <div class="ec-tool__main">
      <div class="ec-tool__name">
        <h3 class="tool-row__title">{{ tool.tool_name }}</h3>
        <span v-if="tool.is_new" class="ec-tag ec-tag--sm ec-tag--primary">新</span>
      </div>
      <p v-if="tool.description" class="ec-tool__desc">{{ tool.description }}</p>
      <p v-if="hintText" class="tool-row__hint">{{ hintText }}</p>
    </div>

    <div class="ec-tool__tags">
      <!-- 分类标签永远是第一个，样式保持不变；派生标签只排在它后面 -->
      <span v-if="tool.class_name" class="ec-tag ec-tag--sm ec-tag--outline">{{ tool.class_name }}</span>
      <span v-for="tag in derivedTags" :key="tag" class="ec-tag ec-tag--sm tool-row__tag">
        {{ tag }}
      </span>
      <span v-if="showMemberFreeTag" class="ec-tag ec-tag--sm ec-tag--gold">{{ ACCESS_TEXT.memberFree }}</span>
      <span v-if="showMemberOnlyTag" class="ec-tag ec-tag--sm ec-tag--gold">{{ ACCESS_TEXT.memberOnly }}</span>
      <span v-if="showActivatedTag" class="ec-tag ec-tag--sm ec-tag--success">{{ TOOL_PAGE.activatedTag }}</span>

      <!-- 会员专属且非会员时不渲染任何按钮（需求明确要求）；下架工具也没有可执行操作 -->
      <button
        v-if="showFavorite"
        class="ec-btn ec-btn--ghost ec-btn--sm tool-row__favorite"
        type="button"
        :aria-pressed="isFavorited"
        :title="favoriteTitle"
        :aria-label="favoriteAriaLabel"
        @click.stop="toggleFavorite"
      >
        <AppIcon name="heart" :filled="isFavorited" />
        <span v-if="favoriteCount">{{ favoriteCount }}</span>
      </button>
    </div>

    <div class="ec-tool__act">
      <span class="ec-status" :class="`ec-status--${status.tone}`">
        <i class="ec-status__dot"></i>
        <span>{{ status.text }}</span>
      </span>

      <button
        v-if="action === 'open'"
        class="ec-btn ec-btn--primary ec-btn--sm"
        type="button"
        @click.stop="onOpenTool"
      >
        {{ TOOL_PAGE.openTool }}
      </button>

      <!-- 需要卡密且尚未激活：入口带上工具 id，跳到卡密激活页时自动预选 -->
      <RouterLink
        v-else-if="action === 'activate'"
        class="ec-btn ec-btn--primary ec-btn--sm"
        :to="kamiTarget"
        @click.stop
      >
        {{ TOOL_PAGE.activateNow }}
      </RouterLink>

      <!-- 会员免费但非会员：还能用卡密，所以给「获取」入口，金色是需求会员语义的唯一 CTA 场景 -->
      <RouterLink
        v-else-if="action === 'acquire'"
        class="ec-btn ec-btn--gold ec-btn--sm"
        :to="kamiTarget"
        @click.stop
      >
        {{ ACCESS_TEXT.acquire }}
      </RouterLink>

      <button
        v-else-if="action === 'maintain'"
        class="ec-btn ec-btn--outline ec-btn--sm"
        type="button"
        disabled
      >
        {{ ACCESS_TEXT.unavailable }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useMemberStore } from '@/stores/member.js'
import { emojiToIconName } from '@/utils/iconSet.js'
// 文案集中在 constants，改文案只碰一个文件
import { TOOL_PAGE } from '@/constants/index.js'
import { MAX_TOOL_TAGS, toolTagsOf } from '@/constants/toolTags.js'

/**
 * 访问策略文案（服务端新契约）
 *
 * 这些是本次需求新增的语义，`src/constants/content.js` 由别的改动并行维护，
 * 因此只在本组件内收敛；页面壳里有一份同名副本（同样不允许改 constants）。
 */
const ACCESS_TEXT = Object.freeze({
  available: '可用',
  owned: '已拥有',
  memberFree: '会员免费',
  needMember: '需开通会员',
  memberOnly: '会员专属',
  /**
   * 会员专属的非会员态。
   *
   * 不能再用「会员专属」当状态点文案 —— 同一行里金色标签已经写着这四个字，
   * 状态点再重复一遍，视觉上是两个一模一样的小方块并排。
   */
  locked: '未解锁',
  acquire: '获取',
  maintain: '维护中',
  /** 维护中的按钮文案，与状态点同词会变成「维护中 ⋯ 维护中」 */
  unavailable: '暂不可用',
  offline: '已下架',
  memberFreeHint: '会员免卡密，非会员需使用卡密激活',
})

const ACCESS_POLICIES = ['free', 'card', 'member_free', 'member_only']

const props = defineProps({
  tool: { type: Object, required: true },
  isFavorited: { type: Boolean, default: false },
  /**
   * 当前用户是否已拥有这件工具的授权（由父组件从 /kamiApi/myEntitlements 的结果传入）。
   * 不在这里自己请求：一张卡片一个请求会把列表打成 N+1 个 HTTP 调用。
   */
  hasEntitlement: { type: Boolean, default: false }
});
const emit = defineEmits(['open-tool', 'toggle-favorite'])

/** 库里存的是 emoji，映射成图标名；映射不到返回空串（模板回退成原样显示） */
const iconName = computed(() => emojiToIconName(props.tool?.icon))

/**
 * 会员身份。
 *
 * 服务端契约里 `member_free` / `member_only` 的判定只认会员状态，而父组件
 * （工具页 / 搜索结果）暂时只传 `has-entitlement`，因此这里直接读会员 store。
 * 少部分 SSR 单测不安装 pinia，读取失败时降级为非会员，不能让整张卡挂掉。
 */
const memberStore = (() => {
  try {
    return useMemberStore()
  } catch {
    return null
  }
})()

const isMember = computed(() => Boolean(memberStore?.isMember))

/**
 * 访问策略解析。
 *
 * 字段缺失（迁移回填前后的窗口期）必须容错：`tool.requires_card === true`
 * 回退为 `card`，否则按免费处理。非法值同样走这条兜底。
 */
const accessPolicy = computed(() => {
  const declared = props.tool?.access_policy
  if (ACCESS_POLICIES.includes(declared)) return declared
  return props.tool.requires_card === true ? 'card' : 'free'
})

/** 维护中 / 已下架：服务端契约目前没有这两个字段，按常见命名与状态值做容错探测 */
const toolStatus = computed(() => String(props.tool?.status || '').toLowerCase())
const isOffline = computed(
  () =>
    props.tool?.is_offline === true ||
    props.tool?.is_online === false ||
    toolStatus.value === 'offline' ||
    toolStatus.value === 'shelved'
)
const isMaintain = computed(
  () =>
    !isOffline.value &&
    (props.tool?.is_maintain === true ||
      toolStatus.value === 'maintain' ||
      toolStatus.value === 'maintenance')
)

const status = computed(() => {
  if (isOffline.value) return { tone: 'offline', text: ACCESS_TEXT.offline }
  if (isMaintain.value) return { tone: 'maintain', text: ACCESS_TEXT.maintain }

  if (accessPolicy.value === 'card') {
    return props.hasEntitlement
      ? { tone: 'owned', text: ACCESS_TEXT.owned }
      : { tone: 'expired', text: TOOL_PAGE.needCardTag }
  }
  if (accessPolicy.value === 'member_free') {
    return isMember.value
      ? { tone: 'vip', text: ACCESS_TEXT.memberFree }
      : { tone: 'vip', text: ACCESS_TEXT.needMember }
  }
  if (accessPolicy.value === 'member_only') {
    // 非会员时标签区已经挂了金色「会员专属」，状态点改说「未解锁」，避免同一行重复四个字
    return { tone: 'vip', text: isMember.value ? ACCESS_TEXT.memberOnly : ACCESS_TEXT.locked }
  }
  return { tone: 'online', text: ACCESS_TEXT.available }
})

/** 操作区只有一种主操作；null 表示不渲染任何按钮 */
const action = computed(() => {
  if (isOffline.value) return null
  if (isMaintain.value) return 'maintain'

  if (accessPolicy.value === 'card') return props.hasEntitlement ? 'open' : 'activate'
  if (accessPolicy.value === 'member_free') return isMember.value ? 'open' : 'acquire'
  if (accessPolicy.value === 'member_only') return isMember.value ? 'open' : null
  return 'open'
})

const showMemberFreeTag = computed(
  () => accessPolicy.value === 'member_free' && !isMember.value
)
const showMemberOnlyTag = computed(
  () => accessPolicy.value === 'member_only' && !isMember.value
)
const showActivatedTag = computed(
  () => accessPolicy.value === 'card' && props.hasEntitlement
)

/**
 * 描述关键词派生的补充标签（见 constants/toolTags.js）。
 *
 * 分类标签会占掉三个展示名额里的一个，所以这里只取剩余名额；多出来的直接
 * 丢弃，不渲染「+N」这种半成品。
 */
const derivedTags = computed(() => {
  const remaining = MAX_TOOL_TAGS - (props.tool?.class_name ? 1 : 0)
  return toolTagsOf(props.tool).slice(0, Math.max(0, remaining))
})

/** 没有可执行操作（会员专属的访客 / 已下架）时，收藏按钮也一并收起 */
const showFavorite = computed(() => action.value !== null)

const hintText = computed(() => {
  if (isOffline.value || isMaintain.value) return ''
  if (accessPolicy.value === 'card') {
    return props.hasEntitlement ? TOOL_PAGE.activatedHint : TOOL_PAGE.needCardHint
  }
  if (accessPolicy.value === 'member_free' && !isMember.value) {
    return ACCESS_TEXT.memberFreeHint
  }
  return ''
})

const kamiTarget = computed(() => ({
  path: '/user/kami',
  query: { tool_id: String(props.tool.id) },
}))

const favoriteCount = computed(() => {
  const count = Number(props.tool?.collection_count)
  if (!Number.isFinite(count) || count <= 0) return ''
  return count > 99 ? '99+' : String(count)
})
const favoriteTitle = computed(() => (props.isFavorited ? '取消收藏' : '添加收藏'))
const favoriteAriaLabel = computed(
  () => `${props.isFavorited ? '取消收藏' : '收藏'} ${props.tool?.tool_name || ''}`.trim()
)

const onOpenTool = () => emit('open-tool', props.tool);
const toggleFavorite = () => emit('toggle-favorite', props.tool);
</script>

<style scoped>
/* 行布局全部来自 .ec-tool；这里只补列表格子的宽度与内部排版细节 */
.tool-row {
  width: 100%;
  cursor: default;
}

/*
 * 标签区与右侧收藏按钮 / 状态点 / 操作按钮的中线对齐。
 *
 * .ec-tool__tags 默认 align-items: stretch，但 .ec-tag 有固定高度
 * （--ec-tag-h-sm = 20px），stretch 对它不生效，标签会被顶到 28px 高
 * 收藏按钮的 cross-start：实测两者 top 同为 413.42px，标签中线
 * 423.42px、收藏按钮中线 427.42px，差 (28 - 20) / 2 = 4px。
 *
 * 用 flex 对齐解决，不加 margin-top 之类的魔法补偿值；flex-wrap 换行后
 * 每条 flex line 仍各自居中，所以窄屏（≤767px）也不会再歪。
 */
.ec-tool__tags {
  align-items: center;
  align-content: center;
}

/* AppIcon 用 1em 控制尺寸，图标瓦片按设计系统 20px 档给字号 */
.tool-row__icon {
  font-size: var(--ec-h2-size);
}

/* 标题是 .ec-tool__name 的弹性子项：长名字截断，右侧的「新」标记不被挤走 */
.tool-row__title {
  min-width: 0;
  margin: 0;
  font: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-row__hint {
  margin: var(--ec-space-1) 0 0;
  font-size: var(--ec-caption-size);
  line-height: var(--ec-caption-lh);
  color: var(--ec-text-secondary);
}

/* 收藏态用主色表达选中；颜色只取令牌 */
.tool-row__favorite[aria-pressed='true'] {
  color: var(--ec-action-primary);
}
</style>
