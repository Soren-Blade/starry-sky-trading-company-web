/**
 * 头像文件的纯函数部分
 *
 * 拆出来的原因与 `utils/index.js`、`utils/clipboard.js` 一致：这里的判断
 * （类型白名单、体积上限、等比缩放尺寸）是**纯逻辑**，不碰 DOM、不碰 canvas，
 * 因此可以直接单测。真正需要浏览器的部分（读文件、画 canvas）留在
 * `hooks/useAvatarUpload` 里。
 */

/** 允许的源文件类型。与服务端 `utils/imageUpload.js` 的白名单保持一致 */
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 源文件体积上限。超过这个大小基本是手机原图，让用户先自己压比上传到一半失败更好 */
export const AVATAR_MAX_SOURCE_BYTES = 5 * 1024 * 1024

/** 上传前的目标边长（正方形）。256 足够头像在任何 UI 里清晰，编码后通常 10–25 KB */
export const AVATAR_TARGET_SIZE = 256

/** 编码质量（仅对有损格式生效） */
export const AVATAR_QUALITY = 0.85

/**
 * 校验用户选择的文件。
 *
 * @param {{ type?: string, size?: number, name?: string }|null|undefined} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateAvatarFile(file) {
  if (!file || typeof file !== 'object') {
    return { ok: false, message: '请选择一个图片文件' }
  }

  const size = Number(file.size)
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: '这个文件是空的' }
  }

  if (size > AVATAR_MAX_SOURCE_BYTES) {
    return {
      ok: false,
      message: `图片不能超过 ${Math.round(AVATAR_MAX_SOURCE_BYTES / 1024 / 1024)} MB`,
    }
  }

  // `file.type` 由浏览器按扩展名推断，并不可靠 —— 它只用于**尽早**给出友好提示，
  // 真正的类型判定在服务端按文件头做（伪造 type 绕不过去）。
  if (file.type && !AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, message: '只支持 JPG / PNG / WebP 格式的图片' }
  }

  return { ok: true }
}

/**
 * 等比缩放到「最长边不超过 max」。
 *
 * 不放大：小图保持原尺寸，避免把 64×64 拉成 256×256 反而更糊、文件更大。
 *
 * @param {number} width
 * @param {number} height
 * @param {number} [max]
 * @returns {{ width: number, height: number }} 至少为 1 的整数
 */
export function fitWithin(width, height, max = AVATAR_TARGET_SIZE) {
  const w = Number(width)
  const h = Number(height)

  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: max, height: max }
  }

  const longest = Math.max(w, h)
  if (longest <= max) {
    return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }
  }

  const scale = max / longest
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  }
}

/**
 * 把 data URL 的大小换算成可读文本（提示用）
 * @param {string} dataUrl
 * @returns {string} 形如 "18.4 KB"
 */
export function describeDataUrlSize(dataUrl) {
  if (typeof dataUrl !== 'string') return ''
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return ''

  const payload = dataUrl.slice(comma + 1)
  // base64 每 4 个字符表示 3 字节；末尾的 = 是填充
  const padding = (payload.match(/=+$/) || [''])[0].length
  const bytes = Math.max(0, Math.floor((payload.length * 3) / 4) - padding)

  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}
