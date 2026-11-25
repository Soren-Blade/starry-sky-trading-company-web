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

/**
 * 最近搜索：手机端空态的唯一内容。
 *
 * 命令面板在桌面靠「快捷入口」就够用；手机上那一排入口会把首屏变成一张菜单，
 * 4.10 已经砍掉，于是空态只剩一句提示 —— 每开一次面板都像第一次打开。
 * 这里改成本地最近搜索：只记录用户自己搜过的词，不占接口、不猜喜好，
 * 搜过一次之后第二次就是一次点击。写不进去（隐私模式）就静默跳过，
 * 最近搜索是锦上添花，不能打断搜索本身。
 */
const RECENT_KEY = 'sstc.search.recent'
const RECENT_LIMIT = 6
const recent = ref([])

function readRecent() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]')
    recent.value = Array.isArray(raw)
      ? raw.filter((item) => typeof item === 'string' && item.trim()).slice(0, RECENT_LIMIT)
      : []
  } catch {
    recent.value = []
  }
}

function rememberRecent(text) {
  const value = (text || '').trim()
  if (!value) return
  recent.value = [value, ...recent.value.filter((item) => item !== value)].slice(0, RECENT_LIMIT)
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
  } catch {
    /* 隐私模式下写不了 localStorage：最近搜索降级为本次会话内可用 */
  }
}

function clearRecent() {
  recent.value = []
  try {
    window.localStorage.removeItem(RECENT_KEY)
  } catch {
    /* 同上：清不掉也不影响搜索 */
  }
}

function useRecent(text) {
  query.value = text
}

// ── 手机端下拉收起 ────────────────────────────────────────────
// 4.10 的手机面板铺满 100dvh，遮罩被盖住，唯一退出口是右上角那个 ×。
// 这一版把面板改成「顶部抽屉」：顶边留一条抓握条，按住往下拖超过阈值
// （或甩出一段速度）就收起，没到阈值弹回；面板下方留出的页面可以直接点掉。
// 手势只绑在抓握条与头部，不拦截结果列表的滚动。
const DRAG_CLOSE_PX = 72
const DRAG_CLOSE_VELOCITY = 0.6
const dragOffset = ref(0)
const dragging = ref(false)
let dragStartY = 0
let dragStartAt = 0

function isPhone() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function onDragStart(event) {
  // 鼠标拖动与桌面端不参与：桌面已经有 Esc 与点外部
  if (!isPhone() || event.pointerType === 'mouse') return
  dragging.value = true
  dragStartY = event.clientY
  dragStartAt = window.performance.now()
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onDragMove(event) {
  if (!dragging.value) return
  const delta = event.clientY - dragStartY
  // 往下跟手、往上只给 1/4 阻尼：告诉手指「这个方向没有内容」
  dragOffset.value = delta > 0 ? Math.min(delta, 240) : delta / 4
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  const distance = dragOffset.value
  const elapsed = Math.max(1, window.performance.now() - dragStartAt)
  dragOffset.value = 0
  if (distance > DRAG_CLOSE_PX || distance / elapsed > DRAG_CLOSE_VELOCITY) close()
}

function clearQuery() {
  query.value = ''
}

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
  // 每次打开都重新读一遍：别的标签页清过最近搜索时这里不会拿到旧值
  readRecent()
  open.value = true
  // 手机抽屉铺在顶栏上方，两套「头」叠在一起会从玻璃里透出幽灵图标：
  // 用 html 上的状态类让顶栏退场，退场动画由 Navbar 自己的 transition 负责。
  document.documentElement.classList.add('gs-open')
  activate()
}

function close() {
  if (!open.value) return
  open.value = false
  document.documentElement.classList.remove('gs-open')
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
  // 只有「真的拿这个关键词走了」才记进最近搜索：点开结果、看全部结果。
  // 光是打字不算 —— 否则最近搜索里全是打了一半的半截词。
  rememberRecent(query.value)
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
  // 组件被卸载时（比如整页刷新期间的 HMR）别把顶栏永久留在退场态
  document.documentElement.classList.remove('gs-open')
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
          :class="{ 'is-dragging': dragging }"
          :style="dragOffset ? { transform: `translateY(${dragOffset}px)` } : null"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gs-title"
        >
          <h2 id="gs-title" class="visually-hidden">{{ PAGES.searchGlobal.title }}</h2>

          <!-- 手机端把手：往下拖即可收起。桌面端被 CSS 隐藏；
               手势是快捷方式，不是唯一退出口 —— 取消按钮与 Esc 一直都在。 -->
          <div
            class="gs-grab"
            aria-hidden="true"
            @pointerdown="onDragStart"
            @pointermove="onDragMove"
            @pointerup="onDragEnd"
            @pointercancel="onDragEnd"
          >
            <span class="gs-grab-bar"></span>
          </div>

          <header
            class="gs-head"
            @pointerdown="onDragStart"
            @pointermove="onDragMove"
            @pointerup="onDragEnd"
            @pointercancel="onDragEnd"
          >
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
            <button
              v-if="query"
              type="button"
              class="gs-clear"
              :aria-label="PAGES.searchGlobal.clearInput"
              @click="clearQuery"
            >
              <AppIcon name="x" aria-hidden="true" />
            </button>
            <kbd class="gs-kbd gs-kbd--desktop">Esc</kbd>
            <button
              type="button"
              class="ec-icon-btn gs-close gs-close--desktop"
              :aria-label="PAGES.searchGlobal.close"
              @click="close"
            >
              <AppIcon name="x" />
            </button>
            <button type="button" class="gs-cancel" @click="close">
              {{ PAGES.searchGlobal.cancel }}
            </button>
          </header>

          <div class="gs-body">
            <div v-if="!trimmed && recent.length" class="gs-recent">
              <div class="gs-recent-head">
                <p class="gs-group-title">{{ PAGES.searchGlobal.recent }}</p>
                <button type="button" class="gs-recent-clear" @click="clearRecent">
                  {{ PAGES.searchGlobal.clearRecent }}
                </button>
              </div>
              <div class="gs-chips">
                <button
                  v-for="item in recent"
                  :key="item"
                  type="button"
                  class="gs-chip"
                  @click="useRecent(item)"
                >
                  {{ item }}
                </button>
              </div>
            </div>

            <!-- 有最近搜索时不再叠一句用法说明：空态只留一样东西，
                 否则「最近搜索 + 提示」两段文字互相稀释。 -->
            <p v-if="!trimmed && !recent.length" class="gs-hint">
              {{ PAGES.searchGlobal.hint }}
            </p>
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
              @click="rememberRecent(trimmed); close()"
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

/* 取消：手机端的退出口。桌面不显示（那里有 Esc 与右上角 ×）。 */
.gs-cancel {
  display: none;
  flex: none;
  min-height: var(--ec-control-h-md);
  padding: 0 var(--ec-space-1);
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: var(--fs-body);
  cursor: pointer;
}

.gs-clear {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--ec-radius-full);
  background: var(--ec-bg-wash);
  color: var(--text-muted);
  font-size: var(--fs-label);
  cursor: pointer;
}

.gs-clear:hover {
  background: var(--bg-soft);
  color: var(--text-primary);
}

/* 手机端抓握手柄：只做手势入口，不参与读屏（退出口有取消按钮与 Esc） */
.gs-grab {
  display: none;
  align-items: center;
  justify-content: center;
  height: 18px;
  touch-action: none;
}

.gs-grab-bar {
  width: 40px;
  height: 5px;
  border-radius: var(--ec-radius-full);
  background: color-mix(in srgb, var(--text-muted) 42%, transparent);
}

.gs-recent {
  padding-bottom: var(--ec-space-1);
}

.gs-recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ec-space-2);
  padding-right: var(--ec-space-4);
}

.gs-recent-clear {
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: var(--fs-label);
  cursor: pointer;
}

.gs-recent-clear:hover {
  color: var(--accent);
}

.gs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ec-space-2);
  padding: 0 var(--ec-space-4);
}

.gs-chip {
  max-width: 100%;
  min-height: 32px;
  padding: 0 var(--ec-space-3);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--ec-radius-full);
  background: var(--bg-soft);
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--fs-label);
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.gs-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
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

/* 面板入场：桌面从上方 16px 浮入；手机上在下面的断点里改成「整条从顶边滑下」。
 * 基线写在断点之前，断点里只覆盖需要变的那一条，避免同一层出现两个 767 块。 */
.gs-fade-enter-active .gs-panel,
.gs-fade-leave-active .gs-panel {
  transition:
    transform 0.24s var(--ec-ease-out),
    opacity 0.18s ease;
}

.gs-fade-enter-from .gs-panel,
.gs-fade-leave-to .gs-panel {
  opacity: 0;
  transform: translateY(-16px);
}

@media (max-width: 767px) {
  /* 手机端：从顶边「长出来」的一张玻璃抽屉，而不是铺满 100dvh 的全屏页。
   *
   * 4.10 的面板铺满整屏，遮罩被压在底下点不到，唯一退出口是右上角那个 × ——
   * 手指要横跨整屏去够它。这一版把退出口做成三重的、都更近：
   *   ① 顶部抓握条，往下拖过 72px（或甩出速度）收起；
   *   ② 头部右侧「取消」，拇指自然落点；
   *   ③ 面板不占满屏，下方留出的页面本身就是遮罩，点一下即关。
   * 高度按内容走（min(82dvh)），键盘弹出时由浏览器压缩视口，面板跟着变矮。 */
  .gs-overlay {
    padding: 0;
    align-items: flex-start;
    background: color-mix(in srgb, var(--ec-bg-base) 22%, transparent);
    -webkit-backdrop-filter: blur(10px) saturate(150%);
    backdrop-filter: blur(10px) saturate(150%);
  }

  .gs-panel {
    width: 100%;
    max-height: min(82dvh, 720px);
    height: auto;
    border: 0;
    border-radius: 0 0 var(--ec-radius-2xl) var(--ec-radius-2xl);
    /* 与导航同一档玻璃：品牌色渗透 + 上缘 specular + 84% 表面，
     * 面板因此读作「导航栏拉下来的一层」，而不是另一个界面。 */
    background: var(--glass-nav-specular), var(--glass-nav-tint), var(--glass-nav-bg-strong);
    box-shadow: var(--glass-nav-highlight), var(--glass-nav-lift-strong);
    -webkit-backdrop-filter: blur(calc(var(--glass-nav-blur) * 0.9)) saturate(var(--glass-nav-saturate));
    backdrop-filter: blur(calc(var(--glass-nav-blur) * 0.9)) saturate(var(--glass-nav-saturate));
    padding-top: env(safe-area-inset-top);
    transition: transform 0.26s var(--ec-ease-out);
    will-change: transform;
  }

  /* 手机入场：整条抽屉从顶边滑下来，不再是从上浮 16px 的「小弹窗」 */
  .gs-fade-enter-from .gs-panel,
  .gs-fade-leave-to .gs-panel {
    transform: translateY(-100%);
  }

  /* 跟手拖动时不要过渡，松手才有回弹 */
  .gs-panel.is-dragging {
    transition: none;
  }

  .gs-grab {
    display: flex;
  }

  .gs-cancel {
    display: inline-flex;
    align-items: center;
  }

  .gs-close--desktop {
    display: none;
  }

  .gs-head {
    padding: var(--ec-space-2) var(--ec-space-3);
    /* 头部同时是手感区：让纵向拖动交给面板，横向留给输入框光标 */
    touch-action: pan-x;
  }

  .gs-input {
    height: var(--ec-control-h-lg);
  }

  /* 手机端不摆快捷入口：一屏只做「输入 → 结果」，少一层选择 */
  .gs-group--quick {
    display: none;
  }

  .gs-kbd--desktop,
  .gs-foot {
    display: none;
  }

  /* 结果行在手指下要够高：44px 是下限，这里给到 56px 并让副标题不挤标题 */
  .gs-option {
    min-height: 56px;
    padding: var(--ec-space-3);
  }

  .gs-all {
    justify-content: space-between;
    margin: var(--ec-space-2) var(--ec-space-3) var(--ec-space-3);
    padding: var(--ec-space-3);
    border: 1px solid var(--divider);
    border-radius: var(--ec-radius-lg);
    background: color-mix(in srgb, var(--ec-bg-surface) 55%, transparent);
    font-size: var(--fs-body);
  }
}

/* 面板的入场与退场跟着遮罩走：遮罩淡入，面板自己从上方 16px 处落位并回正，
 * 用户看到的是「它从导航栏里长出来」，而不是「一个弹窗突然出现」。
 * 规则写在手机断点之前，手机端那条覆盖在断点里。 */
@media (prefers-reduced-motion: reduce) {
  .gs-fade-enter-active,
  .gs-fade-leave-active {
    transition: none;
  }

  .gs-panel {
    transition: none;
  }

  .gs-fade-enter-from .gs-panel,
  .gs-fade-leave-to .gs-panel {
    transform: none;
  }

  .gs-skeleton-row {
    animation: none;
  }
}
</style>
