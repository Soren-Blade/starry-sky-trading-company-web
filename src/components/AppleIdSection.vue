<template>
  <section class="apple-id-section">
    <div class="directory">
      <!--
        ── 左轨：操作前提 + 线路切换 + 使用说明 ────────────────────────
        桌面端 sticky 在顶栏之下（顶栏是 sticky，必须让出它的高度）。

        ≤991px 时整块左轨 `display: contents` 摊进单列栅格，由各子块的 order
        决定顺序：风险提示在列表之前（安全信息必须先于「取密码」被看到），
        使用说明移到列表之后（它是查得到的参考，不是起步动作）。
        这样只有一份 DOM，不复制内容，也不靠负 margin 硬挪。
      -->
      <aside class="rail" :aria-label="t('appleId.sectionAria')">
        <!-- 风险提示：两块各一句话。原来每条各带一个语义色药丸标签，
             而标题本身就是「只登 App Store / 本站不收解锁费」——标签只是把同一句话
             又说了一遍。现在改用等宽小字 kicker 表达强度，字重与颜色表层级。 -->
        <div class="risk-warning">
          <div class="warning-item warning-item--critical">
            <p class="warning-kicker">{{ t('appleId.riskBadge') }}</p>
            <p class="warning-title">{{ t('appleId.riskTitle') }}</p>
            <p class="warning-text">{{ t('appleId.riskText') }}</p>
          </div>
          <div class="warning-item warning-item--scam">
            <p class="warning-kicker">{{ t('appleId.scamBadge') }}</p>
            <p class="warning-title">{{ t('appleId.scamTitle') }}</p>
            <p class="warning-text">{{ t('appleId.scamText') }}</p>
          </div>
        </div>

        <!-- 线路切换（桌面常驻左栏）：0 条的线路渲染成不可点的「暂无」，
             不再是指向空区块的死锚点 -->
        <nav class="rail-block rail-nav" :aria-label="t('appleId.lanesAria')">
          <p class="rail-title">{{ t('appleId.lanesTitle') }}</p>
          <ul class="lane-list">
            <li v-for="lane in lanes" :key="lane.id">
              <a v-if="lane.count > 0" class="lane-link" :href="`#${lane.id}`">
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

        <div class="rail-block guide-block">
          <!-- 折叠开关：aria-expanded 让屏幕阅读器知道展开状态 -->
          <button
            class="guide-toggle"
            type="button"
            :aria-expanded="showGuide"
            aria-controls="apple-id-guide"
            @click="showGuide = !showGuide"
          >
            <span class="toggle-icon" aria-hidden="true"><AppIcon name="chevron-right" /></span>
            <span class="toggle-text">
              <AppIcon name="book-open" /> {{ t('appleId.guideToggle') }}
            </span>
          </button>

          <!-- 展开内容留在左轨内部：窄栏排版（有序列表 + --fs-sm + --leading-body） -->
          <div v-if="showGuide" id="apple-id-guide" class="guide-content">
            <div class="guide-item">
              <h4 class="guide-subtitle">{{ t('appleId.guideTutorial') }}</h4>
              <ol class="guide-list">
                <li v-for="step in tm('appleId.guideSteps')" :key="step">{{ step }}</li>
              </ol>
            </div>

            <div class="guide-item">
              <h4 class="guide-subtitle">{{ t('appleId.guideNotes') }}</h4>
              <ul class="guide-list guide-list--notes">
                <li v-for="item in NOTE_ITEMS" :key="item.label">
                  <strong>{{ item.label }}</strong>{{ item.text }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── 主区：账号目录 ───────────────────────────────────────── -->
      <div class="directory-main">
        <!-- 无身份：Apple ID 列表走 JWT 保护的 /toolApi/getAppleIds，
             照常请求只会拿到 401 并显示「加载失败」，不如直接给出登录引导。
             刻意**不复用** .error-container —— 那是危险色面板，
             「还没登录」不是错误，用红色会误导用户以为出故障了。 -->
        <div v-if="!hasIdentity" class="identity-panel">
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
  </section>
</template>

<script setup>
/**
 * 共享 Apple ID 的账号目录区块。
 *
 * 版式 = 左栏（前提 + 线路 + 说明）+ 主区（线路区块 + 紧凑卡网格），
 * 窄屏时左栏摊进单列、使用说明移到列表之后、线路切换变吸顶条。
 *
 * 状态全部来自 tool store（loading / error 由 store 提供：组件内部的 catch 收不到错，
 * 会导致失败时只显示空态、重试按钮不可达）。
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useToolStore } from '@/stores/tool'
import { useUserStore } from '@/stores/user'
import AppleIdCard from '@/components/AppleIdCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import InlineErrorNote from '@/components/InlineErrorNote.vue'
import { AUTH } from '@/constants/index.js'

/** 失败面板里的「联系客服」指向支持页（与全站后台入口保持一致） */
const SUPPORT_HREF = '/support'

const { t, tm } = useI18n()
const toolStore = useToolStore()
const userStore = useUserStore()
const { appleIds, appleIdsLoading: loading, appleIdsError: error } = storeToRefs(toolStore)

/** 列表走 JWT 保护的接口，无身份时不发请求，改为给出登录引导 */
const hasIdentity = computed(() => Boolean(userStore.userId))

const showGuide = ref(false)

/** 注意事项：文案随语言切换，label 与 text 分开以保留加粗前缀 */
const NOTE_ITEMS = computed(() => tm('appleId.guideNoteItems') || [])

const nanoCloudIds = computed(() => appleIds.value?.nanoCloud || [])
const fangQiangNanIds = computed(() => appleIds.value?.fangQiangNan || [])

/**
 * 线路表是左栏切换、窄屏吸顶条、主区分区三处的**唯一**数据源：
 * 计数、名称、锚点 id 都从这里派生，避免三处各算一遍导致数字不一致。
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
])

/** 只渲染有账号的线路；空线路只以「暂无」出现在切换条里 */
const visibleLanes = computed(() => lanes.value.filter((lane) => lane.count > 0))

// 获取苹果ID列表（重试按钮复用同一入口）
const fetchAppleIds = () => toolStore.fetchAppleIds()

// 组件挂载时获取数据（无身份时跳过，避免一个必然 401 的请求）
onMounted(() => {
  if (!hasIdentity.value) return
  fetchAppleIds()
})
</script>

<style scoped>
/*
 * 版式：「目录」—— 左栏 + 主区。
 *   左栏：风险提示 + 线路切换（桌面）+ 使用说明（折叠），sticky；
 *   主区：线路区块（小标题 + 计数）+ 紧凑卡网格 + 四态。
 *
 * 视觉值一律来自 variables.css 的令牌；卡片外壳走 .ui-card（AppleIdCard 内），
 * 加载 / 按钮 / 空态走共享类（.u-loading-block / .u-spinner / .u-btn-primary / .u-empty）。
 */

.apple-id-section {
  position: relative;
  width: 100%;
  /* 页头已由外壳给出下边距，这里不再叠一段 section 间距 */
  padding-bottom: calc(var(--section-gap) * 0.5);
  background: transparent;
}

/* ── 两栏骨架 ─────────────────────────────────────────────────
 * 左栏宽度 = 一张卡片宽 + 2 个间距单位：它只装三行标题与一条切换，
 * 比原来「一张卡 + 4 个单位」更窄，主区因此能多出一列卡片。
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
  /* 展开使用说明后总高会超过视口，而比视口高的 sticky 面板底部永远滚不到，
     因此左栏自己成为滚动容器（只有一个滚动条，不做嵌套滚动） */
  max-height: calc(100vh - var(--navbar-height) - var(--space-unit) * 4);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--card-padding);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

/* ── 风险提示 ───────────────────────────────────────────────── */
.risk-warning {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
}

.warning-item {
  padding: calc(var(--space-unit) * 1.5);
  border-inline-start: calc(var(--space-unit) * 0.5) solid currentColor;
  border-radius: var(--radius-input);
}

.warning-item--critical {
  color: var(--danger);
  background: var(--danger-bg);
}

.warning-item--scam {
  color: var(--warning);
  background: var(--warning-bg);
}

/* kicker 用等宽小字承担「强度」：同一句标题不再配一个药丸标签 */
.warning-kicker {
  margin: 0 0 calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: currentColor;
}

.warning-title {
  margin: 0;
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  color: var(--text-primary);
}

.warning-text {
  margin: calc(var(--space-unit) * 0.5) 0 0;
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 线路切换（桌面） ───────────────────────────────────────── */
.rail-block {
  padding-top: calc(var(--space-unit) * 2);
  border-top: var(--stroke-width) solid var(--divider);
}

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

/* ── 使用说明折叠 ───────────────────────────────────────────── */
.guide-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
  width: 100%;
  padding: calc(var(--space-unit) * 0.75) calc(var(--space-unit) * 1.25);
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

.guide-toggle:hover {
  color: var(--accent);
  background: var(--bg-soft);
}

.guide-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.toggle-icon {
  display: inline-flex;
  transition: transform var(--transition-interactive);
}

.guide-toggle[aria-expanded='true'] .toggle-icon {
  transform: rotate(90deg);
}

.toggle-text {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 1.25) 0;
}

.guide-subtitle {
  margin: 0 0 var(--space-unit);
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--text-secondary);
}

.guide-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-unit);
  margin: 0;
  padding-inline-start: calc(var(--space-unit) * 2.5);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.guide-list--notes {
  padding-inline-start: 0;
  list-style: none;
}

.guide-list strong {
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

/* ── 主区 ──────────────────────────────────────────────────── */
.directory-main {
  display: flex;
  flex-direction: column;
  gap: var(--grid-gap);
  min-width: 0;
}

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

.data-source-section:focus-visible {
  outline: none;
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

  /* 左栏摊平：风险提示排到列表之前，使用说明排到列表之后 */
  .rail {
    display: contents;
  }

  .risk-warning {
    order: 1;
  }

  .rail-nav {
    display: none;
  }

  .directory-main {
    order: 2;
  }

  .guide-block {
    order: 3;
    padding: calc(var(--space-unit) * 1.5);
    background: var(--bg-surface);
    border: var(--stroke-width) solid var(--border);
    border-radius: var(--radius-card);
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

@media (max-width: 575px) {
  .warning-item {
    padding: calc(var(--space-unit) * 1.25);
  }
}
</style>
