<template>
  <div class="page-shell search-page">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">{{ SEARCH_PAGE.eyebrow }}</p>
      <h1 class="page-shell-title">
        {{ keyword ? SEARCH_PAGE.titleWith(keyword) : SEARCH_PAGE.title }}
      </h1>
      <p class="page-shell-desc">{{ SEARCH_PAGE.description }}</p>
    </header>

    <!-- 没有关键词：不发任何请求，直接引导回去。空关键词去搜索只会拿到全量列表，
         那不是「搜索结果」，白白拉两份数据 -->
    <div v-if="!keyword" class="page-empty">
      <p class="page-empty-title">{{ SEARCH_PAGE.emptyKeywordTitle }}</p>
      <p class="page-empty-hint">{{ SEARCH_PAGE.emptyKeywordHint }}</p>
      <div class="page-actions">
        <RouterLink to="/hot" class="u-btn-primary">{{ SEARCH_PAGE.goHot }}</RouterLink>
        <RouterLink to="/tool" class="u-btn-secondary">{{ SEARCH_PAGE.goTools }}</RouterLink>
      </div>
    </div>

    <template v-else>
      <!-- 商品分区 -->
      <section class="page-panel search-panel" aria-labelledby="search-products-head">
        <h2 id="search-products-head" class="page-panel-head search-panel-head">
          <span>{{ SEARCH_PAGE.productSection }}</span>
          <span v-if="!productsLoading && !productsError" class="u-tag">
            {{ SEARCH_PAGE.countLabel(products.length) }}
          </span>
        </h2>

        <div v-if="productsLoading" class="u-loading-block" role="status">
          <span class="u-spinner" aria-hidden="true"></span>
          <span>{{ PRODUCT_GRID.loading }}</span>
        </div>

        <p v-else-if="productsError" class="page-note page-note--error" role="alert">
          {{ SEARCH_PAGE.productErrorPrefix }}{{ productsError }}
        </p>

        <!-- 两个分区各自给空态，不合成一个总空态：用户要知道是「商品没有」还是「工具没有」 -->
        <p v-else-if="!products.length" class="page-note">
          {{ SEARCH_PAGE.productEmpty(keyword) }}
        </p>

        <ul v-else class="search-grid">
          <li v-for="(product, index) in products" :key="product.id" class="search-cell">
            <ProductCard :product="product" :style="{ '--i': index }" @go-detail="goDetail" />
          </li>
        </ul>
      </section>

      <!-- 工具分区 -->
      <section class="page-panel search-panel" aria-labelledby="search-tools-head">
        <h2 id="search-tools-head" class="page-panel-head search-panel-head">
          <span>{{ SEARCH_PAGE.toolSection }}</span>
          <span v-if="!toolsLoading && !toolsError" class="u-tag">
            {{ SEARCH_PAGE.countLabel(tools.length) }}
          </span>
        </h2>

        <div v-if="toolsLoading" class="u-loading-block" role="status">
          <span class="u-spinner" aria-hidden="true"></span>
          <span>{{ SEARCH_PAGE.toolLoading }}</span>
        </div>

        <!-- 无身份：给登录引导，而不是「工具加载失败：token 已失效」（那看起来像页面坏了） -->
        <p v-else-if="toolsNeedIdentity" class="page-note">
          {{ SEARCH_PAGE.toolNeedIdentity }}
        </p>

        <p v-else-if="toolsError" class="page-note page-note--error" role="alert">
          {{ SEARCH_PAGE.toolErrorPrefix }}{{ toolsError }}
        </p>

        <p v-else-if="!tools.length" class="page-note">
          {{ SEARCH_PAGE.toolEmpty(keyword) }}
        </p>

        <ul v-else class="search-grid search-grid--tools">
          <li v-for="(tool, index) in tools" :key="tool.id" class="search-cell">
            <ToolCard
              :tool="tool"
              :is-favorited="favoriteTools.has(Number(tool.id))"
              :has-entitlement="hasEntitlement(tool)"
              :style="{ '--i': index }"
              @open-tool="handleOpenTool"
              @toggle-favorite="handleToggleFavorite"
            />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * 搜索结果页：**同时**搜商品与工具
 *
 * ## 为什么要单独一页
 *
 * 导航栏的输入框此前只做客户端过滤（`stores/shop.js` 的 `filteredProducts`），
 * 而且只覆盖商品 —— 工具的数据在另一个接口、另一个 store 里，客户端过滤拿不到。
 * 要做「一个框搜两样」，只能有一个把两边结果放在一起的地方。
 *
 * ## 为什么用服务端搜索
 *
 * 两个接口**都已支持 `keyword`**（商品搜 `main_title`、工具搜 `tool_name`），
 * 因此不需要新增后端接口，也不必把两份全量数据都拉到前端再过滤 ——
 * 后者在数据量长大后会直接把首页拖慢。
 *
 * ## 两个分区必须互不拖累
 *
 * 用 `Promise.allSettled` 而不是 `all`：工具接口挂了不该让商品结果也消失。
 * 每个分区各有自己的加载 / 错误 / 空态三态。
 *
 * 注意：导航栏在首页/热卖榜上仍保留「打字即时过滤商品」的即时反馈，
 * 回车才打开本页。两级行为是刻意的，说明写在 README。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/index'
import ProductCard from '@/components/ProductCard.vue'
import ToolCard from '@/components/ToolCard.vue'
import { useFavoriteStore } from '@/stores/favorite'
import { useOpenTool } from '@/hooks/useOpenTool'
import { useUserStore } from '@/stores/user'
import { useToolStore } from '@/stores/tool'
import { notify } from '@/hooks/useToast/index.js'
import { PRODUCT_GRID, SEARCH_PAGE, TOOL_PAGE } from '@/constants/index.js'

const route = useRoute()
const router = useRouter()
const favoriteStore = useFavoriteStore()
const userStore = useUserStore()
const toolStore = useToolStore()
const { openTool } = useOpenTool()

/** 每类最多展示多少条。上限由 constants 给，避免两处各写一个数字 */
const LIMIT = SEARCH_PAGE.limit

/** 关键词取自 URL，因此搜索结果可以直接分享/收藏链接 */
const keyword = computed(() => String(route.query.q || '').trim())

const products = ref([])
const tools = ref([])
const productsLoading = ref(false)
const toolsLoading = ref(false)
const productsError = ref('')
const toolsError = ref('')
/** 工具搜索需要登录身份（`/toolApi` 是 JWT 保护的），无身份时给登录引导而不是报错 */
const toolsNeedIdentity = ref(false)

const favoriteTools = computed(() => new Set(favoriteStore.toolIds))

/** 与工具页同一套判断：免费工具永远算可用 */
const hasEntitlement = (tool) => {
  if (tool.requires_card !== true) return true
  if (!userStore.userId) return false
  const ids = toolStore.validToolIds
  return Array.isArray(ids) && ids.includes(Number(tool.id))
}

const goDetail = (product) => {
  if (product?.id) router.push({ name: 'ProductDetail', params: { id: product.id } })
}

const handleOpenTool = (tool) => {
  openTool(tool)
}

const handleToggleFavorite = async (tool) => {
  const result = await favoriteStore.toggle('tool', tool?.id)
  if (result.success) notify.success(result.favorited ? TOOL_PAGE.addedFavorite : TOOL_PAGE.removedFavorite)
  else notify.error(result.message)
}

/** 商品分区：只搜标题（后端 keyword 的既有范围），缺货商品也返回，由卡片自己标注 */
const loadProducts = async (text) => {
  productsLoading.value = true
  productsError.value = ''
  try {
    const result = await api.getProducts({
      keyword: text,
      // 与分类页一致：搜索要的是「有没有这件东西」，缺货的也应出现
      status: 'all',
      in_stock: 'all',
      limit: LIMIT,
    })
    if (!result?.success) throw new Error(result?.message || '加载失败')
    products.value = result.data?.products || []
  } catch (error) {
    productsError.value = error?.message || '加载失败'
    products.value = []
  } finally {
    productsLoading.value = false
  }
}

/** 工具分区 */
const loadTools = async (text) => {
  // **必须先有身份**：`/toolApi/getTools` 是 JWT 保护的接口（实测无 token 返回 401）。
  // 访客由 App.vue 的 init 自动创建，因此正常访问一定有身份；
  // 只有「刚退出登录/退出游客」这一种情况例外 —— 那时不该发请求，
  // 否则用户看到的是「工具加载失败：token已失效或已过期」这种像是坏掉的页面。
  if (!userStore.userId) {
    toolsNeedIdentity.value = true
    tools.value = []
    toolsError.value = ''
    toolsLoading.value = false
    return
  }
  toolsNeedIdentity.value = false

  toolsLoading.value = true
  toolsError.value = ''
  try {
    const result = await api.getTools({ keyword: text, limit: LIMIT })
    if (!result?.success) throw new Error(result?.message || '加载失败')
    tools.value = result.data?.tools || []
  } catch (error) {
    toolsError.value = error?.message || '加载失败'
    tools.value = []
  } finally {
    toolsLoading.value = false
  }
}

/**
 * 拉取两个分区。
 *
 * `allSettled` 保证一个失败不影响另一个；两个 load 函数内部已经把异常转成
 * 各自的 error 状态，因此这里不会抛。
 */
const load = async (text) => {
  if (!text) {
    products.value = []
    tools.value = []
    return
  }
  productsLoading.value = true
  toolsLoading.value = true
  await Promise.allSettled([loadProducts(text), loadTools(text)])
}

// 同一页面内再次搜索只改 query，不会重新挂载组件，因此必须监听
watch(keyword, (text) => {
  load(text)
})

/**
 * 身份就绪后补一次工具搜索。
 *
 * 场景：用户在结果页点登录、登录成功后回到本页 —— 组件不会重新挂载，
 * 若不再取一次，工具分区会一直停在「登录后即可搜索工具」。
 */
watch(
  () => userStore.userId,
  (id, prev) => {
    if (id === prev || !id) return
    if (keyword.value) loadTools(keyword.value)
  }
)

onMounted(() => {
  load(keyword.value)
  // 收藏与授权都是「锦上添花」：失败不影响搜索结果本身
  if (userStore.userId) {
    favoriteStore.load()
    toolStore.fetchEntitlements()
  }
})
</script>

<style scoped>
/* 两个分区之间用 .page-panel + .page-panel 的既有间距，不再自写 margin */
.search-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
}

/* 栅格与分类页/category 保持同一套令牌，换主题时同步 */
.search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.search-cell {
  display: flex;
  min-width: 0;
}

@media (max-width: 575px) {
  .search-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
