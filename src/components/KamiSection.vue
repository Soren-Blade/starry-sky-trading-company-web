<template>
  <section class="kami-section">
    <div class="section-container">
      <!-- 未登录提示：卡密属于账号资产，游客态不给操作入口。
           新版式没有页签，这块居中的提示卡就是整个区块的全部内容。 -->
      <div v-if="!canUseKami" class="notice-card">
        <p class="notice-title">请先登录账号</p>
        <p class="notice-desc">卡密与账号绑定，游客身份无法激活或查看卡密。</p>
      </div>

      <!--
        控制台版式：左栏「激活新卡密」= 操作面板（桌面端 sticky 跟随滚动），
        右栏「我的卡密」= 数据面板（工具条 + 表格 + 分页）。
        两件事同时可见，因此不再需要「我的卡密 / 激活卡密」页签。
      -->
      <div v-else class="console-grid">
        <!-- ── 左栏：激活 ─────────────────────────────────── -->
        <div class="console-side">
          <div class="panel activate-panel">
            <div class="panel-head">
              <h3 class="panel-title"><AppIcon name="sparkles" /> 激活新卡密</h3>
              <p class="panel-sub">选择工具后粘贴卡密号</p>
            </div>

            <div class="activate-form">
              <!-- 工具列表来自后端且可能很长（一屏放不下几十项），因此开启搜索 -->
              <SelectField
                v-model="selectedToolId"
                :options="toolOptions"
                placeholder="请选择工具"
                searchable
                aria-label="选择工具"
              />
              <input
                ref="activateInput"
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
              <AppIcon name="zap" /> 激活后可在"我的卡密"中查看详情
            </p>
          </div>
        </div>

        <!-- ── 右栏：列表 ─────────────────────────────────── -->
        <div class="panel list-panel">
          <div class="list-toolbar">
            <div class="toolbar-left">
              <span class="card-count">共 {{ pagination.total }} 张卡密</span>
            </div>
            <div class="toolbar-right">
              <button
                type="button"
                class="refresh-btn u-btn-secondary"
                :disabled="loading"
                :aria-label="loading ? '正在刷新卡密列表' : '刷新卡密列表'"
                @click="reload(1)"
              >
                <span
                  v-if="loading"
                  class="u-spinner u-spinner--sm"
                  role="status"
                  aria-label="加载中"
                ></span>
                <AppIcon v-else name="refresh-cw" />
                {{ loading ? '刷新中...' : '刷新' }}
              </button>
              <!--
                v-model 与 @update:model-value 的**书写顺序有意义**：编译器把两者合并成
                同一个属性上的处理函数数组，按书写顺序执行。v-model 先赋值，reload(1)
                读到的才是刚选中的状态 —— 反过来会拿着上一个状态去请求。
                改状态即刷新（等价于原来的 @change），数据来源与请求参数都没动。

                选项仍来自 useKamiDisplay 的 STATUS_FILTER_OPTIONS，与状态文案/配色同源，
                避免两处各写一份。
              -->
              <SelectField
                v-model="statusFilter"
                class="status-select"
                :options="statusFilterOptions"
                aria-label="按状态筛选"
                @update:model-value="reload(1)"
              />
            </div>
          </div>

          <p v-if="error" class="error-banner" role="alert">{{ error }}</p>

          <!--
            原生表格（`table.u-table`）：列定义、表头文案与单元格内容仍由
            `useKamiDisplay` 的 KAMI_TABLE_COLUMNS + 下面的分支决定，
            只是渲染从 ant-design-vue 的 <a-table> 换成了项目自有的 .u-table 规范。
            好处：列宽/内边距/字体/描边/悬停全部走 --table-* 令牌，
            不再需要上百行 :deep() 去压掉库自带的白底与主题蓝。
          -->
          <div class="u-table-wrap">
            <table class="u-table kami-table">
              <thead>
                <tr>
                  <th
                    v-for="column in tableColumns"
                    :key="column.key"
                    :class="{ 'u-table-col-action': column.key === 'action' }"
                    :style="{ minWidth: `${column.width}px` }"
                    scope="col"
                  >
                    {{ column.title }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in userKamis" :key="record.id">
                  <!--
                    逐列显式分支（而不是按 dataIndex 动态取名）：
                    列名与取值一一对应，未来加列时缺分支会在页面上直接体现出来，
                    不会像占位插槽那样静默留空。
                  -->
                  <td v-for="column in tableColumns" :key="column.key" :class="{ 'u-table-col-action': column.key === 'action' }">
                    <template v-if="column.key === 'card_name'">
                      <span class="card-name">{{ record.card_name || '—' }}</span>
                    </template>

                    <template v-else-if="column.key === 'card_value'">
                      <span class="card-value">{{ record.card_value }}</span>
                    </template>

                    <template v-else-if="column.key === 'status'">
                      <span class="u-tag" :class="getStatusVariantClass(record.status)">
                        {{ record.status_text || getStatusText(record.status) }}
                      </span>
                    </template>

                    <template v-else-if="column.key === 'valid_until'">
                      <span v-if="record.valid_until" class="muted">{{ formatDate(record.valid_until) }}</span>
                      <span v-else class="permanent">永久有效</span>
                    </template>

                    <template v-else-if="column.key === 'used_at'">
                      <span v-if="record.used_at" class="muted">{{ formatDate(record.used_at) }}</span>
                      <span v-else class="empty">—</span>
                    </template>

                    <template v-else-if="column.key === 'tool_id'">
                      <span v-if="getToolName(record.tool_id)" class="u-tag">
                        <AppIcon name="wrench" /> {{ getToolName(record.tool_id) }}
                      </span>
                      <span v-else class="empty-small">未绑定工具</span>
                    </template>

                    <template v-else-if="column.key === 'card_no_display'">
                      <div class="card-no-cell">
                        <span class="card-no-display">{{ record.card_no_display }}</span>
                        <button
                          type="button"
                          class="copy-icon-btn"
                          title="复制脱敏卡号（含掩码，仅用于核对）"
                          aria-label="复制脱敏卡号，仅用于核对"
                          @click="copyCardNo(record)"
                        >
                          <AppIcon name="clipboard" />
                        </button>
                      </div>
                    </template>

                    <template v-else-if="column.key === 'action'">
                      <div class="card-no-cell">
                        <button
                          v-if="record.status === 'unused'"
                          type="button"
                          class="link-btn kami-action-link"
                          @click="focusActivate"
                        >
                          去激活
                        </button>
                        <span v-else class="empty-small">已激活</span>
                      </div>
                    </template>
                  </td>
                </tr>

                <!-- 空态：整表只有一行提示，避免出现一条悬挂在表头下方的空线 -->
                <tr v-if="!loading && !userKamis.length" class="kami-empty-row">
                  <td :colspan="tableColumns.length">暂无卡密</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 加载态：盖在表格上方（表格本身保留表头，视觉上不跳） -->
          <div v-if="loading" class="u-loading-block" role="status" aria-live="polite">
            <span class="u-spinner" aria-hidden="true"></span>
          </div>

          <!--
            分页：与 tableColumns 的页长契约一致（pagination.limit）。
            前端分页不可靠 —— 数据是后端按页给的，因此这里只发请求，不做本地切片。
            只有一页时不渲染，避免出现一个孤零零的「1」。
            与 antd 版本的差异：不再提供 showQuickJumper（输入页码跳转），只能逐页点击。
          -->
          <nav v-if="pagination.total_pages > 1" class="kami-pager" aria-label="卡密分页">
            <button
              type="button"
              class="u-icon-btn"
              :disabled="!pagination.has_prev || loading"
              aria-label="上一页"
              @click="handlePaginationChange(pagination.page - 1)"
            >
              <AppIcon name="chevron-left" />
            </button>

            <button
              v-for="pageNo in pagerItems"
              :key="pageNo"
              type="button"
              class="u-icon-btn kami-pager-item"
              :class="{ 'kami-pager-item--active': pageNo === pagination.page }"
              :aria-current="pageNo === pagination.page ? 'page' : undefined"
              :aria-label="`第 ${pageNo} 页`"
              @click="handlePaginationChange(pageNo)"
            >
              {{ pageNo }}
            </button>

            <button
              type="button"
              class="u-icon-btn"
              :disabled="!pagination.has_next || loading"
              aria-label="下一页"
              @click="handlePaginationChange(pagination.page + 1)"
            >
              <AppIcon name="chevron-right" />
            </button>

            <span class="kami-pager-total">共 {{ pagination.total }} 条</span>
          </nav>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { notify } from '@/hooks/useToast/index.js'
import { useUserStore } from '@/stores/user'
import { useKamiStore } from '@/stores/kami'
import { useToolStore } from '@/stores/tool'
import api from '@/api/index'
import { useKamiActivation } from '@/hooks/useKamiActivation'
import SelectField from '@/components/SelectField.vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  KAMI_TABLE_COLUMNS,
  STATUS_FILTER_OPTIONS,
  formatCardDate,
  getStatusVariantClass,
  getStatusText,
  resolveToolName,
  toToolOptions,
} from '@/hooks/useKamiDisplay'

const userStore = useUserStore()
const kamiStore = useKamiStore()
const toolStore = useToolStore()
const route = useRoute()

const { userKamis, pagination, loading, error } = storeToRefs(kamiStore)
const { toolData } = storeToRefs(toolStore)

const statusFilter = ref('all')

// 游客也能拿到 userInfo，但卡密是账号资产，因此以「已用账号登录」为准
const canUseKami = computed(() => userStore.isLoggedIn && Boolean(userStore.userId))

/** 工具列表（可能尚未加载，统一兜底为空数组） */
const tools = computed(() => (Array.isArray(toolData.value?.tools) ? toolData.value.tools : []))

const toolOptions = computed(() => toToolOptions(tools.value))

/**
 * 深链预选：工具页的「立即激活」跳过来时带 `?tool_id=<id>`，
 * 这里把它填进「选择工具」下拉，用户就不必再选一次。
 *
 * 两道关卡，缺一不可：
 *   1. 工具列表必须已加载 —— 下拉选项不存在时赋值不会生效
 *   2. id 必须真实存在于选项里 —— 手改 URL 传 `tool_id=999` 时**忽略**，
 *      既不预选也不报错，页面其余部分照常可用
 *
 * @returns {boolean} 是否成功预选
 */
function applyToolFromQuery() {
  const raw = route.query.tool_id
  const wanted = Array.isArray(raw) ? raw[0] : raw
  if (wanted == null || String(wanted).trim() === '') return false

  const id = String(wanted).trim()
  if (!toolOptions.value.some((option) => option.value === id)) return false

  selectedToolId.value = id
  return true
}

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

/**
 * 页码窗口：最多显示 7 个页码，当前页居中。
 *
 * 只做**展示用的窗口裁剪**，不改数据、不改请求 —— 页长与总数仍以后端
 * 返回的 `pagination` 为准（它是唯一事实来源）。窗口在页数 ≤7 时直接就
 * 返回全部页码，等于不做任何处理。
 */
const pagerItems = computed(() => {
  const totalPages = pagination.value.total_pages || 0
  const current = pagination.value.page || 1
  const WINDOW = 7
  if (totalPages <= WINDOW) return Array.from({ length: totalPages }, (_, i) => i + 1)

  let start = Math.max(1, current - Math.floor(WINDOW / 2))
  const end = Math.min(totalPages, start + WINDOW - 1)
  // 贴近末页时整体前移，保证窗口始终是满的（否则尾部会只剩两三个）
  start = Math.max(1, end - WINDOW + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

/** 激活输入框：表格「去激活」把光标送到左栏，而不是跳转/切页签 */
const activateInput = ref(null)

const focusActivate = () => {
  activateInput.value?.focus()
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
  // 必须等工具列表到位，选项存在了才谈得上预选
  applyToolFromQuery()
  // 身份可能仍在初始化，交给 watch 触发首次加载
  if (userStore.userId && canUseKami.value) {
    reload(1)
  }
})

/**
 * 已在激活页时，从工具页点另一个工具的「立即激活」不会重新挂载组件，
 * 只会改 query —— 因此还要监听 query 本身。
 */
watch(
  () => route.query.tool_id,
  () => {
    applyToolFromQuery()
  }
)

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
  /* 开场留白由 Kami.vue 承担，这里只留与页脚之间的收尾 */
  padding: 0 0 calc(var(--section-gap) * 0.4);
  background: transparent;
}

.section-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

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

/* ── 控制台栅格：左操作 / 右数据 ─────────────────────────────── */

.console-grid {
  display: grid;
  align-items: start;
  /* 操作面板窄、数据面板宽：表格要放得下 8 列 */
  grid-template-columns: minmax(0, calc(var(--container-narrow) * 0.34)) minmax(0, 1fr);
  gap: calc(var(--space-unit) * 3);
}

/* 桌面端左栏跟随滚动。顶栏是 position: sticky（参与文档流、高度 --navbar-height），
   因此粘住位置必须让出它的高度，否则面板顶部会滑到顶栏底下 */
.console-side {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-unit) * 2);
}

/* 两块面板共用同一套外壳（只有圆角/描边/阴影走令牌，内边距各自声明） */
.panel {
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* 左栏面板是表单容器，用面板档内边距 */
.activate-panel {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  padding: var(--card-padding-lg);
}

.panel-head {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  font-size: var(--fs-h3);
  color: var(--text-primary);
}

/* 面板副标题：标签档字号，压住标题的视觉重量 */
.panel-sub {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* ── 激活表单 ───────────────────────────────────────────────── */

.activate-form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
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
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* ── 卡密列表 ───────────────────────────────────────────────── */

/* 数据面板：工具条与表格自己带内边距，外壳不再叠加 */
.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
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
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

/* .refresh-btn 复用 .u-btn-secondary（描边/悬停/disabled 由共享类给全），
   加载中把 🔄 换成共享加载圈，因此组件内不再需要旋转动画 */

/* 状态筛选：类名落在 SelectField 的**根容器**上（父组件的 scoped 样式会一并作用于
   子组件根节点），只把宽度交还给工具栏（桌面按内容宽，窄屏在媒体查询里撑满）。
   控件本身的描边/圆角/高度由 .u-select-trigger 复用输入框令牌，不在这里复写 */
.status-select {
  width: auto;
}

/* 错误横幅夹在工具条与表格之间：横向贴满，只在上下留出与表格的间距 */
.error-banner {
  margin: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2) 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  color: var(--danger);
  background: var(--danger-bg);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--btn-radius);
}

/* ── 表格 ─────────────────────────────────────────────────────
 *
 * 结构、内边距、字号、描边、悬停全部来自 ui-kit-data.css 的 `.u-table` 规范
 * 与 `--table-*` 令牌 —— 这里只补三处这个页面**特有**的排版：
 *   1. 表格外框与工具条的左右内边距对齐，避免表格紧贴面板边缘；
 *   2. 空态整行居中；
 *   3. 操作列里的链接按钮与单元格左对齐（.u-table-col-action 默认右对齐，
 *      但「已激活」是个文字标记，靠左才能与「去激活」在同一列对齐）。
 *
 * 此前这里有一百多行 `:deep(.ant-*)` 覆盖，用来压掉组件库自带的白底、
 * 深色文字与主题蓝分页。换成原生表格后，这些对抗性样式**全部不再需要** ——
 * 它们存在的唯一原因就是「库的风格不是本站的风格」。
 */
.list-panel .u-table-wrap {
  padding: calc(var(--space-unit) * 2);
}

/* 列宽由 KAMI_TABLE_COLUMNS 的 width 通过行内 min-width 给出；
   表格整体允许横向滚动（窄屏列不会被压扁） */
.kami-table {
  min-width: calc(var(--table-action-col-width) + 940px);
}

.kami-table .u-table-col-action,
.kami-table td.u-table-col-action {
  /* 操作列改左对齐：列内是「去激活」链接或「已激活」文字，都在同一左边界上 */
  text-align: left;
}

.kami-empty-row td {
  padding: calc(var(--space-unit) * 4) var(--table-cell-padding-x);
  color: var(--text-muted);
  text-align: center;
}

/* 加载块叠在表格上方：高度不占位，只在没数据时给一块至少两行高的浅底 */
.u-loading-block {
  padding: calc(var(--space-unit) * 2) 0;
}

/* ── 分页 ─────────────────────────────────────────────────────
 * 尺寸 / 圆角 / 间距 / 字号四项全部来自 `--pager-*` 令牌，
 * 与项目里其它分页（如订单页）同源，因此五套主题下自动成立。
 * 页码按钮复用 `.u-icon-btn` 的盒子（正方形、居中），
 * 当前页用一组 `--pager-active-*` 令牌（neo 是黑底硬阴影、mono 是描边绿字）。
 */
.kami-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--pager-gap);
  margin-top: calc(var(--space-unit) * 2);
  padding: 0 calc(var(--space-unit) * 2) calc(var(--space-unit) * 2);
  color: var(--text-secondary);
}

.kami-pager .u-icon-btn {
  width: var(--pager-size);
  height: var(--pager-size);
  font-size: var(--pager-font-size);
  color: var(--text-secondary);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--stroke-color);
  border-radius: var(--pager-radius);
}

.kami-pager .u-icon-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.kami-pager-item--active {
  background: var(--pager-active-bg);
  border-color: var(--pager-active-border);
  box-shadow: var(--pager-active-shadow);
  color: var(--pager-active-color);
}

/* 当前页的配色压过 .u-icon-btn 的悬停反馈：它已经是「你在这里」的标记，
   再随鼠标变色会让人以为又点了一次 */
.kami-pager .u-icon-btn.kami-pager-item--active,
.kami-pager .u-icon-btn.kami-pager-item--active:hover:not(:disabled) {
  color: var(--pager-active-color);
  border-color: var(--pager-active-border);
}

.kami-pager .u-icon-btn:disabled {
  color: var(--disabled-text);
  background: var(--disabled-bg);
  border-color: var(--stroke-color);
}

.kami-pager-total {
  margin-left: calc(var(--space-unit) * 1.5);
  font-size: var(--fs-label);
  color: var(--text-muted);
}

/* 操作列里的「去激活」：链接式按钮，配色走强调色（与 .link-btn 同规范） */
.kami-action-link {
  padding: 0;
  font-family: inherit;
  font-size: var(--fs-sm);
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-interactive);
}

.kami-action-link:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

.kami-action-link:focus-visible {
  box-shadow: var(--focus-ring);
  border-radius: var(--btn-radius);
  outline: none;
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

/* ── 响应式 ─────────────────────────────────────────────────── */

/* ≤991：两栏变单栏，激活面板挪到列表**上方**（先操作、后查看），
   同时解除 sticky —— 单栏里粘住会把下方的列表顶出视口 */
@media (max-width: 991px) {
  .console-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--space-unit) * 2.5);
  }

  .console-side {
    position: static;
    top: auto;
  }
}

/* ≤767：移动端缩放按规范 —— 内边距 ×0.8、区块间距 ×0.6、标题字号 ×0.7、
   正文字号 ×0.95（.u-input / .u-btn-* / .u-tag / .u-spinner 等共享类
   的高度与内边距缩放已在 global.css 内处理）。
   sticky 的让位高度也要跟着顶栏一起按 --mobile-nav-scale 收。 */
@media (max-width: 767px) {
  .kami-section {
    padding: 0 0 calc(var(--section-gap) * 0.4 * var(--mobile-section-scale));
  }

  .console-grid {
    gap: calc(var(--space-unit) * 2.5 * var(--mobile-section-scale));
  }

  .console-side {
    top: calc(var(--navbar-height) * var(--mobile-nav-scale) + var(--space-unit) * 2);
  }

  .notice-card,
  .activate-panel {
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .panel-title,
  .notice-title {
    font-size: calc(var(--fs-h3) * var(--mobile-title-scale));
  }

  .notice-desc,
  .panel-sub,
  .activate-tips,
  .success-msg,
  .error-msg,
  .error-banner,
  .empty-small {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .list-toolbar {
    flex-direction: column;
    align-items: flex-start;
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

  .list-panel .u-table-wrap {
    padding: calc(var(--space-unit) * 2 * var(--mobile-padding-scale));
  }

  .kami-table {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .kami-pager {
    padding: 0 calc(var(--space-unit) * 2 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2 * var(--mobile-padding-scale));
  }
}

/* ≤575：工具条的两个控件各占一行，避免窄屏被挤成半宽 */
@media (max-width: 575px) {
  .toolbar-right {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
