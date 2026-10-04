/**
 * TOTP 倒计时（RFC 6238 的时间步长）辅助
 *
 * 从 pages/2FA.vue 抽出，原因是这段计算需要被测试，而它同时又涉及一个
 * 浏览器行为上的坑：页面切到后台时 `setInterval` 会被浏览器节流，
 * 定时器不再按时触发，于是回到前台时可能仍在显示**上一个周期**的验证码。
 *
 * 解法是从时钟派生倒计时（而不是自减），并在页面重新可见时立刻重算一次。
 */

/** 默认时间步长（秒），与 RFC 6238 推荐值一致 */
export const DEFAULT_STEP = 30

/**
 * 由当前时间算出本周期剩余秒数。
 *
 * 返回值范围是 **1..step**（而不是 0..step-1）：
 * - 等于 step 表示刚好进入新周期（这一秒需要重新生成验证码）
 * - 等于 1 表示即将翻页
 * 这样界面上永远显示 1..30，不会出现 0 秒的瞬间。
 *
 * @param {number} [nowMs] 毫秒时间戳，默认 Date.now()
 * @param {number} [step] 周期秒数
 * @returns {number} 1..step
 */
export function computeSecondsRemaining(nowMs = Date.now(), step = DEFAULT_STEP) {
  if (!Number.isFinite(step) || step <= 0) return DEFAULT_STEP
  // 时间戳必须是有限值，否则下面的取模会得到 NaN（测试发现过这一点）
  if (!Number.isFinite(nowMs)) return DEFAULT_STEP

  const nowSeconds = Math.floor(nowMs / 1000)
  // 取模结果可能是 0（刚好整周期边界），映射到 step；
  // 负数时间戳下取模为负，因此先规范到 0..step-1
  const elapsed = ((nowSeconds % step) + step) % step
  return elapsed === 0 ? step : step - elapsed
}

/**
 * 判断某个时刻是否刚进入新周期（用于决定是否重新生成验证码）。
 * @param {number} [nowMs]
 * @param {number} [step]
 * @returns {boolean}
 */
export function isNewPeriod(nowMs = Date.now(), step = DEFAULT_STEP) {
  return computeSecondsRemaining(nowMs, step) === step
}
