/**
 * Cron 表达式的纯函数实现（页面 `/dev/cron` 的算法层）。
 *
 * 为什么单独成文件：这些函数原来内联在 `pages/tools/CronKit.vue` 里，
 * 页面 280 行里有 130 行是算法，改一个字段边界就得连模板一起读。
 * 抽出来之后可以脱离 DOM 直接测（`test/cron.test.js`），页面只剩状态与渲染。
 *
 * 语义对齐 Linux cron：
 *   - 5 段：分 时 日 月 周；6 段：秒 分 时 日 月 周（秒目前只支持固定值）。
 *   - 日与星期**都受限**时取并集，这是 Vixie cron 的行为，不是交集。
 *   - 星期 0 与 7 都是周日，统一归一到 0。
 */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const MONTHS = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月']

export const FIELD_LIMITS = [
  { label: '分钟', min: 0, max: 59 },
  { label: '小时', min: 0, max: 23 },
  { label: '日', min: 1, max: 31 },
  { label: '月', min: 1, max: 12 },
  { label: '星期', min: 0, max: 7 },
]

export const CRON_PRESETS = [
  { label: '每小时', expr: '0 * * * *' },
  { label: '每天 09:00', expr: '0 9 * * *' },
  { label: '每周一 09:00', expr: '0 9 * * 1' },
  { label: '每月 1 日 00:00', expr: '0 0 1 * *' },
]

/** 把一段字段展开成允许值的集合（支持星号、星号加步长、范围、范围加步长、逗号列表）。 */
export function expandField(source, limit) {
  const values = new Set()
  for (const part of source.split(',')) {
    const piece = part.trim()
    if (!piece) throw new Error('出现了空字段')

    const [range, stepText] = piece.split('/')
    if (piece.includes('/') && range === '') throw new Error(`“${piece}” 少了步长前的范围`)
    const step = stepText === undefined ? 1 : Number(stepText)
    if (!Number.isInteger(step) || step <= 0) throw new Error(`步长必须是正整数：“${piece}”`)

    let from = limit.min
    let to = limit.max
    if (range !== '*') {
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(Number)
        if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(`范围写法不对：“${piece}”`)
        from = a
        to = b
      } else {
        const single = Number(range)
        if (!Number.isInteger(single)) throw new Error(`不是数字：“${piece}”`)
        from = single
        to = stepText === undefined ? single : limit.max
      }
    }
    if (from < limit.min || to > limit.max) {
      throw new Error(`${limit.label}只能取 ${limit.min}-${limit.max}：“${piece}”`)
    }
    if (from > to) throw new Error(`范围起点大于终点：“${piece}”`)
    for (let value = from; value <= to; value += step) values.add(value)
  }
  return values
}

/** 中文可读描述：只覆盖最常见的几种形状，其余退回字段表。 */
export function describe(fields, source) {
  const [minute, hour, dom, month, dow] = fields
  const everyMinute = minute.size === 60
  const everyHour = hour.size === 24
  const everyDom = dom.size === 31
  const everyMonth = month.size === 12
  const everyDow = dow.size === 7

  if (everyMinute && everyHour && everyDom && everyMonth && everyDow) return '每分钟执行一次'
  if (!everyMinute && everyHour && everyDom && everyMonth && everyDow) {
    return `每小时的第 ${[...minute].join('、')} 分钟执行`
  }
  if (!everyMinute && !everyHour && everyDom && everyMonth && everyDow) {
    const hh = [...hour].map((h) => String(h).padStart(2, '0'))
    const mm = [...minute].map((m) => String(m).padStart(2, '0'))
    return `每天 ${hh.map((h, i) => `${h}:${mm[i] ?? mm[0]}`).join('、')} 执行`
  }
  if (!everyMinute && !everyHour && everyDom && everyMonth && !everyDow) {
    const days = [...dow].map((d) => WEEKDAYS[d === 7 ? 0 : d]).join('、')
    const hh = [...hour].map((h) => String(h).padStart(2, '0')).join('、')
    const mm = [...minute].map((m) => String(m).padStart(2, '0')).join('、')
    return `每${days} ${hh}:${mm} 执行`
  }
  if (!everyMinute && !everyHour && !everyDom && everyMonth && everyDow) {
    const hh = [...hour].map((h) => String(h).padStart(2, '0')).join('、')
    const mm = [...minute].map((m) => String(m).padStart(2, '0')).join('、')
    return `每月 ${[...dom].join('、')} 日的 ${hh}:${mm} 执行`
  }
  if (!everyMonth) {
    return `${[...month].map((m) => MONTHS[m - 1]).join('、')}：${source}`
  }
  return `按表达式执行：${source}`
}

/** 字段表里的一格文本（整段全覆盖时显示「每分钟」这类说法）。 */
export function fieldText(set, limit) {
  const span = limit.max - limit.min + 1
  // 星期是 0-7 共 8 个取值，但 0 与 7 同为周日，归一后只剩 7 个；
  // 不特殊处理就会显示成「0、1、2、3、4、5、6」，而它其实就是「每星期」。
  const fullWeekday = limit.max === 7 && set.size === 7 && !set.has(7)
  if (set.size === span || fullWeekday) return '每' + limit.label
  return [...set].sort((a, b) => a - b).join('、')
}

/**
 * 找出接下来的若干次执行时间。
 *
 * 逐分钟推进太慢（一年 52 万次），所以按「月 → 日 → 时 → 分」逐级跳过：
 * 当前字段不匹配时直接跳到下一个更大的时间单位，真实迭代次数通常只有几十次。
 */
export function nextRuns(fields, count = 10, now = new Date()) {
  const [minute, hour, dom, month, dow] = fields
  const result = []
  const cursor = new Date(now.getTime())
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const horizon = new Date(cursor.getTime())
  horizon.setFullYear(horizon.getFullYear() + 5)

  while (result.length < count && cursor <= horizon) {
    if (!month.has(cursor.getMonth() + 1)) {
      cursor.setDate(1)
      cursor.setHours(0, 0, 0, 0)
      cursor.setMonth(cursor.getMonth() + 1)
      continue
    }
    // 日与星期的组合语义与 Linux cron 一致：两者都受限时取并集
    const domOk = dom.has(cursor.getDate())
    const dowOk = dow.has(cursor.getDay())
    const dayOk = dom.size === 31 && dow.size === 7 ? true : dom.size === 31 ? dowOk : dow.size === 7 ? domOk : domOk || dowOk
    if (!dayOk) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(0, 0, 0, 0)
      continue
    }
    if (!hour.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
      continue
    }
    if (!minute.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
      continue
    }
    result.push(cursor.toLocaleString('zh-CN', { hour12: false }))
    cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
  }
  return result
}

/**
 * 解析表达式，返回 { fields, description, runs }。
 * 任何不合法都抛 `Error`，message 直接面向用户（页面原样展示）。
 */
export function parseCron(source, options = {}) {
  const { count = 10, now } = options
  const normalized = String(source ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) throw new Error('表达式不能为空')

  const parts = normalized.split(' ')
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error(`需要 5 段或 6 段，当前是 ${parts.length} 段`)
  }
  const fieldSources = parts.length === 6 ? parts.slice(1) : parts
  if (parts.length === 6) {
    const seconds = expandField(parts[0], { label: '秒', min: 0, max: 59 })
    if (seconds.size !== 1) throw new Error('秒字段目前只支持固定值（如 0）')
  }
  const fields = fieldSources.map((part, index) => expandField(part, FIELD_LIMITS[index]))

  // 星期 0 与 7 都是周日；`*` 会同时展开出两个值，这里并成一个，
  // 否则「每星期」的集合大小对不上，描述会退回成表达式原文。
  const weekdaySet = fields[4]
  if (weekdaySet.has(7)) {
    weekdaySet.delete(7)
    weekdaySet.add(0)
  }

  const runs = nextRuns(fields, count, now)
  if (!runs.length) throw new Error('这个表达式在 5 年内不会触发，检查日/月/星期的组合')

  return {
    fields: FIELD_LIMITS.map((limit, index) => ({
      label: limit.label,
      text: fieldText(fields[index], limit),
    })),
    description: describe(fields, normalized),
    runs,
  }
}
