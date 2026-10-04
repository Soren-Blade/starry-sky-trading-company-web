<template>
  <section class="kami-section">
    <div class="section-container">
      <!-- header（共享组件，样式在 global.css） -->
      <SectionHeader icon="🎴" title="卡密管理" description="查看并激活你的卡密" />

      <!-- tabs -->
      <div class="tab-bar">
        <button
          type="button"
          :class="{ active: activeTab === 'list' }"
          @click="activeTab = 'list'"
        >
          📋 我的卡密
        </button>
        <button
          type="button"
          :class="{ active: activeTab === 'activate' }"
          @click="activeTab = 'activate'"
        >
          ✨ 激活卡密
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
              <select v-model="selectedToolId" class="tool-select" aria-label="选择工具">
                <option value="">请选择工具</option>
                <option v-for="tool in toolOptions" :key="tool.value" :value="tool.value">
                  {{ tool.label }}
                </option>
              </select>
              <input
                v-model="activateCode"
                type="text"
                class="activate-input"
                placeholder="请粘贴卡密号..."
                aria-label="卡密号"
                @keyup.enter="handleActivate"
              />
              <button
                type="button"
                class="activate-btn"
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
            <p class="activate-tips">⚡ 激活后可在"我的卡密"中查看详情</p>
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
                class="refresh-btn"
                :disabled="loading"
                title="刷新卡密列表"
                @click="reload(1)"
              >
                <span v-if="loading" class="loading-icon" aria-hidden="true">⏳</span>
                <span v-else aria-hidden="true">🔄</span>
                {{ loading ? '刷新中...' : '刷新' }}
              </button>
              <select
                v-model="statusFilter"
                class="status-select"
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
              <span v-if="column.key === 'card_value'" class="card-value">
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
                <span v-if="getToolName(record.tool_id)" class="tool-badge">
                  🔧 {{ getToolName(record.tool_id) }}
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
                  📋
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
import { message } from 'ant-design-vue'
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
    message.error(kamiStore.error)
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
    message.success('已复制脱敏卡号（含掩码，仅用于核对）')
  } catch {
    message.error('复制失败，请手动选择复制')
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
.kami-section {
  position: relative;
  width: 100%;
  padding: 48px 0 60px;
  background: linear-gradient(180deg, var(--color-light) 0%, #f1f2f4 100%);
}

.section-container {
  max-width: var(--container-content);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

/* 区块头样式已抽到 global.css（.section-header 系列） */

/* Notice */
.notice-card {
  max-width: 520px;
  margin: 0 auto;
  padding: 32px;
  text-align: center;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.notice-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-dark);
  margin: 0 0 8px;
}

.notice-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Tabs */
.tab-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.tab-bar button {
  padding: 10px 24px;
  border: 2px solid transparent;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition-base);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tab-bar button:hover {
  background: var(--color-divider);
}

.tab-bar button.active {
  background: var(--gradient-primary);
  color: var(--color-on-primary);
  box-shadow: 0 4px 12px rgba(138, 109, 255, 0.3);
}

/* Activate */
.activate-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.activate-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 100%;
}

.activate-card h3 {
  font-size: 20px;
  color: var(--color-dark);
  margin: 0 0 24px 0;
}

.activate-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.tool-select,
.activate-input {
  padding: 10px 14px;
  border: 1px solid var(--color-border, var(--color-border));
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: var(--transition-fast);
  background: var(--color-surface);
  color: var(--color-dark);
}

.tool-select:focus,
.activate-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(138, 109, 255, 0.1);
}

.activate-btn {
  padding: 10px 28px;
  background: var(--gradient-primary);
  color: var(--color-on-primary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: var(--transition-fast);
}

.activate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
}

.activate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-msg {
  color: var(--color-success);
  margin: 0;
  font-size: 14px;
}

.error-msg,
.error-banner {
  color: var(--color-danger);
  margin: 0;
  font-size: 14px;
}

.error-banner {
  padding: 10px 16px;
  background: #fee;
  border-bottom: 1px solid var(--color-error-border);
}

.activate-tips {
  color: var(--color-muted, var(--color-muted));
  font-size: 13px;
  margin: 16px 0 0 0;
  text-align: center;
}

/* List */
.list-container {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-divider);
}

.toolbar-left {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.card-count {
  font-weight: 600;
  color: var(--color-dark);
}

.toolbar-right {
  display: flex;
  gap: 12px;
}

.refresh-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 4px;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: #f0f5ff;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-icon {
  animation: kami-spin 1s linear infinite;
}

@keyframes kami-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-select {
  padding: 6px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
  font-size: 14px;
  color: var(--color-dark);
}

:deep(.kami-ant-table) {
  font-size: 14px;
}

:deep(.kami-ant-table .ant-table-thead > tr > th) {
  background-color: var(--color-light);
  font-weight: 600;
  color: var(--color-dark);
  border-bottom: 2px solid #e0e0e0;
}

:deep(.kami-ant-table .ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--color-divider);
  padding: 12px 16px;
}

:deep(.kami-ant-table .ant-table-tbody > tr:hover > td) {
  background-color: #fafafa;
}

:deep(.kami-ant-table .ant-pagination) {
  margin-top: 16px;
  padding: 0 16px 16px;
}

.card-value {
  color: var(--color-primary-dark);
  font-weight: 600;
}

.muted {
  color: var(--color-text-secondary);
}

.permanent {
  color: var(--color-success);
  font-weight: 500;
}

.empty {
  color: #bbb;
}

.empty-small {
  color: #bbb;
  font-size: 12px;
}

.card-no-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-no-display {
  font-family: Monaco, 'Courier New', monospace;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.copy-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.copy-icon-btn:hover {
  opacity: 1;
}

.tool-badge {
  display: inline-block;
  background: linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%);
  color: #0050b3;
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #b5d8ff;
}

/* Responsive */
@media (max-width: 767px) {
  .section-title {
    font-size: 28px;
  }

  .title-icon {
    font-size: 28px;
  }

  .list-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toolbar-right {
    width: 100%;
  }

  .status-select {
    width: 100%;
  }

  .activate-card {
    padding: 24px;
  }

  .activate-btn {
    width: 100%;
  }
}
</style>
