<template>
  <section class="apple-id-section">
    <div class="directory">
      <!--
        ── 左轨：风险常驻 + 教程入口 + 线路切换 ──────────────────────
        桌面端 sticky 在顶栏之下（顶栏是 sticky，必须让出它的高度）。

        三块的次序 = 先安全、再方法、后目标：风险（随时回看）→ 教程（怎么用）
        → 线路（去哪条），一条竖线把三块分开，读的时候从上往下走。

        ≤991px 时整块左轨收起 —— 窄屏的替身是：风险进弹窗（只在首次确认时看）、
        教程入口变成目录最上方的按钮、线路切换变成吸顶条。
      -->
      <aside class="rail" :aria-label="t('appleId.sectionAria')">
        <!--
          风险常驻（桌面）：4.31.0 起弹窗确认之后，这两条仍留在左栏最上方。
          弹窗保证「第一次看见」，滚动浏览账号时还需要一个随时可回看的锚点；
          窄屏不渲染这块（左栏整体隐藏），手机端只在弹窗里看一次。
        -->
        <div class="rail-block rail-risk">
          <ul class="rail-risk-list">
            <li class="rail-risk-item rail-risk-item--critical">
              <p class="rail-risk-label">{{ t('appleId.riskBadge') }}</p>
              <p class="rail-risk-title">{{ t('appleId.riskTitle') }}</p>
              <p class="rail-risk-text">{{ t('appleId.riskText') }}</p>
            </li>
            <li class="rail-risk-item rail-risk-item--scam">
              <p class="rail-risk-label">{{ t('appleId.scamBadge') }}</p>
              <p class="rail-risk-title">{{ t('appleId.scamTitle') }}</p>
              <p class="rail-risk-text">{{ t('appleId.scamText') }}</p>
            </li>
          </ul>
        </div>

        <!-- 教程入口（桌面）：点击后右侧目录切换成教程视图，
             不再是原来那个把长文塞进 300px 栏内的折叠区 -->
        <div class="rail-block rail-guide">
          <button
            class="guide-entry"
            type="button"
            :aria-pressed="view === 'guide'"
            @click="openGuide"
          >
            <span class="guide-entry-icon" aria-hidden="true"><AppIcon name="book-open" /></span>
            <span class="guide-entry-text">{{ t('appleId.guideCta') }}</span>
            <span class="guide-entry-arrow" aria-hidden="true"><AppIcon name="chevron-right" /></span>
          </button>
        </div>

        <!-- 线路切换（桌面常驻左栏）：0 条的线路渲染成不可点的「暂无」，
             不再是指向空区块的死锚点 -->
        <nav class="rail-block rail-nav" :aria-label="t('appleId.lanesAria')">
          <p class="rail-title">{{ t('appleId.lanesTitle') }}</p>
          <ul class="lane-list">
            <li v-for="lane in lanes" :key="lane.id">
              <a
                v-if="lane.count > 0"
                class="lane-link"
                :href="`#${lane.id}`"
                @click.prevent="jumpToLane(lane)"
              >
                <span class="lane-name">{{ lane.name }}</span>
                <span class="lane-count">{{ lane.count }}</span>
              </a>
              <span v-else class="lane-link lane-link--empty" aria-disabled="true">
                <span class="lane-name">{{ lane.name }}</span>
                <span class="lane-count">{{ t('appleId.laneEmpty') }}</span>
              </span>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- ── 主区：账号目录 / 教程 ───────────────────────────────── -->
      <div class="directory-main">
        <!-- 教程入口（窄屏）：放在目录最上方，是手机上「先看怎么用」的入口；
             点击打开右侧抽屉，而不是像桌面那样整块替换目录 -->
        <button class="guide-entry guide-entry--mobile" type="button" @click="openGuide">
          <span class="guide-entry-icon" aria-hidden="true"><AppIcon name="book-open" /></span>
          <span class="guide-entry-text">{{ t('appleId.guideCta') }}</span>
          <span class="guide-entry-arrow" aria-hidden="true"><AppIcon name="chevron-right" /></span>
        </button>

        <!-- 教程视图（桌面）：占满目录区，顶上一枚返回，回到账号列表 -->
        <div v-if="showGuideView" class="guide-view">
          <button class="guide-back" type="button" @click="view = 'list'">
            <AppIcon name="chevron-left" />
            <span>{{ t('appleId.guideBack') }}</span>
          </button>
          <AppleIdGuide />
        </div>

        <!-- 无身份：Apple ID 列表走 JWT 保护的 /toolApi/getAppleIds，
             照常请求只会拿到 401 并显示「加载失败」，不如直接给出登录引导。
             刻意**不复用** .error-container —— 那是危险色面板，
             「还没登录」不是错误，用红色会误导用户以为出故障了。 -->
        <div v-else-if="!hasIdentity" class="identity-panel">
          <span class="identity-icon" aria-hidden="true"><AppIcon name="lock" /></span>
          <p class="identity-title">{{ AUTH.needIdentityTitle }}</p>
          <p class="identity-hint">{{ AUTH.needIdentityHint }}</p>
          <button class="u-btn-primary" type="button" @click="userStore.openLoginModal()">
            {{ AUTH.loginCta }}
          </button>
        </div>

        <!-- 加载态：区块级加载走共享类 .u-loading-block + .u-spinner -->
        <div v-else-if="loading" class="u-loading-block" role="status">
          <span class="u-spinner" aria-hidden="true"></span>
          <p class="loading-text">{{ t('appleId.loading') }}</p>
        </div>

        <!-- 失败态：标题讲人话、后端原文折进 details（4.28.0 起的统一做法） -->
        <InlineErrorNote
          v-else-if="error"
          :title="t('appleId.errorTitle')"
          :hint="t('appleId.errorHint')"
          :detail="error"
          :retry-label="t('appleId.retry')"
          :support-href="SUPPORT_HREF"
          @retry="fetchAppleIds"
        />

        <template v-else>
          <!-- 线路切换（窄屏吸顶条）：桌面用左栏那一份，这一份只在 ≤991px 出现。
               同一份数据、两种形态 —— 手机上滚到第 12 张卡想换线路时，
               不必再滚回页面顶部。 -->
          <nav class="lane-bar" :aria-label="t('appleId.lanesAria')">
            <ul class="lane-chips">
              <li v-for="lane in lanes" :key="lane.id">
                <a
                  v-if="lane.count > 0"
                  class="lane-chip"
                  :class="{ 'lane-chip--accent': lane.accent }"
                  :href="`#${lane.id}`"
                  @click.prevent="jumpToLane(lane)"
                >
                  {{ lane.name }}<span class="lane-chip-count">{{ lane.count }}</span>
                </a>
                <span v-else class="lane-chip lane-chip--empty" aria-disabled="true">
                  {{ lane.name }}<span class="lane-chip-count">{{ t('appleId.laneEmpty') }}</span>
                </span>
              </li>
            </ul>
          </nav>

          <div class="lanes">
            <!-- 两个数据源区块各带 id 供线路切换跳转；tabindex 让跳转能落焦 -->
            <section
              v-for="lane in visibleLanes"
              :id="lane.id"
              :key="lane.id"
              class="data-source-section"
              tabindex="-1"
            >
              <div class="source-head">
                <h3 class="source-title">{{ lane.name }}</h3>
                <span class="source-count">{{ t('appleId.count', { count: lane.count }) }}</span>
              </div>
              <div class="ids-grid">
                <AppleIdCard
                  v-for="(id, index) in lane.items"
                  :key="`${lane.id}-${index}`"
                  :appleId="id"
                />
              </div>
            </section>

            <!-- 空态：两条线路都没货时给一个可读的说明，而不是一片空白 -->
            <div v-if="visibleLanes.length === 0" class="empty-note">
              <span class="empty-icon" aria-hidden="true"><AppIcon name="package" /></span>
              <p class="empty-title">{{ t('appleId.emptyTitle') }}</p>
              <p class="empty-desc">{{ t('appleId.emptyDesc') }}</p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 教程抽屉（窄屏）：右侧滑出，铺满手机宽度；Escape / 点遮罩 / 关闭按钮都能收起 -->
    <div v-if="drawerOpen" class="ec-overlay" @click.self="closeGuide">
      <aside
        ref="drawerRef"
        class="ec-drawer guide-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apple-id-guide-title"
      >
        <header class="ec-drawer__head guide-drawer-head">
          <h2 id="apple-id-guide-title" class="guide-drawer-title">
            {{ t('appleId.guideCta') }}
          </h2>
          <button
            class="guide-drawer-close"
            type="button"
            :aria-label="t('appleId.guideClose')"
            @click="closeGuide"
          >
            <AppIcon name="x" />
          </button>
        </header>

        <div class="ec-drawer__body guide-drawer-body">
          <AppleIdGuide />
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
/**
 * 共享 Apple ID 的账号目录区块。
 *
 * 版式 = 左栏（教程入口 + 线路）+ 主区（教程视图 / 线路区块 / 四态）。
 * 教程两种容器：桌面在目录内切换视图，窄屏走右侧抽屉。
 *
 * 状态全部来自 tool store（loading / error 由 store 提供：组件内部的 catch 收不到错，
 * 会导致失败时只显示空态、重试按钮不可达）。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useToolStore } from '@/stores/tool'
import { useUserStore } from '@/stores/user'
import AppleIdCard from '@/components/AppleIdCard.vue'
import AppleIdGuide from '@/components/AppleIdGuide.vue'
import AppIcon from '@/components/AppIcon.vue'
import InlineErrorNote from '@/components/InlineErrorNote.vue'
import { useModalA11y } from '@/hooks/useModalA11y'
import { AUTH } from '@/constants/index.js'

/** 失败面板里的「联系客服」指向支持页（与全站后台入口保持一致） */
const SUPPORT_HREF = '/support'

/** 窄屏判据与抽屉一致：767px 以下走抽屉，以上在目录内切换视图 */
const COMPACT_QUERY = '(max-width: 767px)'

const { t } = useI18n()
const toolStore = useToolStore()
const userStore = useUserStore()
const { appleIds, appleIdsLoading: loading, appleIdsError: error } = storeToRefs(toolStore)

/** 列表走 JWT 保护的接口，无身份时不发请求，改为给出登录引导 */
const hasIdentity = computed(() => Boolean(userStore.userId))

/** 桌面主区当前展示什么：账号列表 / 教程 */
const view = ref('list')
/** 窄屏教程抽屉 */
const drawerOpen = ref(false)
/** 窄屏？由 matchMedia 驱动（响应式 ref，而不是每次点击时临时读一次） */
const compact = ref(false)

/**
 * 教程视图只在宽屏成立。
 * 少了 `!compact` 这一项就会出问题：桌面切到教程后把窗口缩窄（或手机横竖屏切换），
 * 目录里会同时出现「使用教程」按钮和整块教程视图 —— 手机上等于把教程又摊回正文，
 * 而教程本该只在抽屉里。
 */
const showGuideView = computed(() => view.value === 'guide' && !drawerOpen.value && !compact.value)

const isCompact = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(COMPACT_QUERY).matches

/** 教程入口：桌面在「列表 ↔ 教程」之间切换（再点一次收回），窄屏开抽屉 */
const openGuide = () => {
  if (isCompact()) {
    drawerOpen.value = true
    return
  }
  view.value = view.value === 'guide' ? 'list' : 'guide'
}

/**
 * 线路跳转：教程视图下点左栏线路 = 先切回列表，再滚到该线路并落焦。
 * 少这一步时，教程视图里点线路没有任何反应（目标 id 还没渲染），
 * 用户只能先找「返回账号列表」——多一次不必要的点击。
 */
const jumpToLane = async (lane) => {
  if (!lane || lane.count === 0) return
  if (view.value === 'guide') {
    view.value = 'list'
    await nextTick()
  }
  const target = typeof document !== 'undefined' ? document.getElementById(lane.id) : null
  if (!target) return
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
}

const { modalRef: drawerRef, activate, deactivate } = useModalA11y({
  close: () => closeGuide(),
  auto: false,
})

const closeGuide = () => {
  drawerOpen.value = false
}

/** 抽屉开关时接管 / 归还滚动锁与焦点（useModalA11y 的项目约定） */
watch(drawerOpen, (open) => {
  if (open) activate()
  else deactivate()
})

const nanoCloudIds = computed(() => appleIds.value?.nanoCloud || [])
const fangQiangNanIds = computed(() => appleIds.value?.fangQiangNan || [])
const wwkjIds = computed(() => appleIds.value?.wwkj || [])

/**
 * 线路表是左栏切换、窄屏吸顶条、主区分区三处的**唯一**数据源：
 * 计数、名称、锚点 id 都从这里派生，避免三处各算一遍导致数字不一致。
 * 新增数据源只需要在这里加一行 —— 三处入口自动跟上。
 */
const lanes = computed(() => [
  {
    id: 'nano-cloud',
    name: t('appleId.mainLane'),
    items: nanoCloudIds.value,
    count: nanoCloudIds.value.length,
    accent: true,
  },
  {
    id: 'fang-qiang-nan',
    name: t('appleId.backupLane'),
    items: fangQiangNanIds.value,
    count: fangQiangNanIds.value.length,
    accent: false,
  },
  {
    id: 'wwkj',
    name: t('appleId.extraLane'),
    items: wwkjIds.value,
    count: wwkjIds.value.length,
    accent: false,
  },
])

/** 只渲染有账号的线路；空线路只以「暂无」出现在切换条里 */
const visibleLanes = computed(() => lanes.value.filter((lane) => lane.count > 0))

// 获取苹果ID列表（重试按钮复用同一入口）
const fetchAppleIds = () => toolStore.fetchAppleIds()

/** 视口判据跟随窗口变化：手机横屏 / 桌面缩窗口时教程容器要跟着换 */
const compactQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(COMPACT_QUERY)
    : null

const syncCompact = () => {
  compact.value = compactQuery ? compactQuery.matches : false
}

// 组件挂载时获取数据（无身份时跳过，避免一个必然 401 的请求）
onMounted(() => {
  syncCompact()
  compactQuery?.addEventListener?.('change', syncCompact)

  if (!hasIdentity.value) return
  fetchAppleIds()
})

onUnmounted(() => {
  compactQuery?.removeEventListener?.('change', syncCompact)
})
</script>

<style scoped>
/*
 * 版式：「目录」—— 左栏 + 主区。
 *   左栏：教程入口 + 线路切换（桌面），sticky；
 *   主区：教程视图 / 线路区块（小标题 + 计数）+ 紧凑卡网格 + 四态。
 *
 * 视觉值一律来自 variables.css 的令牌；卡片外壳走 .ui-card（AppleIdCard 内），
 * 加载 / 按钮 / 空态走共享类（.u-loading-block / .u-spinner / .u-btn-primary / .u-empty），
 * 弹窗与抽屉外壳走设计系统的 .ec-overlay / .ec-dialog / .ec-drawer。
 */

.apple-id-section {
  position: relative;
  width: 100%;
  /* 页头已由外壳给出下边距，这里不再叠一段 section 间距 */
  padding-bottom: calc(var(--section-gap) * 0.5);
  background: transparent;
}

/* ── 两栏骨架 ─────────────────────────────────────────────────
 * 左栏宽度 = 一张卡片宽 + 2 个间距单位：它只装「教程入口 + 两行线路」，
 * 比原来更窄，主区因此能多出一列卡片。
 * align-items: start 是 sticky 的前提 —— 栅格默认拉伸到满高后就没有可粘的行程。 */
.directory {
  display: grid;
  grid-template-columns: calc(var(--card-width) + var(--space-unit) * 2) minmax(0, 1fr);
  gap: calc(var(--grid-gap) * 2);
  align-items: start;
}

/* ── 左栏 ─────────────────────────────────────────────────────
 * 外壳走「面板」档令牌（--radius-panel / --card-padding / --border / --shadow-card）。
 * top 必须让开顶栏高度：顶栏是 position: sticky，否则面板会钻到导航栏下面。 */
.rail {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-unit) * 2);
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  max-height: calc(100vh - var(--navbar-height) - var(--space-unit) * 4);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--card-padding);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.rail-block {
  padding-top: calc(var(--space-unit) * 2);
  border-top: var(--stroke-width) solid var(--divider);
}

/* 第一块不加分隔线：它挨着面板顶端，加线会把面板切成两半 */
.rail-risk {
  padding-top: 0;
  border-top: 0;
}

/* ── 风险常驻（桌面） ─────────────────────────────────────────
 * 弹窗里是「两条大卡」，左栏里是同两条的「索引版」：
 * 一道语义色竖线 + 等宽 kicker + 一句正文，读一眼就够，不占半屏。 */
.rail-risk-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail-risk-item {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.25);
  padding-inline-start: calc(var(--space-unit) * 1.25);
  border-inline-start: calc(var(--stroke-width) * 3) solid currentColor;
}

.rail-risk-item--critical {
  color: var(--danger);
}

.rail-risk-item--scam {
  color: var(--warning);
}

.rail-risk-label {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: currentColor;
}

.rail-risk-title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.rail-risk-text {
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 教程入口 ───────────────────────────────────────────────── */
.guide-entry {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.25);
  width: 100%;
  padding: calc(var(--space-unit) * 1.25);
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  text-align: start;
  color: var(--text-primary);
  background: none;
  border: 0;
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: background-color var(--transition-interactive), color var(--transition-interactive);
}

.guide-entry:hover {
  color: var(--accent);
  background: var(--bg-soft);
}

.guide-entry:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* 教程视图打开时，入口保持「已选中」态：再点一次不会让人以为页面坏了 */
.guide-entry[aria-pressed='true'] {
  color: var(--accent);
  background: var(--accent-soft);
}

.guide-entry-icon {
  display: inline-flex;
  font-size: var(--fs-body);
}

.guide-entry-text {
  flex: 1;
  min-width: 0;
}

.guide-entry-arrow {
  display: inline-flex;
  color: var(--text-muted);
}

/* 桌面左栏已有一枚；窄屏那枚放在目录最上方 */
.guide-entry--mobile {
  display: none;
}

/* ── 线路切换（桌面） ───────────────────────────────────────── */
.rail-title {
  margin: 0 0 var(--space-unit);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--text-muted);
}

.lane-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.lane-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-unit);
  padding: calc(var(--space-unit) * 0.75) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-sm);
  color: var(--text-primary);
  text-decoration: none;
  border-radius: var(--radius-input);
  transition: background-color var(--transition-interactive), color var(--transition-interactive);
}

.lane-link:hover {
  color: var(--accent);
  background: var(--bg-soft);
}

.lane-link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.lane-link--empty {
  color: var(--text-muted);
  cursor: not-allowed;
}

.lane-link--empty:hover {
  color: var(--text-muted);
  background: none;
}

.lane-count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--text-secondary);
}

/* ── 主区 ──────────────────────────────────────────────────── */
.directory-main {
  display: flex;
  flex-direction: column;
  gap: var(--grid-gap);
  min-width: 0;
}

/* ── 教程视图（桌面） ───────────────────────────────────────── */
.guide-view {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
}

.guide-back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  background: none;
  border: 0;
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: color var(--transition-interactive), background-color var(--transition-interactive);
}

.guide-back:hover {
  color: var(--accent);
  background: var(--bg-soft);
}

.guide-back:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* ── 教程抽屉（窄屏） ───────────────────────────────────────── */
.guide-drawer-head {
  flex: none;
}

.guide-drawer-title {
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.guide-drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--icon-btn-size);
  height: var(--icon-btn-size);
  flex: none;
  font-size: var(--icon-btn-icon-size);
  color: var(--text-secondary);
  background: none;
  border: 0;
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: color var(--transition-interactive), background-color var(--transition-interactive);
}

.guide-drawer-close:hover {
  color: var(--text-primary);
  background: var(--bg-soft);
}

.guide-drawer-close:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.guide-drawer-body {
  padding: var(--card-padding);
}

/* ── 未登录 ────────────────────────────────────────────────── */
.identity-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--card-padding-lg) * 2) var(--card-padding-lg);
  text-align: center;
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.identity-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 6);
  height: calc(var(--space-unit) * 6);
  font-size: var(--fs-h3);
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: var(--radius-pill);
}

.identity-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.identity-hint {
  max-width: calc(var(--container-max) * 0.35);
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 线路区块 ──────────────────────────────────────────────── */
.lanes {
  display: flex;
  flex-direction: column;
  gap: calc(var(--grid-gap) * 1.5);
}

.data-source-section {
  display: flex;
  flex-direction: column;
  gap: var(--grid-gap);
  min-width: 0;
  scroll-margin-top: calc(var(--navbar-height) + var(--space-unit) * 4);
}

/* 线路跳转后落焦到这一段（tabindex="-1"）：给键盘用户一个可见的落点，
   否则读屏软件把焦点移过来，视觉上却什么都没发生 */
.data-source-section:focus-visible {
  outline: none;
}

.data-source-section:focus-visible .source-head {
  border-radius: calc(var(--radius-input) * 0.75);
  box-shadow: var(--focus-ring);
}

.source-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-unit);
  padding-bottom: var(--space-unit);
  border-bottom: var(--stroke-width) solid var(--divider);
}

.source-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.source-count {
  flex-shrink: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 卡网格：240px 起跳，1440 下 3 列（原来固定 280px 只能 2 列）。
   min() 兜住极窄屏，避免单列时撑出横向滚动。 */
.ids-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, calc(var(--space-unit) * 30)), 1fr));
  gap: calc(var(--space-unit) * 1.5);
}

/* ── 空态 ──────────────────────────────────────────────────── */
.empty-note {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-unit);
  padding: calc(var(--card-padding-lg) * 1.5) var(--card-padding-lg);
  text-align: center;
  background: var(--bg-surface);
  border: var(--stroke-width) dashed var(--border);
  border-radius: var(--radius-panel);
}

.empty-icon {
  font-size: var(--fs-h3);
  color: var(--text-muted);
}

.empty-title {
  margin: 0;
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.empty-desc {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 窄屏线路切换条（≤991 才出现） ───────────────────────────── */
.lane-bar {
  display: none;
}

.lane-chips {
  display: flex;
  gap: var(--space-unit);
  margin: 0;
  padding: 0;
  list-style: none;
}

.lane-chip {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 0.75) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  color: var(--text-primary);
  text-decoration: none;
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-pill);
  transition: color var(--transition-interactive), border-color var(--transition-interactive);
}

.lane-chip--accent {
  color: var(--accent);
  border-color: var(--accent);
}

.lane-chip--empty {
  color: var(--text-muted);
  border-style: dashed;
}

.lane-chip-count {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--text-secondary);
}

/* ── 断点 ──────────────────────────────────────────────────── */

/* 1024 起两栏会挤压卡片列，991 以下收成单列 */
@media (max-width: 991px) {
  .directory {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--grid-gap);
  }

  /* 左栏摊平：桌面的两块在窄屏各有替身（目录顶部按钮 / 吸顶条），
     左栏本身不再占位 */
  .rail {
    display: none;
  }

  .directory-main {
    order: 1;
  }

  /* 吸顶线路条：滚动到第 12 张卡时仍能换线路。
     ≤991 时顶栏按 --mobile-nav-scale 缩过（见 Navbar.vue），
     这里必须用同一个乘积，否则吸顶条和顶栏之间会漏出一条缝。 */
  .lane-bar {
    position: sticky;
    top: calc(var(--navbar-height) * var(--mobile-nav-scale));
    z-index: 2;
    display: block;
    margin-inline: calc(var(--space-unit) * -1);
    padding: calc(var(--space-unit) * 0.75) var(--space-unit);
    background: var(--bg-page);
    border-bottom: var(--stroke-width) solid var(--divider);
  }

  .data-source-section {
    scroll-margin-top: calc(
      var(--navbar-height) * var(--mobile-nav-scale) + var(--space-unit) * 8
    );
  }
}

@media (max-width: 767px) {
  /* 教程入口换到目录最上方：一条通栏按钮，和卡片同宽 */
  .guide-entry--mobile {
    display: flex;
    padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
    background: var(--bg-surface);
    border: var(--stroke-width) solid var(--border);
    border-radius: var(--radius-card);
  }

  .identity-panel {
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale) * 1.5)
      calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .identity-hint {
    max-width: none;
  }

  .source-title {
    font-size: calc(var(--fs-h3) * var(--mobile-title-scale));
  }

  .ids-grid {
    gap: calc(var(--space-unit) * var(--mobile-padding-scale) * 1.5);
  }

  .lane-chips {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .lane-chips::-webkit-scrollbar {
    display: none;
  }
}
</style>
