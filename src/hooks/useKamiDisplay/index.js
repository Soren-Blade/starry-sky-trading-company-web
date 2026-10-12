import { formatISOTime } from '@/hooks/useSimpleTimeFormatter'
import { lookupOr, lookup } from '@/utils/safeLookup.js'

/**
 * 卡密的展示层逻辑：状态文案/配色、工具名解析、日期格式化。
 *
 * 为什么抽出来：这些是**纯函数**，此前内联在 `KamiSection.vue` 里，
 * 只能靠组件渲染测试覆盖（本项目尚未引入 jsdom），因此一直缺少针对性用例。
 * 抽成模块后可以直接断言，组件只负责把它接到模板上。
 *
 * 注意：状态文案与配色用 `lookupOr` 而非 `obj[key]` ——
 * status 来自后端，若取值恰为 `toString` / `constructor` 这类原型链属性名，
 * 普通取值会返回**函数**而不是文案（server 侧已出现过同类缺陷）。
 */

/** 卡密状态 -> 中文文案 */
export const STATUS_TEXT = {
  unused: '未使用',
  used: '已使用',
  expired: '已过期',
  disabled: '已禁用',
}

/**
 * 卡密状态 -> 项目自有标签变体（`.u-tag--*` 的修饰名）。
 *
 * 此前映射的是 ant-design-vue Tag 的颜色名（'blue' / 'green' / …），
 * 那是组件库私有的取值域；改用项目自己的语义变体后，
 * 配色由 `--success` / `--danger` 等令牌决定，五套主题各自成立。
 */
export const STATUS_VARIANT = {
  unused: 'accent',
  used: 'success',
  expired: 'danger',
  disabled: 'muted',
}

/** 状态筛选下拉的选项（含「全部」） */
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'unused', label: '未使用' },
  { value: 'used', label: '已使用' },
  { value: 'expired', label: '已过期' },
  { value: 'disabled', label: '已禁用' },
]

/**
 * 状态文案。
 * @param {string} status
 * @returns {string} 未识别时原样返回 status；空值返回「未知」
 */
export function getStatusText(status) {
  return lookupOr(STATUS_TEXT, status, status || '未知')
}

/**
 * 状态配色 -> `.u-tag` 的变体修饰类名。
 *
 * 返回的是**完整的类名片段**（如 `u-tag--success`），因为
 * `--variant` 本身是样式层概念，用上它就走上了令牌，不再出现组件库的影子。
 *
 * @param {string} status
 * @returns {string} 未识别时回退到默认变体（`u-tag--muted`）
 */
export function getStatusVariantClass(status) {
  const variant = lookupOr(STATUS_VARIANT, status, 'muted')
  return variant === 'default' ? 'u-tag--muted' : `u-tag--${variant}`
}

/**
 * 时间格式化：交给统一的 hook，避免 Invalid Date 渲染成 NaN。
 * @param {*} value
 * @returns {string} 无法解析时返回破折号
 */
export function formatCardDate(value) {
  return formatISOTime(value, 'YYYY-MM-DD HH:mm') || '—'
}

/**
 * 从工具列表里按 id 找名称。
 *
 * id 可能是数字或字符串（后端返回 bigint 时是字符串），因此用 Number 比较。
 *
 * @param {Array} tools 工具数组
 * @param {*} toolId
 * @returns {string|null} 未找到时返回 null
 */
export function resolveToolName(tools, toolId) {
  if (toolId === null || toolId === undefined || toolId === '') return null
  if (!Array.isArray(tools)) return null

  const target = Number(toolId)
  if (!Number.isFinite(target)) return null

  const tool = tools.find((t) => Number(t && t.id) === target)
  if (!tool) return null

  return lookup(tool, 'tool_name', null) || lookup(tool, 'display_name', null) || null
}

/**
 * 把工具数组转成下拉选项。
 * @param {Array} tools
 * @returns {Array<{value: string, label: string}>}
 */
export function toToolOptions(tools) {
  if (!Array.isArray(tools)) return []
  return tools.map((tool) => ({
    // value 统一为字符串：<select> 的 value 永远是字符串
    value: String(tool.id),
    label: tool.tool_name || tool.display_name || `工具 ${tool.id}`,
  }))
}

/** 卡密列表的表格列定义 */
export const KAMI_TABLE_COLUMNS = [
  { title: '卡密名称', dataIndex: 'card_name', key: 'card_name', width: 150 },
  { title: '面值', dataIndex: 'card_value', key: 'card_value', width: 100 },
  { title: '卡号', dataIndex: 'card_no_display', key: 'card_no_display', width: 150 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '有效期至', dataIndex: 'valid_until', key: 'valid_until', width: 170 },
  { title: '使用日期', dataIndex: 'used_at', key: 'used_at', width: 170 },
  { title: '已关联工具', dataIndex: 'tool_id', key: 'tool_id', width: 180 },
  // 2026-10-12 移除 ant-design-vue 时删掉了 align: 'center'：原生表格由 CSS 决定对齐，
  // 操作列改为左对齐见 KamiSection.vue:645-648 的 .u-table-col-action 覆盖。
  { title: '操作', key: 'action', width: 120 },
]
