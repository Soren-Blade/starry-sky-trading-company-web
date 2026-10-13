import { ref } from 'vue'

/**
 * 卡密激活流程的状态与提交逻辑。
 *
 * 从 `KamiSection.vue` 抽出。原因：
 *   1. 这段有**真实的分支逻辑**（本地校验、服务端错误、异常、成功后的清理与刷新），
 *      内联在组件里无法单独测试（本项目尚未引入 jsdom）。
 *   2. 原实现把「成功」判定为 `resp?.success` —— 仅看真值，不区分服务端返回的
 *      `success: false` 与抛异常，两种情况都会落到同一个展示分支，
 *      但清理与刷新只在其中一个发生。抽出来可以把这条路径写清楚并加断言。
 *
 * @param {object} deps
 * @param {(payload: object) => Promise<{success?: boolean, message?: string, code?: string}>} deps.activateCard
 *   实际发起激活请求的函数（通常来自 api 层）
 * @param {() => (string|number|null)} [deps.getUserId] 取当前用户 id
 * @param {() => Promise<*>} [deps.onActivated] 激活成功后的回调（通常是重新拉取列表）
 */
export function useKamiActivation({ activateCard, getUserId, onActivated } = {}) {
  const activateCode = ref('')
  const selectedToolId = ref('')
  /** 展示用结果：{ success, message } 或 null */
  const activationResult = ref(null)
  const activating = ref(false)

  /** 清空表单与上一次结果 */
  function resetForm() {
    activateCode.value = ''
    selectedToolId.value = ''
  }

  /** 只清空提示，保留用户已填内容（切换 tab 时用） */
  function clearResult() {
    activationResult.value = null
  }

  /**
   * 提交激活。
   *
   * 返回结构化结果，便于调用方决定是否切换 tab 等：
   *   { success: boolean, reason: 'empty_code' | 'thrown' | 'server' | 'ok', message }
   *
   * **本地不校验工具**：积分卡（card_type = 'points'）不需要工具，而卡密是哪一类
   * 只有服务端知道。「不是积分卡就必须能确定工具」由 sstc.use_card 判断，
   * 缺少工具时它返回「请选择要激活的工具」且**不消耗卡密**，
   * 前端把这个 message 原样显示即可（历史上有过的 `empty_tool` 分支因此删除）。
   *
   * **不会抛异常**：所有失败路径都转成 `activationResult`，与原有行为一致。
   *
   * @returns {Promise<{success: boolean, reason: string, message: string}>}
   */
  async function activate() {
    const code = String(activateCode.value || '').trim()

    if (!code) {
      const message = '请输入卡密'
      activationResult.value = { success: false, message }
      return { success: false, reason: 'empty_code', message }
    }

    if (typeof activateCard !== 'function') {
      const message = '激活服务不可用'
      activationResult.value = { success: false, message }
      return { success: false, reason: 'thrown', message }
    }

    activating.value = true
    // 用于区分「激活本身失败」与「激活成功但后续刷新失败」 —— 后者不能报告为激活失败，
    // 否则用户会以为卡密没生效而重复激活。
    let activated = null

    try {
      const userId = typeof getUserId === 'function' ? getUserId() : undefined
      const payload = { card_no: code, user_id: userId }

      // 只有真的选了工具才下发 tool_id（契约：不适用就不下发该键）。
      // 没选工具时下发 0 / NaN 只会让服务端多走一次「无效工具」判断。
      const toolId = Number(selectedToolId.value)
      if (selectedToolId.value && Number.isInteger(toolId) && toolId > 0) {
        payload.tool_id = toolId
      }

      const resp = await activateCard(payload)

      // 服务端返回的报文直接用于展示（含 message 与 code）
      activationResult.value = resp || { success: false, message: '激活失败' }

      if (resp && resp.success === true) {
        activated = resp
        resetForm()
        if (typeof onActivated === 'function') {
          await onActivated()
        }
        return { success: true, reason: 'ok', message: resp.message || '激活成功' }
      }

      // 服务端明确失败：不清空表单，便于用户修正后重试
      return {
        success: false,
        reason: 'server',
        message: activationResult.value.message || '激活失败',
      }
    } catch (err) {
      // 激活已成功、只是刷新列表出错：仍然报告成功，但提示用户手动刷新
      if (activated) {
        const suffix = (err && err.message) ? `：${err.message}` : ''
        activationResult.value = {
          success: true,
          message: `${activated.message || '激活成功'}（列表刷新失败，请手动刷新${suffix}）`,
        }
        return {
          success: true,
          reason: 'ok',
          message: activationResult.value.message,
        }
      }

      const message = (err && err.message) || '激活失败'
      activationResult.value = { success: false, message }
      return { success: false, reason: 'thrown', message }
    } finally {
      activating.value = false
    }
  }

  return {
    activateCode,
    selectedToolId,
    activationResult,
    activating,
    activate,
    resetForm,
    clearResult,
  }
}
