<script setup>
/**
 * 全站搜索（Ctrl / Cmd + K）
 *
 * 为什么不是顶栏里那个会展开的输入框：
 *   - 展开式输入框一次只能搜一种东西（商品），工具在另一个接口里；
 *   - 手机上展开要挤掉 Logo 与图标，收起后又只剩一个图标，用户得先猜它能干嘛；
 *   - 结果页需要跳转，搜索这件事被拆成了「输入」和「看结果」两个页面。
 *
 * 现在顶栏只有一枚放大镜，点击或 Ctrl / Cmd + K 打开命令面板：
 * 页面（本地路由表）、商品、工具三类结果同屏，键盘 ↑ ↓ 选择、Enter 打开、
 * Esc 关闭；输入为空时给常用入口，仍是同一套键盘路径。
 *
 * 数据面：
 *   - 页面：本地路由表，不请求；
 *   - 商品 / 工具：复用结果页的同一组接口，输入防抖 220ms；
 *   - 工具接口需要身份，游客只搜页面与商品。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/index'
import { PAGES } from '@/constants'
import { useModalA11y } from '@/hooks/useModalA11y'
import { useOpenTool } from '@/hooks/useOpenTool'
import AppIcon from './AppIcon.vue'

const RESULT_LIMIT = 5
const SEARCH_DEBOUNCE_MS = 220

const route = useRoute()
const router = useRouter()
const { openTool } = useOpenTool()

const PAGE_LINKS = [
  { path: '/home', icon: 'home', labelKey: 'navHome' },
  { path: '/categories', icon: 'shopping-bag', labelKey: 'navCategories' },
  { path: '/hot', icon: 'flame', labelKey: 'navHot' },
  { path: '/tool', icon: 'wrench', labelKey: 'navTools' },
  { path: '/member', icon: 'crown', labelKey: 'navMember' },
  { path: '/user/orders', icon: 'package', labelKey: 'navOrders' },
  { path: '/user/kami', icon: 'key', labelKey: 'navKami' },
  { path: '/user/favorites', icon: 'heart', labelKey: 'navFavorites' },
  { path: '/coupons', icon: 'ticket', labelKey: 'navCoupons' },
  { path: '/user/checkin', icon: 'calendar', labelKey: 'navCheckin' },
  { path: '/user/profile', icon: 'user', labelKey: 'navProfile' },
  { path: '/mail', icon: 'mail', labelKey: 'navMail' },
]

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const loading = ref(false)
const failed = ref(false)
const products = ref([])
const tools = ref([])
const { modalRef, activate, deactivate } = useModalA11y({
  close: () => close(),
  auto: false,
  initialFocus: '#global-search-input',
})

const trimmed = computed(() => query.value.trim())
const quickLinks = computed(() =>
  PAGE_LINKS.map((item) => ({
    ...item,
    kind: 'page',
    label: PAGES.searchGlobal[item.labelKey],
  }))
)

const pageEntries = computed(() => {
  if (!trimmed.value) return []
  const needle = trimmed.value.toLowerCase()
  return quickLinks.value
    .filter(
      (item) =>
        item.label.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle)
    )
    .slice(0, 4)
})

const productEntries = computed(() =>
  products.value.map((product) => ({
    kind: 'product',
    icon: 'package',
    product,
    title: product.main_title || product.title || PAGES.searchGlobal.products,
    meta: product.class_name || '',
  }))
)

const toolEntries = computed(() =>
  tools.value.map((tool) => ({
    kind: 'tool',
    icon: 'wrench',
    tool,
    title: tool.tool_name || PAGES.searchGlobal.tools,
    meta: tool.class_name || '',
  }))
)

/** 扁平序列是键盘操作的唯一真相：↑↓ 在这个数组上移动，index 同时是 DOM id */
const entries = computed(() => {
  const list = trimmed.value
    ? [...pageEntries.value, ...productEntries.value, ...toolEntries.value]
    : quickLinks.value
  return list.map((item, index) => ({ ...item, index }))
})

const groups = computed(() => {
  if (!trimmed.value) {
    return [{ key: 'quick', title: '', items: entries.value }]
  }
  return [
    { key: 'pages', title: PAGES.searchGlobal.pages, items: entries.value.filter((e) => e.kind === 'page') },
    { key: 'products', title: PAGES.searchGlobal.products, items: entries.value.filter((e) => e.kind === 'product') },
    { key: 'tools', title: PAGES.searchGlobal.tools, items: entries.value.filter((e) => e.kind === 'tool') },
  ].filter((group) => group.items.length > 0)
})

const showEmpty = computed(
  () => Boolean(trimmed.value) && !loading.value && !failed.value && groups.value.length === 0
)
const activeId = computed(() => {
  const entry = entries.value[activeIndex.value]
  return entry ? optionId(entry.index) : undefined
})

const optionId = (index) => `gs-opt-${index}`

let searchTimer = null
let searchSeq = 0

function resetResults() {
  searchSeq += 1
  products.value = []
  tools.value = []
  loading.value = false
  failed.value = false
}

async function runSearch() {
  const text = trimmed.value
  if (!text) {
    resetResults()
    return
  }

  const seq = ++searchSeq
  loading.value = true
  failed.value = false

  try {
    const [productResult, toolResult] = await Promise.all([
      api.getProducts({ keyword: text, status: 'all', in_stock: 'all', limit: RESULT_LIMIT }),
      api.getTools({ keyword: text, limit: RESULT_LIMIT }).catch(() => null),
    ])

    // 慢请求回来时用户可能已经改了关键词；只接受最后一次
    if (seq !== searchSeq) return

    if (!productResult?.success && !toolResult?.success) throw new Error('search failed')
    products.value = (productResult?.data?.products || []).slice(0, RESULT_LIMIT)
    tools.value = (toolResult?.data?.tools || []).slice(0, RESULT_LIMIT)
  } catch {
    if (seq !== searchSeq) return
    failed.value = true
    products.value = []
    tools.value = []
  } finally {
    if (seq === searchSeq) loading.value = false
  }
}

watch(query, () => {
  activeIndex.value = 0
  window.clearTimeout(searchTimer)

  if (!trimmed.value) {
    resetResults()
    return
  }

  loading.value = true
  searchTimer = window.setTimeout(runSearch, SEARCH_DEBOUNCE_MS)
})

watch(activeIndex, async () => {
  await nextTick()
  document.getElementById(activeId.value)?.scrollIntoView({ block: 'nearest' })
})

function openSearch() {
  if (open.value) return
  query.value = ''
  activeIndex.value = 0
  resetResults()
  open.value = true
  activate()
}

function close() {
  if (!open.value) return
  open.value = false
  deactivate()
  query.value = ''
  resetResults()
}

function go(path) {
  close()
  router.push(path)
}

function activateEntry(entry) {
  if (!entry) return
  if (entry.kind === 'page') {
    go(entry.path)
    return
  }
  if (entry.kind === 'product') {
    close()
    router.push({ name: 'ProductDetail', params: { id: entry.product.id } })
    return
  }
  if (entry.kind === 'tool') {
    close()
    openTool(entry.tool)
  }
}

function move(step) {
  const total = entries.value.length
  if (!total) return
  activeIndex.value = (activeIndex.value + step + total) % total
}

function onInputKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    activateEntry(entries.value[activeIndex.value])
  }
}

function onGlobalKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (open.value) close()
    else openSearch()
  }
}

watch(
  () => route.fullPath,
  () => {
    if (open.value) close()
  }
)

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.clearTimeout(searchTimer)
})

defineExpose({ open: openSearch, close })
</script>

<template>
  <Teleport to="body">
    <Transition name="gs-fade">
      <div v-if="open" class="gs-overlay" @pointerdown.self="close">
        <section
          id="global-search"
          ref="modalRef"
          class="gs-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gs-title"
        >
          <h2 id="gs-title" class="visually-hidden">{{ PAGES.searchGlobal.title }}</h2>

          <header class="gs-head">
            <AppIcon name="search" class="gs-head-icon" aria-hidden="true" />
            <input
              id="global-search-input"
              v-model="query"
              class="gs-input"
              type="search"
              autocomplete="off"
              spellcheck="false"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls="gs-results"
              :aria-activedescendant="activeId"
              :placeholder="PAGES.searchGlobal.placeholder"
              @keydown="onInputKeydown"
            />
            <kbd class="gs-kbd gs-kbd--desktop">Esc</kbd>
            <button
              type="button"
              class="ec-icon-btn gs-close"
              :aria-label="PAGES.searchGlobal.close"
              @click="close"
            >
              <AppIcon name="x" />
            </button>
          </header>

          <div class="gs-body">
            <p v-if="!trimmed" class="gs-hint">{{ PAGES.searchGlobal.hint }}</p>
            <p v-else-if="loading" class="gs-hint">{{ PAGES.searchGlobal.loading }}</p>
            <p v-else-if="failed" class="gs-hint gs-hint--error">
              {{ PAGES.searchGlobal.failed }}
              <button type="button" class="gs-retry" @click="runSearch">
                {{ PAGES.searchGlobal.retry }}
              </button>
            </p>

            <div v-if="loading" class="gs-skeleton" aria-hidden="true">
              <span v-for="n in 3" :key="n" class="gs-skeleton-row"></span>
            </div>

            <div
              v-else
              id="gs-results"
              class="gs-results"
              role="listbox"
              :aria-label="PAGES.searchGlobal.title"
            >
              <section
                v-for="group in groups"
                :key="group.key"
                class="gs-group"
                :class="`gs-group--${group.key}`"
              >
                <p v-if="group.title" class="gs-group-title">{{ group.title }}</p>
                <button
                  v-for="item in group.items"
                  :id="optionId(item.index)"
                  :key="`${group.key}-${item.index}`"
                  type="button"
                  class="gs-option"
                  :class="{ 'is-active': item.index === activeIndex }"
                  role="option"
                  :aria-selected="item.index === activeIndex"
                  @mousemove="activeIndex = item.index"
                  @click="activateEntry(item)"
                >
                  <span class="gs-option-icon"><AppIcon :name="item.icon" aria-hidden="true" /></span>
                  <span class="gs-option-main">
                    <span class="gs-option-title">{{ item.title || item.label }}</span>
                    <span v-if="item.meta" class="gs-option-meta">{{ item.meta }}</span>
                  </span>
                  <AppIcon name="chevron-right" class="gs-option-arrow" aria-hidden="true" />
                </button>
              </section>

              <p v-if="showEmpty" class="gs-empty">
                {{ PAGES.searchGlobal.empty }}
                <span class="gs-empty-hint">{{ PAGES.searchGlobal.emptyHint }}</span>
              </p>
            </div>

            <router-link
              v-if="trimmed && !loading"
              class="gs-all"
              :to="{ path: '/search', query: { q: trimmed } }"
              @click="close"
            >
              {{ PAGES.searchGlobal.viewAll }}
              <AppIcon name="chevron-right" aria-hidden="true" />
            </router-link>
          </div>

          <footer class="gs-foot">
            <span><kbd class="gs-kbd">↑</kbd><kbd class="gs-kbd">↓</kbd>{{ PAGES.searchGlobal.arrowHint }}</span>
            <span><kbd class="gs-kbd">Enter</kbd>{{ PAGES.searchGlobal.enterHint }}</span>
            <span class="gs-foot-esc"><kbd class="gs-kbd">Esc</kbd>{{ PAGES.searchGlobal.escHint }}</span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gs-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--ec-z-modal, 400);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 10vh var(--ec-space-4) var(--ec-space-4);
  background: var(--ec-bg-overlay);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.gs-panel {
  display: flex;
  flex-direction: column;
  width: min(680px, 100%);
  max-height: min(72vh, 680px);
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-float);
}

.gs-head {
  display: flex;
  align-items: center;
  gap: var(--ec-space-2);
  padding: var(--ec-space-3) var(--ec-space-4);
  border-bottom: 1px solid var(--divider);
}

.gs-head-icon {
  flex: none;
  color: var(--text-muted);
  font-size: var(--fs-body);
}

.gs-input {
  flex: 1 1 auto;
  min-width: 0;
  height: var(--ec-control-h-md);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fs-body);
  outline: none;
}

.gs-input::placeholder {
  color: var(--placeholder);
}

.gs-input::-webkit-search-cancel-button {
  display: none;
}

.gs-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  background: var(--bg-soft);
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: var(--fs-label);
  line-height: 1;
}

.gs-close {
  flex: none;
}

.gs-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--ec-space-2) 0;
}

.gs-hint {
  margin: 0;
  padding: var(--ec-space-2) var(--ec-space-4);
  color: var(--text-muted);
  font-size: var(--fs-label);
}

.gs-hint--error {
  color: var(--danger);
}

.gs-retry {
  margin-left: var(--ec-space-2);
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.gs-group + .gs-group {
  border-top: 1px solid var(--divider);
  margin-top: var(--ec-space-1);
}

.gs-group-title {
  margin: 0;
  padding: var(--ec-space-2) var(--ec-space-4) var(--ec-space-1);
  color: var(--text-muted);
  font-size: var(--fs-label);
}

.gs-option {
  display: flex;
  align-items: center;
  gap: var(--ec-space-2);
  width: 100%;
  padding: var(--ec-space-2) var(--ec-space-4);
  border: 0;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.gs-option.is-active {
  background: var(--accent-soft);
}

.gs-option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-input);
  background: var(--bg-soft);
  color: var(--accent);
}

.gs-option-main {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.gs-option-title {
  overflow: hidden;
  font-size: var(--fs-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gs-option-meta {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--fs-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gs-option-arrow {
  flex: none;
  color: var(--text-muted);
  font-size: var(--fs-label);
}

.gs-empty {
  margin: 0;
  padding: var(--ec-space-5) var(--ec-space-4);
  color: var(--text-secondary);
  font-size: var(--fs-body);
  text-align: center;
}

.gs-empty-hint {
  display: block;
  margin-top: var(--ec-space-1);
  color: var(--text-muted);
  font-size: var(--fs-label);
}

.gs-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-2);
  padding: var(--ec-space-2) var(--ec-space-4) var(--ec-space-3);
}

.gs-skeleton-row {
  height: 40px;
  border-radius: var(--radius-input);
  background: var(--bg-soft);
  animation: gs-pulse 1.2s ease-in-out infinite;
}

@keyframes gs-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.gs-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ec-space-1);
  margin: var(--ec-space-2) var(--ec-space-4) var(--ec-space-1);
  padding: var(--ec-space-2);
  border-top: 1px solid var(--divider);
  color: var(--accent);
  font-size: var(--fs-label);
  text-decoration: none;
}

.gs-all:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.gs-foot {
  display: flex;
  gap: var(--ec-space-3);
  padding: var(--ec-space-2) var(--ec-space-4);
  border-top: 1px solid var(--divider);
  color: var(--text-muted);
  font-size: var(--fs-label);
}

.gs-foot span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.gs-fade-enter-active,
.gs-fade-leave-active {
  transition: opacity 0.16s ease;
}

.gs-fade-enter-from,
.gs-fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  /* 手机端：不再是一块实色地板，而是与导航同源的 Liquid Glass ——
   * 页面在面板后面仍然可感知；上缘 specular 让面板不像一张白纸。 */
  .gs-overlay {
    padding: 0;
    align-items: stretch;
    background: color-mix(in srgb, var(--ec-bg-surface) 24%, transparent);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    backdrop-filter: blur(18px) saturate(160%);
  }

  .gs-panel {
    width: 100%;
    max-height: none;
    height: 100dvh;
    border: 0;
    border-radius: 0;
    background: var(--glass-nav-specular), var(--glass-nav-bg-strong);
    box-shadow: var(--glass-nav-highlight);
    -webkit-backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
    backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
    padding-top: env(safe-area-inset-top);
  }

  .gs-head {
    padding: var(--ec-space-3) var(--ec-space-3);
  }

  /* 手机端不摆快捷入口：一屏只做「输入 → 结果」，少一层选择 */
  .gs-group--quick {
    display: none;
  }

  .gs-kbd--desktop,
  .gs-foot {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gs-fade-enter-active,
  .gs-fade-leave-active {
    transition: none;
  }

  .gs-skeleton-row {
    animation: none;
  }
}
</style>
