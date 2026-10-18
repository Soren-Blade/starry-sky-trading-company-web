/**
 * `/text/kit` 的文本处理纯函数。
 *
 * 抽出来的理由：页面原来 263 行，一半是这些与 Vue 无关的分支逻辑，改一条排序
 * 规则只能靠 SSR 渲染测试间接验证。放这里之后有了 `test/textKit.test.js` 直接断言。
 *
 * 约定：全部是纯函数，不碰 DOM（`decodeEntities` 需要 `<textarea>` 解码的能力由页面
 * 传入的实现承担，Node 侧用一个小替身）。
 */
import { ZH_PAIRS } from './zhTable.js'

const ZH_MAP = new Map()
for (let i = 0; i < ZH_PAIRS.length; i += 2) ZH_MAP.set(ZH_PAIRS[i], ZH_PAIRS[i + 1])

/** 简体 → 繁体，逐字替换，未收录的字原样输出。 */
export function zhConvert(text) {
  let output = ''
  for (const char of text) output += ZH_MAP.get(char) || char
  return output
}

/** 简繁对照表收录的字数（成对计数）。 */
export const zhPairCount = ZH_MAP.size

export const CASE_FNS = {
  upper: (text) => text.toUpperCase(),
  lower: (text) => text.toLowerCase(),
  capitalize: (text) => text.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase()),
  sentence: (text) => text.replace(/(?:^|[.!?]\s+)\S/g, (char) => char.toUpperCase()),
  toggle: (text) =>
    text
      .split('')
      .map((char) => (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()))
      .join(''),
}

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function encodeEntities(text) {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char])
}

/** 排序方式 → 比较函数。`length-*` 按行长，其余按本地化字典序。 */
export function sortLines(text, mode, unique) {
  let lines = text.split('\n')
  if (unique) lines = [...new Set(lines)]
  const compare = {
    'length-asc': (a, b) => a.length - b.length,
    'length-desc': (a, b) => b.length - a.length,
    desc: (a, b) => b.localeCompare(a),
  }[mode]
  lines.sort(compare || ((a, b) => a.localeCompare(b)))
  return lines.join('\n')
}

/**
 * 行去重。`first` 保留首次出现位置，`last` 保留最后出现位置，`count` 按出现次数倒序
 * 并附上次数。注意 `count` 模式输出带 `(n)` 后缀，重复跑会再套一层。
 */
export function dedupLines(text, mode) {
  const lines = text.split('\n')
  const keepLast = mode === 'last'
  const seen = new Map()
  lines.forEach((line, index) => {
    const item = seen.get(line)
    if (item) {
      item.count += 1
      if (keepLast) item.index = index
    } else {
      seen.set(line, { line, index, count: 1 })
    }
  })
  const values = [...seen.values()]
  if (mode === 'count') {
    return values
      .sort((a, b) => b.count - a.count)
      .map((item) => `${item.line} (${item.count})`)
      .join('\n')
  }
  return values
    .sort((a, b) => a.index - b.index)
    .map((item) => item.line)
    .join('\n')
}

export function cleanText(text, options) {
  let output = text
  if (options.empty) output = output.replace(/\n[\t ]*(?=\n)/g, '')
  if (options.trim) output = output.split('\n').map((line) => line.trim()).join('\n')
  if (options.collapse) output = output.replace(/[ \t]+/g, ' ')
  if (options.newlines) output = output.replace(/\r\n/g, '\n').replace(/\n+/g, '\n')
  return output
}

/** 字数统计卡片的数据。`byteSize` 由调用方传入（浏览器用 Blob，Node 用 Buffer）。 */
export function countStats(text, byteSize) {
  const lines = text.split('\n').length
  return {
    text: '',
    stats: [
      { label: '字符数', value: text.length },
      { label: '字符数（不含空格）', value: text.replace(/\s/g, '').length },
      { label: '词数', value: text.trim() ? text.trim().split(/\s+/).length : 0 },
      { label: '行数', value: lines },
      { label: '字节数', value: byteSize },
    ],
    meta: { 原文本: `${text.length} 字符 · ${lines} 行` },
  }
}

/** 极简 HTML → Markdown，只处理常见的行内与块级标签，其余标签直接剥掉。 */
export function htmlToMarkdown(html) {
  return html
    .replace(/<h([1-3])[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => `${'#'.repeat(Number(level))} ${text}\n`)
    .replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**')
    .replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}
