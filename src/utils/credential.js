/**
 * 激活凭证识别：一段输入到底是「卡密」还是「用户 UID」。
 *
 * 为什么需要它：合并后的激活面板只有一个输入框（需求 4），用户既可能粘贴
 * 卡密，也可能粘贴自己的 UID 走会员免卡密通道。类型判错会直接导致请求打到
 * 错误端点（拿 UID 去查卡密 → 404；拿卡密去免卡密激活 → 格式错误），
 * 所以判定必须是**纯函数**，且能单测。
 *
 * 真实结构（已核对库函数与生成 SQL，不要凭印象改）：
 *   - 卡密：`sstc.generate_cards` 生成 `XXXX-XXXX-XXXX`，
 *     三段各 4 位十六进制，例如 `8FBC-427D-D3D9`
 *     （见 docs/migrations/2026-10-04-fix-generate-cards-randomness.sql）。
 *   - UID：标准 UUID v4，5 段 8-4-4-4-12，
 *     例如 `c2b248f1-0505-40d4-9a96-09a445e0a900`。
 *
 * 兜底：历史批次里存在不符合标准格式的卡号（如 `STAR2026ABCDEF` 这类无分隔的
 * 字母数字串）。这类输入也要按卡密去查 —— 格式不符只是「不像新卡」，
 * 不代表「不是卡」，直接拒绝反而误伤老用户。
 */

/** 识别结果。字符串常量便于在模板/日志里直接比较，也避免各处拼写不一致 */
export const CREDENTIAL_TYPES = {
  /** 用户 UID（标准 UUID）→ 走会员免卡密通道 */
  UID: 'uid',
  /** 卡密 → 走 /kamiApi/lookupCard + /activateCard */
  CARD: 'card',
  /** 两者都不像 → 不发任何请求 */
  UNKNOWN: 'unknown',
}

/** 标准 UUID：8-4-4-4-12，大小写不敏感（后端 UUID 列本身不区分大小写） */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 标准卡密：三段各 4 位十六进制 */
const CARD_RE = /^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/i

/** 同一张卡的「去分隔符」写法（12 位十六进制），粘贴时常见 */
const CARD_COMPACT_RE = /^[0-9a-f]{12}$/i

/**
 * 历史批次兜底：至少 8 位的字母数字串，允许内嵌连字符，且至少含一位数字。
 *
 * 为什么要求含数字：纯字母串更可能是用户名/随手乱敲，按卡密去查只会白跑一次
 * 请求；而历史卡号都带年份或序号（`STAR2026…`），这条限制不会误伤。
 */
const LEGACY_CARD_RE = /^(?=.*\d)[0-9a-z][0-9a-z-]{7,}$/i

/**
 * 「UUID 形状」：五段、四根连字符。
 *
 * 用来把「一段没通过严格校验的 UID」排除在历史卡号兜底之外 —— 用户把 UID 打错
 * 一个字符时，宽松规则会把它当历史卡号去查，结果拿到一个 404 的静默失败，
 * 用户只会看到「不是会员」之类的误导文案。这种情况宁可判 unknown，让按钮禁用
 * 并把「请输入卡密或用户 UID」摆在眼前。
 */
const UUID_SHAPED_RE = /^[^-]+(-[^-]+){4}$/

/**
 * 判定输入属于哪种凭证。
 *
 * 顺序有意义：UUID 也满足「字母数字串」的宽松规则，必须先判；
 * 标准卡密与紧凑卡密都先于历史兜底，避免把标准格式交给宽松规则。
 *
 * @param {unknown} value 输入框原值（允许首尾空白）
 * @returns {'uid' | 'card' | 'unknown'}
 */
export function detectCredentialType(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return CREDENTIAL_TYPES.UNKNOWN
  if (UUID_RE.test(raw)) return CREDENTIAL_TYPES.UID
  if (CARD_RE.test(raw)) return CREDENTIAL_TYPES.CARD
  if (CARD_COMPACT_RE.test(raw)) return CREDENTIAL_TYPES.CARD
  // 打错的 UID 不能被「历史卡号」兜底接走（否则会静默 404）
  if (UUID_SHAPED_RE.test(raw)) return CREDENTIAL_TYPES.UNKNOWN
  if (LEGACY_CARD_RE.test(raw)) return CREDENTIAL_TYPES.CARD
  return CREDENTIAL_TYPES.UNKNOWN
}

/**
 * 规范化卡密：去空白、转大写，并把「12 位无分隔」补回标准三段式。
 *
 * 服务端按 `card_no` 精确匹配，因此手输/复制丢了连字符时，补回去才能查到；
 * 其余形态原样大写（历史卡号在库里就是大写）。
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCardNo(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  if (CARD_COMPACT_RE.test(raw)) {
    const upper = raw.toUpperCase()
    return `${upper.slice(0, 4)}-${upper.slice(4, 8)}-${upper.slice(8)}`
  }
  return raw.toUpperCase()
}
