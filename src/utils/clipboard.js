/**
 * 剪贴板写入
 *
 * 为什么单独成模块：
 *   1. 页面里原先有两份几乎相同的复制逻辑（复制验证码 / 复制演示密钥），
 *      其中回退分支既不检查 `document.execCommand` 的返回值、也不提示用户，
 *      于是复制失败时**完全静默** —— 用户以为复制成功，粘贴出来却是旧的。
 *   2. 这套逻辑（含降级与失败分支）需要能被测试。
 *
 * 两级策略：
 *   1. `navigator.clipboard.writeText` —— 现代 API。**仅在安全上下文
 *      （HTTPS 或 localhost）可用**，且可能因权限被拒绝而抛错。
 *   2. `document.execCommand('copy')` —— 已废弃但兼容性广的降级方案。
 *      它**有返回值**（boolean），必须检查，否则失败会被当成成功。
 */

/** 复制结果：成功时 method 说明用了哪条路径 */
export const COPY_RESULT = {
  CLIPBOARD: 'clipboard',
  LEGACY: 'legacy',
  FAILED: 'failed',
  EMPTY: 'empty',
};

/** navigator.clipboard 是否可用（安全上下文 + 浏览器支持） */
export function isClipboardAvailable() {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.clipboard) &&
    typeof navigator.clipboard.writeText === 'function'
  );
}

/**
 * 用已废弃的 execCommand 兜底复制。
 * @param {string} text
 * @returns {boolean} 是否成功（execCommand 的返回值必须检查）
 */
function copyViaExecCommand(text) {
  if (typeof document === 'undefined' || !document.body) return false;
  if (typeof document.execCommand !== 'function') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  // 避免聚焦时页面滚动跳动
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';

  let ok = false;
  document.body.appendChild(textarea);
  try {
    textarea.select();
    if (typeof textarea.setSelectionRange === 'function') {
      textarea.setSelectionRange(0, text.length);
    }
    ok = document.execCommand('copy') === true;
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}

/**
 * 把文本写入剪贴板。
 *
 * @param {string} text 要复制的文本；空值不会执行复制
 * @returns {Promise<{ ok: boolean, method: string, message: string }>}
 *   - method: 'clipboard' | 'legacy' | 'failed' | 'empty'
 *   - 永不抛异常，调用方只需看 ok
 */
export async function copyText(text) {
  if (text === null || text === undefined || String(text) === '') {
    return { ok: false, method: COPY_RESULT.EMPTY, message: '没有可复制的内容' };
  }

  const value = String(text);

  if (isClipboardAvailable()) {
    try {
      await navigator.clipboard.writeText(value);
      return { ok: true, method: COPY_RESULT.CLIPBOARD, message: '已复制到剪贴板' };
    } catch {
      // 常见原因：权限被拒绝、页面失焦、非安全上下文
      // 不直接失败，继续尝试降级方案
    }
  }

  if (copyViaExecCommand(value)) {
    return { ok: true, method: COPY_RESULT.LEGACY, message: '已复制到剪贴板' };
  }

  return {
    ok: false,
    method: COPY_RESULT.FAILED,
    message: '复制失败，请手动选择文本复制',
  };
}
