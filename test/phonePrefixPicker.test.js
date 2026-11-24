/**
 * 手机号地区代码选择器（PhonePrefixPicker）用例
 *
 * 分两层：
 *   1. 纯函数：搜索（中文名 / 英文名 / ISO / 区号）、只读分组格式、可保存地区判断；
 *   2. 源码契约：面板必须 teleport 出弹层（否则被 `.profile-editor` 的 overflow 裁切）、
 *      搜索框与 listbox 语义、点击面板内部不能被判成「点外面」。
 *
 * 交互（真实的展开 / 键盘 / 焦点）由 BrowserSkill 在浏览器里验收，这里不做 jsdom 模拟。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_DIAL,
  PHONE_COUNTRIES,
  countryName,
  filterPhoneCountries,
  formatPhoneDisplay,
  isSupportedDial,
} from '../src/constants/phoneCountries.js'

const PICKER_SOURCE = readFileSync(
  new URL('../src/components/PhonePrefixPicker.vue', import.meta.url),
  'utf8'
)

test('地区数据：默认 +86，名称有中英两份，只有大陆可保存', () => {
  assert.equal(DEFAULT_DIAL, '+86')
  const cn = PHONE_COUNTRIES.find((country) => country.iso === 'CN')
  assert.ok(cn)
  assert.equal(countryName(cn, 'zh-CN'), '中国大陆')
  assert.equal(countryName(cn, 'en-US'), 'Mainland China')
  assert.equal(isSupportedDial('+86'), true)
  assert.equal(isSupportedDial('+852'), false)

  // 每条都必须有双语名称，否则切换英文会出现空白选项
  for (const country of PHONE_COUNTRIES) {
    assert.ok(country.zh && country.en, `${country.iso} 缺少双语名称`)
  }
})

test('搜索：区号、ISO、中文名、英文名都能命中；空查询返回全部', () => {
  assert.equal(filterPhoneCountries('', 'zh-CN').length, PHONE_COUNTRIES.length)
  assert.deepEqual(
    filterPhoneCountries('86', 'zh-CN').map((country) => country.iso),
    ['CN']
  )
  assert.deepEqual(
    filterPhoneCountries('+852', 'zh-CN').map((country) => country.iso),
    ['HK']
  )
  assert.ok(filterPhoneCountries('CN', 'en-US').some((country) => country.iso === 'CN'))
  assert.ok(filterPhoneCountries('香港', 'zh-CN').some((country) => country.iso === 'HK'))
  assert.ok(filterPhoneCountries('China', 'en-US').some((country) => country.iso === 'CN'))
  assert.equal(filterPhoneCountries('不存在的地方', 'zh-CN').length, 0)
})

test('只读展示：大陆 11 位按 3-4-4 分组，带区号；无号码返回空串', () => {
  assert.equal(formatPhoneDisplay('13800000000', '+86'), '+86 138 0000 0000')
  assert.equal(formatPhoneDisplay('', '+86'), '')
  assert.equal(formatPhoneDisplay(null), '')
  assert.equal(formatPhoneDisplay('91234567', '+852'), '+852 912 345 67')
})

test('源码：面板 teleport 到 body、搜索 + listbox 语义齐全，点击面板内部不算外部', () => {
  assert.match(PICKER_SOURCE, /<Teleport to="body">/)
  assert.match(PICKER_SOURCE, /role="dialog"/)
  assert.match(PICKER_SOURCE, /role="listbox"/)
  assert.match(PICKER_SOURCE, /role="option"/)
  assert.match(PICKER_SOURCE, /v-model="query"/)
  assert.match(PICKER_SOURCE, /:aria-activedescendant="activeId"/)
  assert.match(PICKER_SOURCE, /useClickOutside\([\s\S]{0,120}alsoInside: \[panelRef\]/)
  assert.match(PICKER_SOURCE, /position: fixed/)
  assert.match(PICKER_SOURCE, /z-index: var\(--ec-z-tooltip, 600\)/)
  assert.match(PICKER_SOURCE, /filterPhoneCountries\(query\.value, locale\.value\)/)
  // 区号自己不进入表单：值只通过 update:modelValue 交给外层 phoneDial
  assert.match(PICKER_SOURCE, /emit\('update:modelValue', country\.dial\)/)
})

test('源码：不可保存的地区置灰且标注「即将支持」，点击不改变当前值', () => {
  assert.match(PICKER_SOURCE, /is-disabled/)
  assert.match(PICKER_SOURCE, /aria-disabled/)
  assert.match(PICKER_SOURCE, /phoneCountryComingSoon/)
  assert.match(PICKER_SOURCE, /if \(!country\?\.supported\) return/)
})
