/**
 * 手机号地区代码（国家 / 地区）
 *
 * 只做展示与选择，不进入接口数据：接口仍然只收 11 位大陆手机号（`form.phone`）。
 * `supported` 为 false 的地区先列出来，让用户知道「这里能选」，但保存仍只支持
 * 中国大陆 —— 后端 `normalizeProfilePatch()` 的校验与登录凭据语义都还是 CN-only。
 *
 * 名称走「zh / en 双语字段 + 当前 locale」而不是 i18n 词条：国家列表是数据，
 * 与页面文案不同，放在 locale 文件里会让 28 个国家的键散落在两个大文件中。
 */
export const DEFAULT_DIAL = '+86'

export const PHONE_COUNTRIES = [
  { iso: 'CN', dial: '+86', zh: '中国大陆', en: 'Mainland China', supported: true },
  { iso: 'HK', dial: '+852', zh: '中国香港', en: 'Hong Kong' },
  { iso: 'MO', dial: '+853', zh: '中国澳门', en: 'Macao' },
  { iso: 'TW', dial: '+886', zh: '中国台湾', en: 'Taiwan' },
  { iso: 'SG', dial: '+65', zh: '新加坡', en: 'Singapore' },
  { iso: 'MY', dial: '+60', zh: '马来西亚', en: 'Malaysia' },
  { iso: 'JP', dial: '+81', zh: '日本', en: 'Japan' },
  { iso: 'KR', dial: '+82', zh: '韩国', en: 'South Korea' },
  { iso: 'US', dial: '+1', zh: '美国', en: 'United States' },
  { iso: 'CA', dial: '+1', zh: '加拿大', en: 'Canada' },
  { iso: 'GB', dial: '+44', zh: '英国', en: 'United Kingdom' },
  { iso: 'AU', dial: '+61', zh: '澳大利亚', en: 'Australia' },
  { iso: 'NZ', dial: '+64', zh: '新西兰', en: 'New Zealand' },
  { iso: 'FR', dial: '+33', zh: '法国', en: 'France' },
  { iso: 'DE', dial: '+49', zh: '德国', en: 'Germany' },
  { iso: 'IT', dial: '+39', zh: '意大利', en: 'Italy' },
  { iso: 'ES', dial: '+34', zh: '西班牙', en: 'Spain' },
  { iso: 'NL', dial: '+31', zh: '荷兰', en: 'Netherlands' },
  { iso: 'CH', dial: '+41', zh: '瑞士', en: 'Switzerland' },
  { iso: 'SE', dial: '+46', zh: '瑞典', en: 'Sweden' },
  { iso: 'RU', dial: '+7', zh: '俄罗斯', en: 'Russia' },
  { iso: 'IN', dial: '+91', zh: '印度', en: 'India' },
  { iso: 'TH', dial: '+66', zh: '泰国', en: 'Thailand' },
  { iso: 'VN', dial: '+84', zh: '越南', en: 'Vietnam' },
  { iso: 'ID', dial: '+62', zh: '印度尼西亚', en: 'Indonesia' },
  { iso: 'PH', dial: '+63', zh: '菲律宾', en: 'Philippines' },
  { iso: 'AE', dial: '+971', zh: '阿联酋', en: 'United Arab Emirates' },
  { iso: 'BR', dial: '+55', zh: '巴西', en: 'Brazil' },
]

/** 地区名按当前语言取；未知 locale 回落到中文，避免出现 undefined */
export function countryName(country, locale) {
  if (!country) return ''
  return locale === 'en-US' ? country.en : country.zh
}

/**
 * 搜索：支持地区名（中 / 英）、ISO 代码与区号。
 * 输入 `+86`、`86`、`中国`、`China`、`CN` 都应命中中国大陆。
 */
export function filterPhoneCountries(query, locale) {
  const raw = String(query ?? '').trim()
  if (!raw) return PHONE_COUNTRIES
  const lower = raw.toLowerCase()
  const digits = raw.replace(/\D/g, '')
  return PHONE_COUNTRIES.filter((country) => {
    const name = countryName(country, locale).toLowerCase()
    const dialDigits = country.dial.replace(/\D/g, '')
    return (
      name.includes(lower) ||
      country.iso.toLowerCase().includes(lower) ||
      // 区号按前缀匹配：输入 86 只命中 +86，不会把 +886 里的 86 也算进来
      (digits.length > 0 && dialDigits.startsWith(digits))
    )
  })
}

/** 判断某个区号当前能否保存（后端只支持大陆号码） */
export function isSupportedDial(dial) {
  return PHONE_COUNTRIES.some((country) => country.dial === dial && country.supported)
}

/**
 * 只读展示：区号 + 分组号码。
 * 大陆 11 位按 3-4-4 分组（`+86 138 0000 0000`），其他地区按 3 位一组兜底。
 * 只影响展示，`form.phone` 仍然是纯数字。
 */
export function formatPhoneDisplay(phone, dial = DEFAULT_DIAL) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (dial === DEFAULT_DIAL && digits.length === 11) {
    return `${dial} ${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  }
  return `${dial} ${digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()}`
}
