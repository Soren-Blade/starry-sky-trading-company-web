<template>
  <!-- 工具是「补充推荐」：没有工具（或接口失败）时整个区块不渲染，
       而不是留一个空壳区块 —— 首页出现一个空标题比不出这个区块更糟 -->
  <section v-if="shouldRender" class="hot-tools" :class="{ 'hot-tools--board': isBoard }">
    <div class="section-inner">
      <!-- 工具区块**始终**带自己的区块头，即使榜单变体也带：
           榜单页的页头（「热卖榜 / 按销量与浏览量排序的精选商品」+「N 件在榜」）
           讲的只是商品，第二个栅格没有标题的话，用户会以为那还是商品 -->
      <SectionHeader v-bind="SECTIONS.hotTools" />

      <ul class="tools-grid">
        <li v-if="loading" class="u-loading-block" role="status">
          <span class="u-spinner" aria-hidden="true"></span>
          <span>{{ TOOL_PAGE.loading }}</span>
        </li>

        <template v-else>
          <li v-for="(tool, index) in tools" :key="tool.id" class="tools-cell" :style="{ '--i': index }">
            <ToolCard
              :tool="tool"
              :is-favorited="favoriteTools.has(Number(tool.id))"
              :has-entitlement="hasEntitlement(tool)"
              @open-tool="handleOpenTool"
              @toggle-favorite="handleToggleFavorite"
            />
          </li>
        </template>
      </ul>
    </div>
  </section>
</template>

<script setup>
/**
 * 热门工具区块
 *
 * 与 `HotProductsSection` **并列**而不是合并：两者取数来源、排序字段、
 * 卡片组件都不同（商品按销量/浏览量，工具按收藏数 collection_count）。
 * 硬塞进一个组件只会得到一堆 `isTool` 分支。
 *
 * 排序用后端已有的 `sort_by=collection_count`（在 `getTools` 的
 * `validSortFields` 白名单里），不在前端重排。
 */
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api/index'
import ToolCard from '@/components/ToolCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { useFavoriteStore } from '@/stores/favorite'
import { useOpenTool } from '@/hooks/useOpenTool'
import { useUserStore } from '@/stores/user'
import { useToolStore } from '@/stores/tool'
import { notify } from '@/hooks/useToast/index.js'
import { SECTIONS, TOOL_PAGE } from '@/constants/index.js'

const props = defineProps({
  /** 与商品区块保持一致：'section' 带区块头（首页） / 'board' 带上榜名次（榜单页） */
  variant: { type: String, default: 'section' },
})

const favoriteStore = useFavoriteStore()
const userStore = useUserStore()
const toolStore = useToolStore()
const { openTool } = useOpenTool()

/** 首页只放一行（4 个），榜单页给多一点 */
const LIMIT = 4
const BOARD_LIMIT = 8

const tools = ref([])
const loading = ref(true)
const failed = ref(false)

const isBoard = computed(() => props.variant === 'board')
const favoriteTools = computed(() => new Set(favoriteStore.toolIds))

/** 取不到工具就整块不渲染：它是补充推荐，缺了不该留个空洞 */
const shouldRender = computed(() => (loading.value && !failed.value) || tools.value.length > 0)

/** 与工具页/搜索页同一套判断：免费工具永远算可用 */
const hasEntitlement = (tool) => {
  if (tool.requires_card !== true) return true
  if (!userStore.userId) return false
  const ids = toolStore.validToolIds
  return Array.isArray(ids) && ids.includes(Number(tool.id))
}

const handleOpenTool = (tool) => {
  openTool(tool)
}

const handleToggleFavorite = async (tool) => {
  const result = await favoriteStore.toggle('tool', tool?.id)
  if (result.success) notify.success(result.favorited ? TOOL_PAGE.addedFavorite : TOOL_PAGE.removedFavorite)
  else notify.error(result.message)
}

onMounted(() => {
  loadTools()
})

/**
 * 身份就绪后再取。
 *
 * **必须等身份**：`/toolApi/getTools` 是 JWT 保护的接口（实测无 token 返回 401）。
 * 首页可能在 `userStore.init()` 建出游客身份**之前**就挂载了，
 * 那时无条件请求会拿到 401 —— 对匿名访客就是一次必然失败的请求。
 * 退出登录/退出游客后身份变空，这里也不再请求（区块随之消失）。
 *
 * 与工具页的 `hasIdentity` 是同一套判断，理由见 pages/Tool.vue 的注释。
 */
watch(
  () => userStore.userId,
  (id, prev) => {
    if (id === prev) return
    if (id) loadTools()
    else {
      tools.value = []
      failed.value = true
      loading.value = false
    }
  }
)

async function loadTools() {
  // 没有身份就不发请求：401 只会污染日志，而区块本来就该缺席
  if (!userStore.userId) {
    loading.value = false
    failed.value = true
    return
  }

  loading.value = true
  failed.value = false
  try {
    const result = await api.getTools({
      sort_by: 'collection_count',
      sort_order: 'desc',
      limit: isBoard.value ? BOARD_LIMIT : LIMIT,
    })
    if (!result?.success) throw new Error(result?.message || '加载失败')
    tools.value = result.data?.tools || []
  } catch {
    // 静默失败：热门工具是补充内容，首页不该为它弹错误提示
    failed.value = true
    tools.value = []
  } finally {
    loading.value = false
  }

  // 收藏与授权只影响卡片外观，失败不影响列表
  if (userStore.userId) {
    favoriteStore.load()
    toolStore.fetchEntitlements()
  }
}
</script>

<style scoped>
/* 与 .hot-section 同一套内边距节奏，两个区块叠在一起时间距一致 */
.hot-tools {
  width: 100%;
  padding: calc(var(--section-gap) * 0.6) 0 var(--section-gap);
}

.hot-tools--board {
  padding-top: calc(var(--section-gap) * 0.3);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 卡片是 .u-enter 入场元素，靠 --i 做错峰 */
.tools-cell {
  display: flex;
  min-width: 0;
}

/*
 * 这里**不再**给榜单变体加「上榜名次」角标。
 *
 * 曾经在卡片外的左上角压一个 `.tools-rank`，有两个问题：
 *   1. 工具卡媒体区的**左上角已被占**（`ToolCard` 的「新」标记就在那儿），
 *      今天没有 is_new 的工具所以看不出来，一旦有就会重叠；
 *   2. 商品榜单的名次在**右上角**（`ProductCard` 的 `.product-rank`），
 *      而工具卡右上角是收藏按钮（还带一个向外凸出的计数徽标）——
 *      放到左上角就和商品榜镜像了，同一页两处名次位置不一致。
 *
 * 而且名次对工具本来就冗余：列表已按 `collection_count` 降序，
 * 每张卡片自己也显示着收藏数。
 *
 * 如果以后确实要名次，正确做法是像 `ProductCard` 那样给 `ToolCard`
 * 加一个 `rank` prop，由卡片内部挑一个不与「新」/收藏冲突的位置渲染。
 */

@media (max-width: 575px) {
  .tools-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
