import { ref } from 'vue'
import {
  validateAvatarFile,
  fitWithin,
  describeDataUrlSize,
  AVATAR_TARGET_SIZE,
  AVATAR_QUALITY,
} from '@/utils/avatarFile.js'

/**
 * 头像上传的前端流程：选文件 → 校验 → **在 canvas 上缩放** → 编码成 data URL
 *
 * ## 为什么要在前端缩放
 *
 * 手机直出照片动辄 4–8 MB、4000×3000。直接上传有三个代价：
 *   1. 请求体上限（服务端是 1mb）—— 连传都传不上去；
 *   2. 白白消耗用户的流量与等待时间；
 *   3. 服务端还得为「解码一张 4000×3000 的图」付出内存。
 *
 * 头像在任何 UI 里都不会超过 256px 见方，因此先缩到 256 再编码，
 * 通常落到 10–25 KB —— 上传几乎瞬间完成。
 *
 * ## 为什么用 data URL 而不是 FormData
 *
 * 服务端接口收 `{ image: 'data:image/webp;base64,...' }`，走的是普通的
 * `express.json()`，因此**不需要 multipart 解析器**（multer / busboy）。
 * 载荷被前端压到几十 KB，base64 的 4/3 膨胀在这个量级下无所谓。
 *
 * 编码优先 WebP（保留 PNG 的透明通道且体积更小）；浏览器不支持时
 * `toDataURL` 会返回 PNG，这里按返回的实际前缀判断，不需要 UA 嗅探。
 */
export function useAvatarUpload() {
  /** 准备中的 data URL（预览用） */
  const preview = ref('')
  /** 预览的可读体积 */
  const previewSize = ref('')
  /** 原始文件名（仅在提示里出现，不发给服务端） */
  const sourceName = ref('')
  /** 是否正在处理文件（读文件 + 画 canvas） */
  const preparing = ref(false)

  /** 清掉已选的图片 */
  const reset = () => {
    preview.value = ''
    previewSize.value = ''
    sourceName.value = ''
  }

  /** 把 File 解码成可绘制的位图；优先 createImageBitmap，回退到 <img> */
  const loadBitmap = async (file) => {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file)
      } catch {
        /* 某些浏览器对个别格式会失败，继续走 <img> 回退 */
      }
    }

    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('图片无法解码'))
      }
      image.src = objectUrl
    })
  }

  /**
   * 处理用户选择的文件，成功后 `preview` 就是可直接提交的 data URL。
   *
   * @param {File} file
   * @returns {Promise<{ ok: boolean, message?: string, dataUrl?: string }>}
   */
  const prepare = async (file) => {
    const checked = validateAvatarFile(file)
    if (!checked.ok) return checked

    if (typeof document === 'undefined') {
      return { ok: false, message: '当前环境不支持图片处理' }
    }

    preparing.value = true
    try {
      const bitmap = await loadBitmap(file)

      const sourceWidth = bitmap.width || bitmap.naturalWidth || 0
      const sourceHeight = bitmap.height || bitmap.naturalHeight || 0
      const target = fitWithin(sourceWidth, sourceHeight, AVATAR_TARGET_SIZE)

      const canvas = document.createElement('canvas')
      canvas.width = target.width
      canvas.height = target.height

      const ctx = canvas.getContext('2d')
      if (!ctx) return { ok: false, message: '当前浏览器不支持图片处理' }

      // 缩小时开启平滑，避免头像出现锯齿
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, target.width, target.height)

      // createImageBitmap 的产物需要显式释放；<img> 没有这个方法
      if (typeof bitmap.close === 'function') bitmap.close()

      // 优先 WebP（体积小且保留透明通道）。不支持的浏览器会返回 PNG，
      // 因此直接看返回值的实际前缀，而不是猜能力。
      let dataUrl = canvas.toDataURL('image/webp', AVATAR_QUALITY)
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/png')
      }

      preview.value = dataUrl
      previewSize.value = describeDataUrlSize(dataUrl)
      sourceName.value = file.name || ''

      return { ok: true, dataUrl }
    } catch (error) {
      reset()
      return { ok: false, message: error?.message || '图片处理失败，请换一张试试' }
    } finally {
      preparing.value = false
    }
  }

  return { preview, previewSize, sourceName, preparing, prepare, reset }
}

export default useAvatarUpload
