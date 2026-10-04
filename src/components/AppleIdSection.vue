<template>
  <section class="apple-id-section">
    <div class="section-container">
      <!-- 使用说明 -->
      <div class="guide-section">
        <!-- 折叠面板：aria-expanded 让屏幕阅读器知道展开状态 -->
        <button
          class="guide-toggle"
          type="button"
          :aria-expanded="showGuide"
          @click="showGuide = !showGuide"
        >
          <span class="toggle-icon" aria-hidden="true">{{ showGuide ? "▼" : "▶" }}</span>
          <span class="toggle-text"><span aria-hidden="true">📖</span> 使用说明（新手必看）</span>
        </button>
        <div v-if="showGuide" class="guide-content u-enter">
          <div class="guide-item tutorial">
            <h4 class="guide-subtitle">使用教程</h4>
            <ol class="guide-list">
              <li>1 - 打开应用商店（App Store）</li>
              <li>2 - 左上角退出当前ID，复制账户、密码登陆共享ID</li>
              <li>3 - 登陆提示选择 - 其他选项 - 不升级 - 以后</li>
              <li>4 - 下载成功后退出共享ID，登陆自己ID</li>
            </ol>
            <!-- <p class="guide-note">如果不懂请看底下教程视频，不按教程操作锁机概不收费！</p> -->
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

      <!-- 风险提示 -->
      <div class="risk-warning">
        <div class="warning-item critical u-enter" :style="{ '--i': 0 }">
          <span class="warning-icon" aria-hidden="true">⚠️</span>
          <div class="warning-content">
            <p class="warning-title">使用APP Store登录</p>
            <p class="warning-text">
              使用苹果ID必须从App
              Store登录，千万不要登录「iCloud」，否则可能导致锁机或者隐私泄漏！
            </p>
          </div>
        </div>
        <div class="warning-item scam u-enter" :style="{ '--i': 1 }">
          <span class="warning-icon" aria-hidden="true">⚠️</span>
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

      <!-- 苹果ID网格 -->
      <div v-else class="apple-ids-grid">
        <!-- NanoCloud 数据源 -->
        <div v-if="nanoCloudIds.length > 0" class="data-source-section">
          <h3 class="source-title">主线路</h3>
          <div class="ids-grid">
            <AppleIdCard
              v-for="(id, index) in nanoCloudIds"
              :key="`nano-${index}`"
              :appleId="id"
              source="NanoCloud"
            />
          </div>
        </div>

        <!-- FangQiangNan 数据源 -->
        <div v-if="fangQiangNanIds.length > 0" class="data-source-section">
          <h3 class="source-title">副线路</h3>
          <div class="ids-grid">
            <AppleIdCard
              v-for="(id, index) in fangQiangNanIds"
              :key="`fang-${index}`"
              :appleId="id"
              source="FangQiangNan"
            />
          </div>
        </div>

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
 * 本组件只保留自身特有布局，三条前提：
 *   1. 区块底色由 body 的 --bg-page 承担，组件不再自绘背景
 *      （原先的浅色线性渐变里写死了两个色值，已删除）；
 *   2. 区块头（.section-header 系列）由 global.css / SectionHeader.vue 提供，
 *      原先在这里抄的第二份既与全局重复、scoped 也选不到子组件内部，已整段删除；
 *   3. 加载态与按钮走共享类（.u-loading-block / .u-spinner / .u-btn-primary）。
 */

.apple-id-section {
  position: relative;
  width: 100%;
  /* 段落节奏从 --section-gap 派生，跟随主题密度（density）缩放 */
  padding: calc(var(--section-gap) * 0.5) 0;
  background: transparent;
}

.section-container {
  max-width: var(--container-content);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

/* ── 使用说明（折叠面板）────────────────────────────────────── */

/* 外壳走「面板」档令牌：内边距 --card-padding-lg、圆角 --radius-panel、
   描边 --border、阴影 --shadow-card —— 比卡片大一档，表达容器而非条目 */
.guide-section {
  margin-bottom: calc(var(--section-gap) * 0.5);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* 触发器用 --accent 底 + --text-on-accent：深色主题下是白字，
   neo-brutalism / technical-monochrome 下自动切成黑字，无需分支 */
.guide-toggle {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  width: 100%;
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  text-align: left;
  color: var(--text-on-accent);
  background: var(--accent);
  transition: background-color var(--transition-interactive);
}

.guide-toggle:hover {
  background: var(--accent-strong);
}

.toggle-icon {
  display: inline-flex;
  align-items: center;
  transition: transform var(--transition-interactive);
}

.toggle-text {
  flex: 1;
}

/* 展开区退到次级表面：与面板本体拉开层级，不引入新颜色 */
.guide-content {
  padding: var(--card-padding-lg);
  background: var(--bg-surface-2);
}

/* 两组之间的间距用基础单位派生（--card-padding-lg 是容器档内边距，
   不用来当条目间距） */
.guide-item {
  margin-bottom: calc(var(--space-unit) * 2);
}

.guide-item:last-child {
  margin-bottom: 0;
}

.guide-subtitle {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  margin: 0 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-body);
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

.guide-list {
  margin: 0;
  padding-left: calc(var(--space-unit) * 3);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.guide-list li {
  margin-bottom: calc(var(--space-unit));
}

/* 圆点由 global.css 的 ul/ol 重置清掉，这里用伪元素补回可控的标记 */
.guide-tips-list {
  margin: 0;
  padding-left: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

.guide-tips-list li {
  position: relative;
  padding: calc(var(--space-unit)) 0 calc(var(--space-unit)) calc(var(--space-unit) * 2.5);
}

.guide-tips-list li::before {
  content: "●";
  position: absolute;
  left: 0;
  color: var(--accent);
}

/* ── 风险提示 ─────────────────────────────────────────────────
 * 两条提示分别取 .u-tag--danger / .u-tag--warning 的语义色方案：
 * 底色用语义柔和底（--danger-bg / --warning-bg），文字与左侧色条用语义色本身。
 * 语义色只有一份来源，五套主题都成立。 */

.risk-warning {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--section-gap) * 0.5);
}

.warning-item {
  display: flex;
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

.warning-icon {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
  padding-top: calc(var(--space-unit) * 0.25);
  font-size: var(--fs-h3);
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

.error-container {
  padding: calc(var(--section-gap) * 0.8) var(--container-padding);
  text-align: center;
}

.error-message {
  margin-bottom: calc(var(--space-unit) * 2);
  font-size: var(--fs-body);
  color: var(--danger);
}

/* .error-container 里的重试按钮就是 .u-btn-primary，组件内不再复写 */

/* ── 数据源分区 ─────────────────────────────────────────────── */

.apple-ids-grid {
  display: flex;
  flex-direction: column;
  gap: calc(var(--section-gap) * 0.6);
}

/* 分区是「装卡片的容器」，所以用面板档令牌：
   内边距 --card-padding-lg、圆角 --radius-panel、描边 --border、阴影 --shadow-card */
.data-source-section {
  padding: var(--card-padding-lg);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.source-title {
  margin: 0 0 calc(var(--space-unit) * 3);
  padding-bottom: calc(var(--space-unit) * 1.5);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  border-bottom: var(--stroke-width) solid var(--border);
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
  padding: calc(var(--section-gap) * 0.6) var(--container-padding);
  font-size: var(--fs-body);
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

/* ── 响应式（统一断点：767 / 575）─────────────────────────────
   移动端缩放按规范：内边距 ×0.8、区块间距 ×0.6、标题字号 ×0.7、正文字号 ×0.95
   （按钮与加载圈属于共享类，缩放已在 global.css 内处理；
   栅格列数由 auto-fill + --card-width 自行收敛，无需逐档声明） */

@media (max-width: 767px) {
  .apple-id-section {
    padding: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale)) 0;
  }

  .guide-section {
    margin-bottom: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale));
  }

  .guide-toggle {
    padding: calc(var(--space-unit) * 2 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .guide-content,
  .data-source-section {
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .guide-list,
  .guide-tips-list,
  .warning-text {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .guide-list {
    padding-left: calc(var(--space-unit) * 2.5);
  }

  .guide-tips-list li {
    padding-left: calc(var(--space-unit) * 2.25);
  }

  .source-title {
    font-size: calc(var(--fs-h3) * var(--mobile-title-scale));
  }

  .risk-warning {
    gap: calc(var(--space-unit) * 2 * var(--mobile-section-scale));
    margin-bottom: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale));
  }

  .warning-item {
    gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--space-unit) * 2 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
  }

  .apple-ids-grid {
    gap: calc(var(--section-gap) * 0.6 * var(--mobile-section-scale));
  }

  .empty-note {
    padding: calc(var(--section-gap) * 0.6 * var(--mobile-section-scale))
      var(--container-padding);
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .error-container {
    padding: calc(var(--section-gap) * 0.8 * var(--mobile-section-scale))
      var(--container-padding);
  }
}

@media (max-width: 575px) {
  .section-container {
    padding: 0 calc(var(--container-padding) * var(--mobile-padding-scale));
  }
}
</style>
