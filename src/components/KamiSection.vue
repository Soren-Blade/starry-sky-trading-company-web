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
              <p class="panel-sub">粘贴卡密号激活；工具卡请先选工具，积分卡无需选择</p>
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
                @paste="queueToolLookup"
                @blur="queueToolLookup"
                @keyup.enter="handleActivate"
              />
              <button
                type="button"
                class="activate-btn u-btn-primary"
                :disabled="!activateCode.trim() || activating"
                :aria-busy="activating"
                @click="handleActivate"
              >
                {{ activating ? '激活中...' : '激活' }}
              </button>
            </div>

            <!--
              兑换结果按语义套用设计系统 .ec-redeem-result 的四模板：
              成功 / 已使用 / 已过期 / 未找到。四者标题、描述与下一步操作都不同；
              「请选择要激活的工具」「网络异常」这类**流程性错误**不是兑换结果，
              不硬套模板，仍用原来的内联提示。
            -->
            <div v-if="activationView" class="activation-result" role="status">
              <div
                class="ec-redeem-result"
                :class="`ec-redeem-result--${activationView.variant}`"
              >
                <div class="ec-redeem-result__icon">
                  <AppIcon :name="activationView.icon" />
                </div>
                <div class="ec-redeem-result__title">{{ activationView.title }}</div>
                <p class="ec-redeem-result__desc">{{ activationView.desc }}</p>
                <div class="ec-redeem-result__actions">
                  <template v-for="action in activationView.actions" :key="action.label">
                    <router-link
                      v-if="action.href"
                      :to="action.href"
                      class="ec-btn ec-btn--sm"
                      :class="`ec-btn--${action.kind}`"
                    >
                      {{ action.label }}
                    </router-link>
                    <button
                      v-else
                      type="button"
                      class="ec-btn ec-btn--sm"
                      :class="`ec-btn--${action.kind}`"
                      @click="handleActivationAction(action.action)"
                    >
                      {{ action.label }}
                    </button>
                  </template>
                </div>
              </div>
            </div>

            <p
              v-else-if="activationResult"
              :class="activationResult.success ? 'success-msg' : 'error-msg'"
              role="status"
            >
              {{ activationResult.message }}<span v-if="activationRewards">，已发放 {{ activationRewards }}</span>
            </p>

            <p class="activate-tips">
              <AppIcon name="zap" /> 激活后可在"我的卡密"中查看详情
            </p>

            <!--
              会员免卡密激活（需求 8）。
              额度、身份全部来自 /kamiApi/memberQuota；非会员也保留这张卡 ——
              它回答的是「除了买卡密，还有一条会员通道」，隐藏起来用户就永远
              不知道有这条路，只是提交按钮禁用。
            -->
            <section class="member-card" aria-labelledby="member-activate-title">
              <div class="member-head">
                <h4 id="member-activate-title" class="member-title">
                  <AppIcon name="crown" /> 会员免卡密激活
                </h4>
                <p v-if="memberQuotaLoading && !memberQuota" class="member-identity">
                  正在读取会员权益…
                </p>
                <p
                  v-else-if="memberQuota && !memberQuota.is_member"
                  class="member-identity member-identity--guest"
                >
                  还不是会员 · 开通会员可免卡密使用工具
                </p>
                <p v-else-if="memberQuota" class="member-identity">{{ memberQuotaText }}</p>
                <p
                  v-else-if="memberQuotaError"
                  class="member-identity"
                  :class="{ 'member-identity--error': !memberQuotaUnavailable }"
                >
                  {{ memberQuotaError }}
                </p>
                <p v-if="memberQuota?.is_member && memberQuota.expires_at" class="member-expire">
                  权益有效期至 {{ formatDate(memberQuota.expires_at) }}
                </p>
              </div>

              <form class="member-form" @submit.prevent="handleMemberActivate">
                <SelectField
                  v-model="memberToolId"
                  :options="toolOptions"
                  placeholder="选择要激活的工具"
                  searchable
                  aria-label="选择免卡密激活的工具"
                  :disabled="memberFormDisabled"
                />
                <input
                  v-model="memberUuid"
                  type="text"
                  class="u-input"
                  placeholder="粘贴你的用户标识以确认身份"
                  aria-label="用户标识（选填）"
                  autocomplete="off"
                  spellcheck="false"
                  :disabled="memberFormDisabled"
                />
                <button
                  type="submit"
                  class="member-submit u-btn-primary"
                  :disabled="memberSubmitDisabled"
                  :aria-busy="memberActivating"
                >
                  {{ memberActivating ? '激活中...' : '免卡密激活' }}
                </button>
                <p v-if="!memberUuid.trim()" class="member-hint">
                  用户标识可留空，留空时按当前登录账号校验身份
                </p>
              </form>

              <div v-if="memberQuota && !memberQuota.is_member" class="member-cta">
                <router-link to="/member/plans" class="ec-btn ec-btn--sm ec-btn--primary">
                  开通会员
                </router-link>
              </div>

              <div v-if="memberQuotaError && !memberQuota" class="member-cta">
                <button
                  type="button"
                  class="ec-btn ec-btn--sm ec-btn--secondary"
                  @click="loadMemberQuota"
                >
                  重试
                </button>
              </div>

              <div v-if="memberError" class="member-error" role="alert">
                <p class="member-error-text">{{ memberError.message }}</p>
                <div v-if="memberErrorLinks.length" class="member-error-actions">
                  <router-link
                    v-for="link in memberErrorLinks"
                    :key="link.to"
                    :to="link.to"
                    class="ec-btn ec-btn--sm ec-btn--secondary"
                  >
                    {{ link.label }}
                  </router-link>
                </div>
              </div>
            </section>
          </div>
        </div>

        <!-- ── 右栏：列表 ─────────────────────────────────── -->
        <div ref="listPanel" class="panel list-panel">
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

<script>
/**
 * 兑换结果 → 设计系统 RedeemResult 四模板。
 *
 * 为什么不放在 `<script setup>` 里：这段映射是纯函数，测试可以直接 import
 * 断言「四个语义各自得到不同的标题/描述/操作」，不需要挂载组件或触发请求。
 *
 * 判定依据只用**现有接口已经给出的字段**，不新增后端契约：
 *   - success === true                → success
 *   - code 为 CARD_NOT_FOUND / CARD_EXPIRED / CARD_USED（测试桩与部分接口会带）
 *   - 否则退回服务端 message 子串（use_card 的真实文案：
 *     「卡密不存在」「卡密已过期」「卡密已被使用或已失效」）
 * 其它失败（缺少工具、网络异常、未知错误）返回 null —— 由调用处显示普通错误提示，
 * 不能把它们统统塞进「兑换失败」。
 */
export const REDEEM_RESULT_VARIANTS = {
  SUCCESS: 'success',
  USED: 'used',
  EXPIRED: 'expired',
  NOTFOUND: 'notfound',
}

/**
 * @param {object|null} result activationResult：服务端报文或 { success, message }
 * @param {{ rewards?: string, formatDate?: (value: *) => string }} [options]
 * @returns {null | { variant: string, icon: string, title: string, desc: string, actions: Array }}
 */
export function buildActivationResultView(result, { rewards = '', formatDate } = {}) {
  if (!result || typeof result !== 'object') return null

  const data = result.data && typeof result.data === 'object' ? result.data : {}
  const message = String(result.message || '')
  const format = typeof formatDate === 'function' ? formatDate : (value) => String(value || '—')

  if (result.success === true) {
    const parts = []
    const name = data.card_name ? `「${data.card_name}」` : '卡密'
    parts.push(`${name}已到账`)
    if (data.entitlement_expires_at) {
      parts.push(`有效期至 ${format(data.entitlement_expires_at)}`)
    } else if (data.duration_days) {
      parts.push(`有效期 ${data.duration_days} 天`)
    }
    if (rewards) parts.push(`已发放 ${rewards}`)
    parts.push('可在「我的卡密」查看详情，也可以继续兑换下一张。')

    return {
      variant: REDEEM_RESULT_VARIANTS.SUCCESS,
      icon: 'check-circle',
      title: '兑换成功',
      desc: parts.join('，'),
      actions: [
        { label: '查看我的卡密', kind: 'primary', action: 'show-cards' },
        { label: '继续兑换', kind: 'outline', action: 'continue' },
      ],
    }
  }

  const code = String(result.code || '')
  const notFound = code === 'CARD_NOT_FOUND' || /不存在|未找到|找不到/.test(message)
  const expired = code === 'CARD_EXPIRED' || /已过期|过期/.test(message)
  const used =
    code === 'CARD_USED' || code === 'CARD_ALREADY_USED' || /已被使用|已使用|已失效/.test(message)

  if (notFound) {
    return {
      variant: REDEEM_RESULT_VARIANTS.NOTFOUND,
      icon: 'search',
      title: '没有找到这张卡密',
      desc: '请检查是否输错了字母（如 O 与 0、I 与 1）。若确认无误，可能是购买渠道尚未同步，请稍后重试。',
      actions: [{ label: '重新输入', kind: 'outline', action: 'restart' }],
    }
  }

  if (expired) {
    return {
      variant: REDEEM_RESULT_VARIANTS.EXPIRED,
      icon: 'alert-triangle',
      title: '卡密已过期',
      desc: '这张卡密已超过有效期，无法继续兑换。若为近期购买，可凭订单号联系客服核实延期。',
      actions: [
        { label: '联系客服', kind: 'primary', href: '/support' },
        { label: '重新输入', kind: 'outline', action: 'restart' },
      ],
    }
  }

  if (used) {
    return {
      variant: REDEEM_RESULT_VARIANTS.USED,
      icon: 'clock',
      title: '这张卡密已被使用',
      desc: '卡密已兑换过，不能重复使用。可在「我的卡密」中查看兑换记录；如果是本人操作，无需处理。',
      actions: [{ label: '查看我的卡密', kind: 'outline', action: 'show-cards' }],
    }
  }

  return null
}
</script>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
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

const { activateCode, selectedToolId, activationResult, activating, clearResult } = activation

/* ── 粘贴/失焦 → 自动识别卡密绑定的工具（需求 5.1） ────────────── */

/** 防抖窗口：粘贴后等用户停手再查，连续粘贴只发一次请求 */
const AUTO_LOOKUP_DEBOUNCE_MS = 400
/** 不足 8 位不可能是完整卡密，查了也只会 404 */
const AUTO_LOOKUP_MIN_LENGTH = 8

let lookupTimer = null
let lastLookupCardNo = ''
let lookupSeq = 0
let lookupDisposed = false

const clearLookupTimer = () => {
  if (!lookupTimer) return
  clearTimeout(lookupTimer)
  lookupTimer = null
}

/**
 * 安排一次静默查询（blur / paste 共用）。
 *
 * 刻意延迟 400ms 再读 `activateCode`：paste 事件先于 v-model 更新触发，
 * 此刻模型里还是旧值；等一拍之后读到的才是用户真正粘贴的内容。期间再次
 * 触发（例如粘贴后马上失焦）会重置计时，同一张卡只查一次。
 */
const queueToolLookup = () => {
  clearLookupTimer()
  lookupTimer = setTimeout(runToolLookup, AUTO_LOOKUP_DEBOUNCE_MS)
}

async function runToolLookup() {
  lookupTimer = null
  const cardNo = activateCode.value.trim()
  if (cardNo.length < AUTO_LOOKUP_MIN_LENGTH) return
  // 已经有工具就不打扰用户；同一张卡不重复查询
  if (selectedToolId.value || cardNo === lastLookupCardNo) return

  lastLookupCardNo = cardNo
  const seq = ++lookupSeq
  try {
    const response = await api.lookupCard(cardNo)
    // 期间用户改了卡密、手选了工具或组件已卸载：丢弃这次结果
    if (lookupDisposed || seq !== lookupSeq) return
    if (response?.success !== true || !response.data) return
    if (selectedToolId.value || activateCode.value.trim() !== cardNo) return

    const toolId = response.data.tool_id
    if (toolId == null) return

    const option = toolOptions.value.find((item) => String(item.value) === String(toolId))
    if (!option) {
      // 卡密有效但工具已下架：明确告知，不自动选中一个不存在的项
      notify.error('该卡密绑定的工具已下架')
      return
    }
    selectedToolId.value = option.value
    notify.success('已自动选择该卡密对应的工具')
  } catch (error) {
    // 静默失败：识别只是锦上添花，用户可能还在输入完整卡密，
    // 任何 toast 都会打断。只在开发环境留一条 debug。
    if (import.meta.env?.DEV) {
      console.debug('[kami] lookupCard failed:', error?.code || error?.status || error?.message)
    }
  }
}

onBeforeUnmount(() => {
  lookupDisposed = true
  clearLookupTimer()
})

/**
 * 本次激活发放的积分 / 成长值，用于在成功提示后补一句「已发放 …」。
 *
 * 换算率不在这里 —— 服务端按卡密面值算好，放在响应 data 里（见迁移
 * 2026-10-12-add-card-value-rewards.sql 的 card_points_reward / card_growth_reward）。
 *
 * 必须用 `!== undefined` 判断：契约规定「不适用」靠**不下发该键**表达，绝不给 0，
 * 写成 `> 0` 会把「键缺失」和「值为 0」混在一起，改率时容易悄悄漏显示。
 */
const activationRewards = computed(() => {
  const info = activationResult.value?.data
  if (!info || typeof info !== 'object') return ''
  const parts = []
  if (info.points_granted !== undefined) parts.push(`${info.points_granted} 积分`)
  if (info.growth_granted !== undefined) parts.push(`${info.growth_granted} 成长值`)
  return parts.join('、')
})

/** 四模板视图；null 表示这是流程性错误（缺工具 / 网络异常），走普通错误提示 */
const activationView = computed(() =>
  buildActivationResultView(activationResult.value, {
    rewards: activationRewards.value,
    formatDate: formatCardDate,
  })
)

/** 右栏列表：成功/已使用模板的「查看我的卡密」滚动到这里 */
const listPanel = ref(null)

const handleActivationAction = (action) => {
  if (action === 'show-cards') {
    listPanel.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    return
  }
  if (action === 'continue' || action === 'restart') {
    // 结束本次结果展示，光标回到输入框；输入内容留在原处便于修正
    clearResult()
    focusActivate()
  }
}

/* ── 会员免卡密激活（需求 8） ─────────────────────────────────── */

const memberQuota = ref(null)
const memberQuotaLoading = ref(false)
const memberQuotaError = ref('')
/**
 * 404 表示后端还没部署这个能力（契约先行）。这不是用户操作失败，
 * 文案保持中性色；只有真实读取错误才用告警色。
 */
const memberQuotaUnavailable = ref(false)
const memberToolId = ref('')
const memberUuid = ref('')
const memberActivating = ref(false)
const memberError = ref(null)

const memberIsMember = computed(() => memberQuota.value?.is_member === true)

/**
 * 额度文案。档位优先用 `level`（V4 这类短标识，正合设计稿的
 * 「V4 · 本等级可免卡密激活 …」），缺失时退回 level_name。
 */
const memberQuotaText = computed(() => {
  const quota = memberQuota.value
  if (!quota?.is_member) return ''
  const level = quota.level || quota.level_name || '会员'
  if (quota.unlimited) {
    return `${level} · 本等级免卡密激活不限数量，已用 ${quota.used} 个`
  }
  return `${level} · 本等级可免卡密激活 ${quota.quota} 个工具，已用 ${quota.used} 个，剩余 ${quota.remaining} 个`
})

const memberFormDisabled = computed(() => !memberIsMember.value || memberActivating.value)

const memberSubmitDisabled = computed(() => memberFormDisabled.value || !memberToolId.value)

/** 后端 code → 可执行文案。未知 code 保留服务端 message，绝不吞掉 */
const MEMBER_ERROR_MESSAGES = {
  NOT_MEMBER: '当前账号还不是会员，开通会员后可免卡密激活工具。',
  QUOTA_EXCEEDED: '本等级额度已用满，升级会员或购买卡密。',
  TOOL_NOT_ELIGIBLE: '该工具不支持会员免卡密激活，请购买卡密。',
  USER_UUID_MISMATCH: '用户标识与当前登录账号不一致。',
  TOOL_NOT_FOUND: '该工具不存在或已下架。',
  TOOL_ID_REQUIRED: '请先选择要激活的工具。',
}

const memberErrorLinks = computed(() => {
  const code = memberError.value?.code
  if (code === 'NOT_MEMBER') return [{ to: '/member/plans', label: '开通会员' }]
  if (code === 'QUOTA_EXCEEDED') {
    return [
      { to: '/member/plans', label: '升级会员' },
      { to: '/tool', label: '购买卡密' },
    ]
  }
  if (code === 'TOOL_NOT_ELIGIBLE' || code === 'TOOL_NOT_FOUND') {
    return [{ to: '/tool', label: '购买卡密' }]
  }
  return []
})

const resolveMemberError = (error) => {
  const code = String(error?.code || '')
  return {
    code,
    message: MEMBER_ERROR_MESSAGES[code] || error?.message || '激活失败，请稍后再试。',
  }
}

/** 额度独立取数：不复用会员中心 store，避免把权益页的缓存牵连进来 */
async function loadMemberQuota() {
  if (!canUseKami.value || memberQuotaLoading.value) return false
  memberQuotaLoading.value = true
  try {
    const response = await api.getMemberQuota()
    if (response?.success === true && response.data) {
      memberQuota.value = response.data
      memberQuotaError.value = ''
      memberQuotaUnavailable.value = false
      return true
    }
    memberQuota.value = null
    memberQuotaError.value = '会员权益信息暂时不可用，请稍后重试。'
    memberQuotaUnavailable.value = false
    return false
  } catch (error) {
    memberQuota.value = null
    // 404 = 后端还没部署这个能力（契约先行），不弹错、只把卡片置为不可提交
    memberQuotaUnavailable.value = error?.status === 404
    memberQuotaError.value = memberQuotaUnavailable.value
      ? '会员免卡密激活暂未开放，请稍后再试。'
      : '会员权益信息读取失败，请稍后重试。'
    return false
  } finally {
    memberQuotaLoading.value = false
  }
}

async function handleMemberActivate() {
  if (!memberIsMember.value || memberActivating.value) return
  memberError.value = null

  const toolId = Number(memberToolId.value)
  if (!Number.isInteger(toolId) || toolId <= 0) {
    memberError.value = {
      code: 'TOOL_ID_REQUIRED',
      message: MEMBER_ERROR_MESSAGES.TOOL_ID_REQUIRED,
    }
    return
  }

  memberActivating.value = true
  try {
    const payload = { tool_id: toolId }
    const userUuid = memberUuid.value.trim()
    if (userUuid) payload.user_uuid = userUuid

    const response = await api.activateByMember(payload)
    if (response?.success !== true) {
      memberError.value = resolveMemberError(response)
      return
    }

    notify.success(response.message || '免卡密激活成功')
    memberToolId.value = ''
    memberUuid.value = ''
    // 额度与卡密列表都会变：刷新额度，并复用页面既有的 reload 拉列表
    await Promise.all([loadMemberQuota(), reload(1)])
  } catch (error) {
    memberError.value = resolveMemberError(error)
    // 额度类失败说明本地额度已过期，顺手对一次；其余失败保留当前展示
    if (error?.code === 'QUOTA_EXCEEDED' || error?.code === 'NOT_MEMBER') {
      loadMemberQuota()
    }
  } finally {
    memberActivating.value = false
  }
}

const resetMemberPanel = () => {
  memberQuota.value = null
  memberQuotaError.value = ''
  memberQuotaUnavailable.value = false
  memberToolId.value = ''
  memberUuid.value = ''
  memberError.value = null
}

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
    loadMemberQuota()
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
    if (id && canUseKami.value) {
      reload(1)
      loadMemberQuota()
    } else if (!id) {
      // 退出登录：别把上一个账号的额度留在界面上
      resetMemberPanel()
    }
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

/* 两块面板共用同一套外壳（只有圆角/描边/阴影走令牌，内边距各自声明）。
   这里**不能**写 overflow: hidden —— 工具/状态筛选的 `.u-select-panel` 是
   绝对定位浮层，会被面板边界裁掉（实测展开后只剩前两项、底部描边消失）。
   面板内部也没有依赖裁切的贴边子元素（表格横滚由 `.u-table-wrap` 自己负责），
   圆角交给 border-radius 即可。 */
.panel {
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
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

/* ── 兑换结果（设计系统 RedeemResult 四模板） ───────────────── */
/* 组件自带的 32px 纵向内边距在左栏窄面板里过大，收紧到与面板节奏一致；
   颜色、圆角、描边、图标底色全部来自 --ec-*，这里只调间距。 */
.activation-result .ec-redeem-result {
  padding: var(--ec-space-6) var(--ec-space-4);
}

.activation-result .ec-redeem-result__icon :deep(.app-icon) {
  width: var(--ec-space-6);
  height: var(--ec-space-6);
}

.activate-tips {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* ── 会员免卡密激活 ─────────────────────────────────────────── */

/* 内嵌二级卡片：浅一层底色 + 细描边，与激活表单区分但不抢面板主次 */
.member-card {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 1.5);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

.member-head {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
}

.member-title {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  margin: 0;
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.member-identity {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 非会员是「引导」而非「错误」：用强调色，别用危险色吓退用户 */
.member-identity--guest {
  color: var(--accent);
}

.member-identity--error {
  color: var(--danger);
}

.member-expire {
  margin: 0;
  font-size: var(--fs-label);
  color: var(--text-muted);
}

.member-form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.25);
}

/* 提交是这张卡的主操作：占满一行，与激活按钮的视觉权重一致 */
.member-submit {
  width: 100%;
}

/* 用户标识留空时的说明：浅色小字，不抢主按钮 */
.member-hint {
  margin: 0;
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

.member-cta,
.member-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 0.75);
}

.member-error {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
}

.member-error-text {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--danger);
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
 * 与项目里其它分页（如订单页）同源，因此明暗两套主题下自动成立。
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
  .member-identity,
  .member-hint,
  .member-expire,
  .member-error-text,
  .success-msg,
  .error-msg,
  .error-banner,
  .empty-small {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .member-card {
    padding: calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
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
