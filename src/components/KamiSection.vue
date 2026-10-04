<template>
  <section class="kami-section">
    <div class="section-container">
      <!-- header（共享组件，样式在 global.css） -->
      <SectionHeader icon="🎴" title="卡密管理" description="查看并激活你的卡密" />

      <!-- tabs：外观来自 global.css 的 .u-tag / .u-tag--accent -->
      <div class="tab-bar">
        <button
          type="button"
          class="u-tag"
          :class="{ 'u-tag--accent': activeTab === 'list' }"
          :aria-pressed="activeTab === 'list'"
          @click="activeTab = 'list'"
        >
          <span aria-hidden="true">📋</span> 我的卡密
        </button>
        <button
          type="button"
          class="u-tag"
          :class="{ 'u-tag--accent': activeTab === 'activate' }"
          :aria-pressed="activeTab === 'activate'"
          @click="activeTab = 'activate'"
        >
          <span aria-hidden="true">✨</span> 激活卡密
        </button>
      </div>

      <!-- 未登录提示：卡密属于账号资产，游客态不给操作入口 -->
      <div v-if="!canUseKami" class="notice-card">
        <p class="notice-title">请先登录账号</p>
        <p class="notice-desc">卡密与账号绑定，游客身份无法激活或查看卡密。</p>
      </div>

      <template v-else>
        <!-- activate section -->
        <div v-if="activeTab === 'activate'" class="activate-container">
          <div class="activate-card">
            <h3>激活新卡密</h3>
            <div class="activate-form">
              <select v-model="selectedToolId" class="u-input" aria-label="选择工具">
                <option value="">请选择工具</option>
                <option v-for="tool in toolOptions" :key="tool.value" :value="tool.value">
                  {{ tool.label }}
                </option>
              </select>
              <input
                v-model="activateCode"
                type="text"
                class="u-input"
                placeholder="请粘贴卡密号..."
                aria-label="卡密号"
                @keyup.enter="handleActivate"
              />
              <button
                type="button"
                class="activate-btn u-btn-primary"
                :disabled="!selectedToolId || !activateCode.trim() || activating"
                :aria-busy="activating"
                @click="handleActivate"
              >
                {{ activating ? '激活中...' : '激活' }}
              </button>
            </div>
            <p
              v-if="activationResult"
              :class="activationResult.success ? 'success-msg' : 'error-msg'"
              role="status"
            >
              {{ activationResult.message }}
            </p>
            <p class="activate-tips">
              <span aria-hidden="true">⚡</span> 激活后可在"我的卡密"中查看详情
            </p>
          </div>
        </div>

        <!-- list section with table -->
        <div v-else class="list-container">
          <div class="list-toolbar">
            <div class="toolbar-left">
              <span class="card-count">共 {{ pagination.total }} 张卡密</span>
            </div>
            <div class="toolbar-right">
              <button
                type="button"
                class="refresh-btn u-btn-secondary"
                :disabled="loading"
                title="刷新卡密列表"
                @click="reload(1)"
              >
                <span v-if="loading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
                <span v-else aria-hidden="true">🔄</span>
                {{ loading ? '刷新中...' : '刷新' }}
              </button>
              <select
                v-model="statusFilter"
                class="status-select u-input"
                aria-label="按状态筛选"
                @change="reload(1)"
              >
                <!-- 选项来自 useKamiDisplay，与状态文案/配色同源，避免两处各写一份 -->
                <option v-for="opt in statusFilterOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <p v-if="error" class="error-banner" role="alert">{{ error }}</p>

          <a-table
            :columns="tableColumns"
            :data-source="userKamis"
            :pagination="{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: handlePaginationChange,
              showTotal: (total) => `共 ${total} 条`,
              showQuickJumper: true,
            }"
            :loading="loading"
            :locale="{ emptyText: '暂无卡密' }"
            class="kami-ant-table"
            :scroll="{ x: 1200 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <!--
                注意：一旦提供 #bodyCell，**所有**单元格都由这个插槽决定内容
                （antd 不会对未命中的列回落到 dataIndex 默认渲染）。
                因此每一列都必须有分支 —— 原先缺少 card_name 分支，
                导致「卡密名称」整列为空。
              -->
              <span v-if="column.key === 'card_name'" class="card-name">
                {{ record.card_name || '—' }}
              </span>

              <span v-else-if="column.key === 'card_value'" class="card-value">
                {{ record.card_value }}
              </span>

              <a-tag v-else-if="column.key === 'status'" :color="getStatusColor(record.status)">
                {{ record.status_text || getStatusText(record.status) }}
              </a-tag>

              <span v-else-if="column.key === 'valid_until'">
                <span v-if="record.valid_until" class="muted">{{ formatDate(record.valid_until) }}</span>
                <span v-else class="permanent">永久有效</span>
              </span>

              <span v-else-if="column.key === 'used_at'">
                <span v-if="record.used_at" class="muted">{{ formatDate(record.used_at) }}</span>
                <span v-else class="empty">—</span>
              </span>

              <span v-else-if="column.key === 'tool_id'">
                <span v-if="getToolName(record.tool_id)" class="u-tag">
                  <span aria-hidden="true">🔧</span> {{ getToolName(record.tool_id) }}
                </span>
                <span v-else class="empty-small">未绑定工具</span>
              </span>

              <div v-else-if="column.key === 'card_no_display'" class="card-no-cell">
                <span class="card-no-display">{{ record.card_no_display }}</span>
                <button
                  type="button"
                  class="copy-icon-btn"
                  title="复制脱敏卡号（含掩码，仅用于核对）"
                  aria-label="复制脱敏卡号，仅用于核对"
                  @click="copyCardNo(record)"
                >
                  <span aria-hidden="true">📋</span>
                </button>
              </div>

              <div v-else-if="column.key === 'action'">
                <a-button
                  v-if="record.status === 'unused'"
                  type="link"
                  size="small"
                  @click="goActivate"
                >
                  去激活
                </a-button>
                <span v-else class="empty-small">已激活</span>
              </div>
            </template>
          </a-table>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { notify } from '@/hooks/useToast/index.js'
import { useUserStore } from '@/stores/user'
import { useKamiStore } from '@/stores/kami'
import { useToolStore } from '@/stores/tool'
import api from '@/api/index'
import { useKamiActivation } from '@/hooks/useKamiActivation'
import {
  KAMI_TABLE_COLUMNS,
  STATUS_FILTER_OPTIONS,
  formatCardDate,
  getStatusColor,
  getStatusText,
  resolveToolName,
  toToolOptions,
} from '@/hooks/useKamiDisplay'
import SectionHeader from '@/components/SectionHeader.vue'

const userStore = useUserStore()
const kamiStore = useKamiStore()
const toolStore = useToolStore()

const { userKamis, pagination, loading, error } = storeToRefs(kamiStore)
const { toolData } = storeToRefs(toolStore)

const activeTab = ref('list')
const statusFilter = ref('all')

// 游客也能拿到 userInfo，但卡密是账号资产，因此以「已用账号登录」为准
const canUseKami = computed(() => userStore.isLoggedIn && Boolean(userStore.userId))

/** 工具列表（可能尚未加载，统一兜底为空数组） */
const tools = computed(() => (Array.isArray(toolData.value?.tools) ? toolData.value.tools : []))

const toolOptions = computed(() => toToolOptions(tools.value))

const tableColumns = KAMI_TABLE_COLUMNS
const statusFilterOptions = STATUS_FILTER_OPTIONS

const formatDate = formatCardDate

const getToolName = (toolId) => resolveToolName(tools.value, toolId)

/** 统一取数入口：走 store action，参数由 api 层包成 axios config */
const reload = async (page = 1) => {
  if (!canUseKami.value) return
  const ok = await kamiStore.fetchUserKamis(userStore.userId, {
    page,
    limit: pagination.value.limit || 20,
    status: statusFilter.value,
  })
  if (!ok && kamiStore.error) {
    notify.error(kamiStore.error)
  }
}

const handlePaginationChange = (page) => reload(page)

const goActivate = () => {
  activation.clearResult()
  activeTab.value = 'activate'
}

// 激活流程的状态与提交逻辑抽到 @/hooks/useKamiActivation（可单独测试）
const activation = useKamiActivation({
  activateCard: (payload) => api.activateCard(payload),
  getUserId: () => userStore.userId,
  onActivated: () => reload(1),
})

const { activateCode, selectedToolId, activationResult, activating } = activation

const handleActivate = () => activation.activate()

const copyCardNo = async (card) => {
  // 列表接口只返回**脱敏**卡号（见 server 端 kamiApi：完整 card_no 会导致掩码失效）。
  // 因此这里复制到的是 "****1234" 这类值 —— 按钮文案必须如实说明，
  // 否则用户会以为复制到了可用于激活的完整卡号。
  const text = card.card_no_display
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    notify.success('已复制脱敏卡号（含掩码，仅用于核对）')
  } catch {
    notify.error('复制失败，请手动选择复制')
  }
}

onMounted(async () => {
  // 工具列表用于「选择工具」下拉与卡密关联工具名展示
  if (!toolData.value?.tools?.length) {
    await toolStore.fetchTools()
  }
  // 身份可能仍在初始化，交给 watch 触发首次加载
  if (userStore.userId && canUseKami.value) {
    reload(1)
  }
})

// 身份就绪（游客登录完成或账号登录成功）后再拉取卡密
watch(
  () => userStore.userId,
  (id) => {
    if (id && canUseKami.value) reload(1)
  }
)
</script>

<style scoped>
/* 区块底色交给 body 的 --bg-page（页面级），组件不再自绘渐变 */
.kami-section {
  position: relative;
  width: 100%;
  /* 段落节奏从 --section-gap 派生，随主题密度（density）缩放 */
  padding: calc(var(--section-gap) * 0.5) 0 calc(var(--section-gap) * 0.6);
  background: transparent;
}

.section-container {
  max-width: var(--container-content);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

/* 区块头样式已抽到 global.css（.section-header 系列），组件内不再声明 */

/* ── 未登录提示 ─────────────────────────────────────────────── */

/* 面板档令牌：内边距 --card-padding-lg、圆角 --radius-panel、
   描边 --border、阴影 --shadow-card */
.notice-card {
  max-width: calc(var(--container-narrow) / 2);
  margin: 0 auto;
  padding: var(--card-padding-lg);
  text-align: center;
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.notice-title {
  margin: 0 0 var(--space-unit);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.notice-desc {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

/* ── 页签 ───────────────────────────────────────────────────── */

.tab-bar {
  display: flex;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
  margin-bottom: calc(var(--space-unit) * 5);
}

/* 页签外观全部来自共享类 .u-tag / .u-tag--accent
   （高度/内边距/圆角/选中态配色都由 global.css 给全），组件内不复写 */

/* ── 激活卡密 ───────────────────────────────────────────────── */

.activate-container {
  display: flex;
  justify-content: center;
  padding: calc(var(--space-unit) * 2.5);
}

.activate-card {
  width: 100%;
  max-width: calc(var(--container-narrow) / 2);
  padding: var(--card-padding-lg);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.activate-card h3 {
  margin: 0 0 calc(var(--space-unit) * 3);
  font-size: var(--fs-h3);
  color: var(--text-primary);
}

.activate-form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  margin-bottom: calc(var(--space-unit) * 2);
}

/* 表单控件复用 .u-input（高度/内边距/边框/圆角/焦点环都随主题，
   且已含移动端缩放），组件内不再复写 */

/* .activate-btn 复用 .u-btn-primary：底色、圆角、悬停位移与 disabled 样式都由共享类给全 */

/* 激活结果：成功 / 失败各带语义底，颜色不是唯一信号 */
.success-msg,
.error-msg {
  margin: 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  border-radius: var(--btn-radius);
}

.success-msg {
  color: var(--success);
  background: var(--success-bg);
}

.error-msg {
  color: var(--danger);
  background: var(--danger-bg);
}

.activate-tips {
  margin: calc(var(--space-unit) * 2) 0 0;
  font-size: var(--fs-sm);
  text-align: center;
  color: var(--text-muted);
}

/* ── 卡密列表 ───────────────────────────────────────────────── */

.list-container {
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--card-padding-lg);
  border-bottom: var(--stroke-width) solid var(--divider);
}

.toolbar-left {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.card-count {
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.toolbar-right {
  display: flex;
  gap: calc(var(--space-unit) * 1.5);
}

/* .refresh-btn 复用 .u-btn-secondary（描边/悬停/disabled 由共享类给全），
   加载中把 ⏳ 换成共享加载圈，因此组件内不再需要旋转动画 */

/* 状态筛选与 .u-input 同源，只把宽度交还给工具栏（桌面按内容宽，
   窄屏在媒体查询里撑满） */
.status-select {
  width: auto;
  cursor: pointer;
}

/* 列表错误横幅：语义底 + 语义字色，不再用固定的浅红 */
.error-banner {
  margin: 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  color: var(--danger);
  background: var(--danger-bg);
  border-bottom: var(--stroke-width) solid var(--danger);
}

/* ── 表格（ant-design-vue 覆盖：沿用 :deep() 提高特异性，不用强制优先级）── */

:deep(.kami-ant-table) {
  font-size: var(--fs-sm);
}

/* antd 自带的白底与深色文字会和主题表面冲突，交还给令牌 */
:deep(.kami-ant-table .ant-table) {
  color: var(--text-primary);
  background: transparent;
}

:deep(.kami-ant-table .ant-table-thead > tr > th) {
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  background-color: var(--bg-surface-2);
  border-bottom: var(--stroke-width) solid var(--border);
}

:deep(.kami-ant-table .ant-table-tbody > tr > td) {
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2);
  border-bottom: var(--stroke-width) solid var(--divider);
}

:deep(.kami-ant-table .ant-table-tbody > tr:hover > td) {
  background-color: var(--bg-soft);
}

:deep(.kami-ant-table .ant-pagination) {
  margin-top: calc(var(--space-unit) * 2);
  padding: 0 calc(var(--space-unit) * 2) calc(var(--space-unit) * 2);
  color: var(--text-secondary);
}

/* 分页：尺寸 / 圆角 / 间距 / 字号四项全部来自 --pager-* 令牌 */
:deep(.kami-ant-table .ant-pagination-item),
:deep(.kami-ant-table .ant-pagination-prev),
:deep(.kami-ant-table .ant-pagination-next),
:deep(.kami-ant-table .ant-pagination-jump-prev),
:deep(.kami-ant-table .ant-pagination-jump-next) {
  min-width: var(--pager-size);
  height: var(--pager-size);
  margin-inline-end: var(--pager-gap);
  font-size: var(--pager-font-size);
  line-height: var(--pager-size);
  border-radius: var(--pager-radius);
}

/* 页码与「•••」跳页块：与卡片同一套表面 + 描边 */
:deep(.kami-ant-table .ant-pagination-item),
:deep(.kami-ant-table .ant-pagination-jump-prev),
:deep(.kami-ant-table .ant-pagination-jump-next) {
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--stroke-color);
}

/* 上一页 / 下一页的边框长在内部按钮上，必须一并覆盖 */
:deep(.kami-ant-table .ant-pagination-prev .ant-pagination-item-link),
:deep(.kami-ant-table .ant-pagination-next .ant-pagination-item-link) {
  color: var(--text-secondary);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--stroke-color);
  border-radius: var(--pager-radius);
}

:deep(.kami-ant-table .ant-pagination-item a),
:deep(.kami-ant-table .ant-pagination-jump-prev .ant-pagination-item-ellipsis),
:deep(.kami-ant-table .ant-pagination-jump-next .ant-pagination-item-ellipsis) {
  color: var(--text-secondary);
}

/* 跳页提示图标（››）原本是 antd 的主题蓝，改用强调色 */
:deep(.kami-ant-table .ant-pagination-item-link-icon) {
  color: var(--accent);
}

/* 悬停：描边与文字一起切到强调色 */
:deep(.kami-ant-table .ant-pagination-item:hover),
:deep(.kami-ant-table .ant-pagination-jump-prev:hover),
:deep(.kami-ant-table .ant-pagination-jump-next:hover) {
  border-color: var(--accent);
}

:deep(.kami-ant-table .ant-pagination-item:hover a),
:deep(.kami-ant-table .ant-pagination-prev:hover .ant-pagination-item-link),
:deep(.kami-ant-table .ant-pagination-next:hover .ant-pagination-item-link) {
  color: var(--accent);
}

:deep(.kami-ant-table .ant-pagination-prev:hover .ant-pagination-item-link),
:deep(.kami-ant-table .ant-pagination-next:hover .ant-pagination-item-link) {
  border-color: var(--accent);
}

/* 当前页：一组 --pager-active-* 令牌（neo 是黑底硬阴影、mono 是描边绿字） */
:deep(.kami-ant-table .ant-pagination-item-active) {
  background: var(--pager-active-bg);
  border-color: var(--pager-active-border);
  box-shadow: var(--pager-active-shadow);
}

:deep(.kami-ant-table .ant-pagination-item-active a) {
  color: var(--pager-active-color);
}

/* 到头时的上一页 / 下一页退到禁用色，而不是 antd 的浅灰 */
:deep(.kami-ant-table .ant-pagination-disabled),
:deep(.kami-ant-table .ant-pagination-disabled:hover) {
  background: var(--disabled-bg);
  border-color: var(--stroke-color);
}

:deep(.kami-ant-table .ant-pagination-disabled .ant-pagination-item-link),
:deep(.kami-ant-table .ant-pagination-disabled:hover .ant-pagination-item-link) {
  color: var(--disabled-text);
  background: var(--disabled-bg);
  border-color: var(--stroke-color);
}

/* 快速跳页输入框：与表内控件同源，高度收到分页档 */
:deep(.kami-ant-table .ant-pagination-options-quick-jumper input) {
  height: var(--pager-size);
  padding: 0 calc(var(--space-unit) * 0.75);
  font-size: var(--pager-font-size);
  color: var(--text-primary);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--stroke-color);
  border-radius: var(--pager-radius);
}

/* ── 单元格内容 ─────────────────────────────────────────────── */

.card-name {
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

/* 卡密数值是纯数字串：等宽字体便于逐位核对 */
.card-value {
  font-family: var(--font-mono);
  font-weight: var(--fw-heading);
  color: var(--accent);
}

.muted {
  color: var(--text-secondary);
}

.permanent {
  color: var(--success);
  font-weight: var(--fw-label);
}

.empty {
  color: var(--text-muted);
}

.empty-small {
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.card-no-cell {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
}

/* 脱敏卡号按「代码片段」处理：等宽 + 次级表面 + 微型徽标圆角 */
.card-no-display {
  padding: var(--micro-badge-padding);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--text-primary);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--micro-badge-radius);
}

.copy-icon-btn {
  padding: calc(var(--space-unit) * 0.25) calc(var(--space-unit) * 0.5);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  border-radius: var(--btn-radius);
  transition: color var(--transition-interactive);
}

.copy-icon-btn:hover {
  color: var(--accent);
}

/* ── 响应式（统一断点 767）────────────────────────────────────
   移动端缩放按规范：内边距 ×0.8、区块间距 ×0.6、标题字号 ×0.7、正文字号 ×0.95
   （.u-input / .u-btn-* / .u-tag 等共享类的高度与内边距缩放已在 global.css 内处理） */

@media (max-width: 767px) {
  .kami-section {
    padding: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale)) 0
      calc(var(--section-gap) * 0.6 * var(--mobile-section-scale));
  }

  .tab-bar {
    gap: var(--space-unit);
    margin-bottom: calc(var(--space-unit) * 5 * var(--mobile-section-scale));
  }

  .notice-card,
  .activate-card {
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .notice-title,
  .activate-card h3 {
    font-size: calc(var(--fs-h3) * var(--mobile-title-scale));
  }

  .notice-desc,
  .activate-tips,
  .success-msg,
  .error-msg,
  .error-banner,
  .empty-small {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .activate-container {
    padding: calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
  }

  .list-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .toolbar-right {
    width: 100%;
  }

  .status-select {
    width: 100%;
  }

  .activate-btn {
    width: 100%;
  }

  :deep(.kami-ant-table) {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }
}
</style>
