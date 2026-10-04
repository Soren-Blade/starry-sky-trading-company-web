<template>
  <section class="apple-id-section">
    <div class="section-container">
      <div class="directory">
        <!--
          ── 左轨：目录导航 ──────────────────────────────────────────────
          桌面端 sticky 在顶栏之下（顶栏是 sticky，必须让出它的高度）；
          ≤991px 变单栏时回到文档流最上方并取消 sticky。
        -->
        <aside class="rail" aria-label="目录导航">
          <div class="rail-block">
            <!-- 折叠开关：aria-expanded 让屏幕阅读器知道展开状态 -->
            <button
              class="guide-toggle"
              type="button"
              :aria-expanded="showGuide"
              aria-controls="apple-id-guide"
              @click="showGuide = !showGuide"
            >
              <span class="toggle-icon" aria-hidden="true">▶</span>
              <span class="toggle-text"><span aria-hidden="true">📖</span> 使用说明（新手必看）</span>
            </button>

            <!-- 展开内容留在左轨内部：窄栏排版（有序列表 + --fs-sm + --leading-body） -->
            <div v-if="showGuide" id="apple-id-guide" class="guide-content u-enter">
              <div class="guide-item tutorial">
                <h4 class="guide-subtitle">使用教程</h4>
                <ol class="guide-list">
                  <li>打开应用商店（App Store）</li>
                  <li>左上角退出当前ID，复制账户、密码登陆共享ID</li>
                  <li>登陆提示选择 - 其他选项 - 不升级 - 以后</li>
                  <li>下载成功后退出共享ID，登陆自己ID</li>
                </ol>
              </div>

              <div class="guide-item tips">
                <h4 class="guide-subtitle">友情提示</h4>
                <ul class="guide-tips-list">
                  <li>
                    <strong>密码更新：</strong
                    >密码30分钟更新一次，过期后请自行来官网获取最新密码，请勿使用旧密码登入
                  </li>
                  <li>
                    <strong>下载软件：</strong
                    >下载软件后必须退出共享AppID，重新登陆自己的AppID
                  </li>
                  <li>
                    <strong>安装说明：</strong
                    >如果已经安装过需要先卸载旧版本重新安装，否则账号会提示锁定
                  </li>
                  <li>
                    <strong>账号锁定：</strong>如果账号锁定等待40分钟然后来获取
                  </li>
                  <li>
                    <strong>重要警告：</strong>请勿登入iCloud，开双重认证会锁机器
                  </li>
                  <li>
                    <strong>责任声明：</strong>不按教程操作出现问题概不负责！！
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- 线路锚点：纯 <a href="#id">，靠目标区块的 id 跳转，不写 JS -->
          <nav class="rail-block rail-nav" aria-label="线路目录">
            <p class="rail-title">线路</p>
            <ul class="lane-list">
              <li>
                <a class="lane-link" href="#nano-cloud">
                  <span class="lane-name">主线路</span>
                  <span class="u-tag u-tag--accent">{{ nanoCloudIds.length }}</span>
                </a>
              </li>
              <li>
                <a class="lane-link" href="#fang-qiang-nan">
                  <span class="lane-name">副线路</span>
                  <span class="u-tag">{{ fangQiangNanIds.length }}</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        <!-- ── 右区：风险提示 + 账号目录 ─────────────────────────────── -->
        <div class="directory-main">
          <!-- 风险提示：语义色各取一份（--danger / --warning），标签走 .u-tag 语义变体 -->
          <div class="risk-warning">
            <div class="warning-item critical u-enter" :style="{ '--i': 0 }">
              <span class="u-tag u-tag--danger"><span aria-hidden="true">⚠️</span>高风险</span>
              <div class="warning-content">
                <p class="warning-title">使用APP Store登录</p>
                <p class="warning-text">
                  使用苹果ID必须从App
                  Store登录，千万不要登录「iCloud」，否则可能导致锁机或者隐私泄漏！
                </p>
              </div>
            </div>
            <div class="warning-item scam u-enter" :style="{ '--i': 1 }">
              <span class="u-tag u-tag--warning"><span aria-hidden="true">⚠️</span>防诈骗</span>
              <div class="warning-content">
                <p class="warning-title">防范诈骗行为</p>
                <p class="warning-text">
                  本站不提供任何付费解锁服务，也不会索取任何个人信息。任何收费解锁或信息索取行为，均为诈骗，请提高警惕。
                </p>
              </div>
            </div>
          </div>

          <!-- 加载状态：区块级加载态走共享类 .u-loading-block + .u-spinner，
               原先自绘的渐变圆环与三点跳动动效不属于规范动效，已删除 -->
          <div v-if="loading" class="u-loading-block" role="status">
            <span class="u-spinner" aria-hidden="true"></span>
            <p class="loading-text">正在加载苹果ID列表</p>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="error" class="error-container">
            <p class="error-message">{{ error }}</p>
            <button class="u-btn-primary" type="button" @click="fetchAppleIds">重试</button>
          </div>

          <!-- 账号目录：两个数据源区块各带 id，供左轨锚点跳转（tabindex 让跳转能落焦） -->
          <div v-else class="lanes">
            <!-- NanoCloud 数据源 -->
            <section
              v-if="nanoCloudIds.length > 0"
              id="nano-cloud"
              class="data-source-section"
              tabindex="-1"
            >
              <div class="source-head">
                <h3 class="source-title">主线路</h3>
                <span class="u-tag u-tag--accent">{{ nanoCloudIds.length }} 个账号</span>
              </div>
              <div class="ids-grid">
                <AppleIdCard
                  v-for="(id, index) in nanoCloudIds"
                  :key="`nano-${index}`"
                  :appleId="id"
                  source="NanoCloud"
                />
              </div>
            </section>

            <!-- FangQiangNan 数据源 -->
            <section
              v-if="fangQiangNanIds.length > 0"
              id="fang-qiang-nan"
              class="data-source-section"
              tabindex="-1"
            >
              <div class="source-head">
                <h3 class="source-title">副线路</h3>
                <span class="u-tag">{{ fangQiangNanIds.length }} 个账号</span>
              </div>
              <div class="ids-grid">
                <AppleIdCard
                  v-for="(id, index) in fangQiangNanIds"
                  :key="`fang-${index}`"
                  :appleId="id"
                  source="FangQiangNan"
                />
              </div>
            </section>

            <!-- 空状态 -->
            <div
              v-if="nanoCloudIds.length === 0 && fangQiangNanIds.length === 0"
              class="empty-note"
            >
              <p>暂无可用的苹果ID</p>
              <p>请稍后再试，或者联系客服获取帮助</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useToolStore } from '@/stores/tool'
import AppleIdCard from '@/components/AppleIdCard.vue'

const toolStore = useToolStore()
// loading / error 统一由 store 提供：原先组件内的 error 永远不会被赋值
// （store 的 fetchAppleIds 吞掉异常并返回 false，组件的 catch 收不到），
// 导致失败时只显示空态、重试按钮不可达。
const { appleIds, appleIdsLoading: loading, appleIdsError: error } = storeToRefs(toolStore)

const showGuide = ref(false)

// 计算不同数据源的ID
const nanoCloudIds = computed(() => appleIds.value?.nanoCloud || [])
const fangQiangNanIds = computed(() => appleIds.value?.fangQiangNan || [])

// 获取苹果ID列表（重试按钮复用同一入口）
const fetchAppleIds = () => toolStore.fetchAppleIds()

// 组件挂载时获取数据
onMounted(() => {
  fetchAppleIds()
})
</script>

<style scoped>
/*
 * 版式：「目录 / Directory」—— 左轨 + 右区两栏。
 *   左轨：使用说明（折叠）+ 线路锚点，桌面端 sticky，窄栏可读；
 *   右区：风险提示 + 两条数据源目录（小标题行 + 计数 + 卡片网格）。
 *
 * 三条前提不变：
 *   1. 区块底色由 body 的 --bg-page 承担，组件不自绘背景；
 *   2. 卡片外壳走 .ui-card（AppleIdCard 内），加载态 / 按钮 / 标签走共享类
 *      （.u-loading-block / .u-spinner / .u-btn-primary / .u-tag）；
 *   3. 组件内只写自己特有的布局，视觉值一律来自 variables.css 的令牌。
 */

.apple-id-section {
  position: relative;
  width: 100%;
  /* 段落节奏从 --section-gap 派生，跟随主题密度（density）缩放 */
  padding: calc(var(--section-gap) * 0.5) 0;
  background: transparent;
}

.section-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

/* ── 两栏骨架 ─────────────────────────────────────────────────
 * 左轨宽度 = 一张卡片宽 + 4 个间距单位，与右区的卡片列形成「目录 / 正文」对照。
 * align-items: start 是 sticky 的前提 —— 栅格默认拉伸到满高后就没有可粘的行程。 */

.directory {
  display: grid;
  grid-template-columns: calc(var(--card-width) + var(--space-unit) * 4) minmax(0, 1fr);
  gap: calc(var(--grid-gap) * 2);
  align-items: start;
}

/* ── 左轨 ─────────────────────────────────────────────────────
 * 外壳走「面板」档令牌（--radius-panel / --card-padding / --border / --shadow-card）。
 * top 必须让开顶栏高度：顶栏是 position: sticky，否则面板会钻到导航栏下面。 */

.rail {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-unit) * 2);
  padding: var(--card-padding);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.rail-nav {
  margin-top: calc(var(--space-unit) * 2.5);
  padding-top: calc(var(--space-unit) * 2.5);
  border-top: var(--stroke-width) solid var(--border);
}

/* 折叠开关：常态次级表面，展开或悬停时换成强调描边。
 * 状态由 aria-expanded 驱动，样式与语义同一个来源。 */
.guide-toggle {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.25);
  width: 100%;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.75);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  line-height: var(--leading-title);
  text-align: left;
  color: var(--text-primary);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
  transition:
    color var(--transition-interactive),
    background-color var(--transition-interactive),
    border-color var(--transition-interactive);
}

.guide-toggle:hover,
.guide-toggle[aria-expanded='true'] {
  color: var(--accent);
  border-color: var(--accent);
}

/* 箭头固定为 ▶，展开时转 90°：状态切换不改变字符宽度，也不换字形 */
.toggle-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: var(--fs-label);
  transition: transform var(--transition-interactive);
}

.guide-toggle[aria-expanded='true'] .toggle-icon {
  transform: rotate(90deg);
}

.toggle-text {
  flex: 1;
}

/* 展开区：窄栏里内容偏长，超过视口高度时在栏内滚动，
 * 避免 sticky 面板被顶出屏幕、底部内容够不到。 */
.guide-content {
  max-height: calc(100vh - var(--navbar-height) - var(--space-unit) * 16);
  margin-top: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 1.75);
  overflow-y: auto;
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

.guide-item + .guide-item {
  margin-top: calc(var(--space-unit) * 2.5);
}

.guide-subtitle {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0 0 calc(var(--space-unit) * 1.25);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

/* 两组列表共用同一枚 ▸ 前缀：教程用强调色，提示退到次要文字色 */
.guide-item.tutorial .guide-subtitle::before,
.guide-item.tips .guide-subtitle::before {
  content: "▸";
  font-size: var(--fs-body);
}

.guide-item.tutorial .guide-subtitle::before {
  color: var(--accent);
}

.guide-item.tips .guide-subtitle::before {
  color: var(--text-muted);
}

/* 有序列表：global.css 的重置清掉了 list-style，这里恢复真实序号标记
 * （原先写在文案里的「1 - 」已去掉，序号交给 li::marker） */
.guide-list {
  margin: 0;
  padding-left: calc(var(--space-unit) * 2.5);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  list-style: decimal;
}

.guide-list li + li {
  margin-top: calc(var(--space-unit));
}

.guide-list li::marker {
  color: var(--accent);
  font-weight: var(--fw-label);
}

.guide-tips-list {
  margin: 0;
  padding-left: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.guide-tips-list li {
  position: relative;
  padding: calc(var(--space-unit) * 0.5) 0 calc(var(--space-unit) * 0.5)
    calc(var(--space-unit) * 2.25);
}

/* 圆点由 global.css 的 ul 重置清掉，这里用伪元素补回可控的标记 */
.guide-tips-list li::before {
  content: "●";
  position: absolute;
  left: 0;
  color: var(--accent);
}

.guide-tips-list strong {
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

/* ── 线路锚点 ─────────────────────────────────────────────────
 * 等宽小标题 + 两条全宽锚点行，右侧挂数量徽标（口径与页面开场一致）。 */

.rail-title {
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-muted);
}

.lane-list {
  margin: 0;
  padding: 0;
}

.lane-list li + li {
  margin-top: calc(var(--space-unit));
}

.lane-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  color: var(--text-primary);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
  transition:
    color var(--transition-interactive),
    background-color var(--transition-interactive),
    border-color var(--transition-interactive);
}

.lane-link:hover {
  color: var(--accent);
  background: var(--bg-soft);
  border-color: var(--accent);
}

/* ── 右区 ─────────────────────────────────────────────────── */

.directory-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--section-gap) * 0.5);
  min-width: 0;
}

.lanes {
  display: flex;
  flex-direction: column;
  gap: calc(var(--section-gap) * 0.5);
}

/* ── 风险提示 ─────────────────────────────────────────────────
 * 两条提示分别取 .u-tag--danger / .u-tag--warning 的语义色方案：
 * 底色用语义柔和底（--danger-bg / --warning-bg），左侧色条与标签用语义色本身。
 * 语义色只有一份来源，五套主题都成立。 */

.risk-warning {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5);
  color: var(--danger);
  background: var(--danger-bg);
  /* 色条宽度取半个间距单位：既保持醒目，又随主题密度一起缩放 */
  border-left: calc(var(--space-unit) * 0.5) solid var(--danger);
  border-radius: var(--radius-card);
}

.warning-item.scam {
  color: var(--warning);
  background: var(--warning-bg);
  border-left-color: var(--warning);
}

/* 语义标签只做标记，不参与压缩 */
.warning-item > .u-tag {
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
  min-width: 0;
}

.warning-title {
  margin: 0 0 calc(var(--space-unit) * 0.75);
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  /* 标题跟随所属提示的语义色 */
  color: inherit;
}

.warning-text {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* ── 加载 / 错误态 ──────────────────────────────────────────── */

/* .u-loading-block 负责占位、居中与内部间距（含区块级节奏），
   这里只补一行文案的排版 */
.loading-text {
  margin: 0;
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-secondary);
}

/* 错误态是一块语义面板：柔和危险底（--danger-bg）+ 语义描边，
   与两条风险提示共用同一套语义色来源，重试按钮仍是共享类 .u-btn-primary */
.error-container {
  padding: calc(var(--section-gap) * 0.4) var(--card-padding);
  text-align: center;
  background: var(--danger-bg);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--radius-panel);
}

.error-message {
  margin-bottom: calc(var(--space-unit) * 2);
  font-size: var(--fs-body);
  color: var(--danger);
}

/* .error-container 里的重试按钮就是 .u-btn-primary，组件内不再复写 */

/* ── 数据源区块 ───────────────────────────────────────────────
 * 区块是「装卡片的容器」，所以用面板档令牌：
 * 内边距 --card-padding-lg、圆角 --radius-panel、描边 --border、阴影 --shadow-card。
 * scroll-margin-top 让左轨锚点跳转后标题不被 sticky 顶栏压住。 */

.data-source-section {
  padding: var(--card-padding-lg);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
  scroll-margin-top: calc(var(--navbar-height) + var(--space-unit) * 2);
}

.source-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 2.5);
  padding-bottom: calc(var(--space-unit) * 1.5);
  border-bottom: var(--stroke-width) solid var(--border);
}

.source-title {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

/* 列数交给卡片最小宽度（--card-width）：容器变窄时自动减列，
   不需要为每一档断点各写一次列数 */
.ids-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
}

/* 无数据时的占位：与 HotProductsSection 的 .grid-note 同构 */
.empty-note {
  padding: calc(var(--section-gap) * 0.4) var(--container-padding);
  font-size: var(--fs-body);
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

/* ── 响应式（统一断点：991 / 767 / 575）──────────────────────
 * ≤991px：两栏变单栏，左轨回到文档流最上方并取消 sticky；
 * ≤767px：内边距 ×0.8、区块间距 ×0.6、标题 ×0.7、正文 ×0.95
 *         （按钮与加载圈属于共享类，缩放已在 global.css 内处理；
 *          栅格列数由 auto-fill + --card-width 自行收敛） */

@media (max-width: 991px) {
  .directory {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail {
    position: static;
  }

  /* 单栏后左轨不再受视口高度约束，撤掉栏内滚动 */
  .guide-content {
    max-height: none;
    overflow-y: visible;
  }
}

@media (max-width: 767px) {
  .apple-id-section {
    padding: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale)) 0;
  }

  .rail {
    padding: calc(var(--card-padding) * var(--mobile-padding-scale));
  }

  .guide-toggle {
    padding: calc(var(--space-unit) * 1.25 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 1.75 * var(--mobile-padding-scale));
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .guide-content {
    padding: calc(var(--space-unit) * 1.75 * var(--mobile-padding-scale));
  }

  .guide-subtitle,
  .guide-list,
  .guide-tips-list,
  .warning-text {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .guide-list {
    padding-left: calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
  }

  .guide-tips-list li {
    padding-left: calc(var(--space-unit) * 2.25 * var(--mobile-padding-scale));
  }

  .lane-link {
    padding: calc(var(--space-unit) * 1.25 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .directory-main,
  .lanes {
    gap: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale));
  }

  .risk-warning {
    gap: calc(var(--space-unit) * 2 * var(--mobile-section-scale));
  }

  .warning-item {
    gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--space-unit) * 2 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
  }

  .data-source-section {
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .source-head {
    margin-bottom: calc(var(--space-unit) * 2.5 * var(--mobile-section-scale));
  }

  .source-title {
    font-size: calc(var(--fs-h3) * var(--mobile-title-scale));
  }

  .empty-note {
    padding: calc(var(--section-gap) * 0.4 * var(--mobile-section-scale))
      var(--container-padding);
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .error-container {
    padding: calc(var(--section-gap) * 0.4 * var(--mobile-section-scale))
      calc(var(--card-padding) * var(--mobile-padding-scale));
  }
}

@media (max-width: 575px) {
  .section-container {
    padding: 0 calc(var(--container-padding) * var(--mobile-padding-scale));
  }
}
</style>
