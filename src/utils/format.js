/**
 * 工具页共用的展示格式化。
 *
 * 原来 `formatBytes` 在 `ImageCompressor.vue` 与 `VideoTool.vue` 里各写了一份完全相同的
 * 实现，`formatDuration` 也在 `VideoTool` 与侧边说明里各算一次。统一放这里，避免
 * 「一处改成 KB 保留两位、另一处还是一位的」这类偏差。
 */

/** 字节数 → 人类可读体积。1024 进制，MB 以上保留两位小数。 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 秒数 → `分:秒`。非有限值或非正数返回「未知」，避免出现 `NaN:NaN`。 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '未知'
  const total = Math.round(seconds)
  const minute = Math.floor(total / 60)
  const second = total % 60
  return `${minute}:${String(second).padStart(2, '0')}`
}

/** 压缩率：正数表示变小（带负号展示），负数表示反而变大。 */
export function sizeDeltaLabel(inputBytes, outputBytes) {
  if (!inputBytes || !outputBytes) return '—'
  const delta = (1 - outputBytes / inputBytes) * 100
  return delta >= 0 ? `-${delta.toFixed(1)}%` : `+${Math.abs(delta).toFixed(1)}%`
}
