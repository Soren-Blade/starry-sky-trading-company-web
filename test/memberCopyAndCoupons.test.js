/**
 * 2.6.0 · 会员中心两处文案与永久会员展示 + 结算页只列可用券
 *
 * 覆盖四件事（都是用户本轮明确提出的）：
 *   1. 永久会员（`expires_at IS NULL` + `is_permanent`）必须显示「永久会员」，不能退化成「——」；
 *   2. 「会员免卡密」的附注固定为「根据会员等级解锁固定数量的卡密工具」；
 *   3. 结算卡片的券下拉只列 `selectable === true` 的券（已用/已过期的不再出现）；
 *   4. 选中的券被过滤掉时自动退回「不使用优惠券」。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

const MEMBER = read('src/pages/Member.vue')
const MEMBER_CONST = read('src/constants/member.js')
const CART = read('src/pages/Cart.vue')
const CHECKOUT_STORE = read('src/stores/checkout.js')

test('永久会员：先判 is_permanent，再回落日期', () => {
  const expiry = MEMBER.slice(
    MEMBER.indexOf('const expiryValue = computed'),
    MEMBER.indexOf('const expiryHint = computed')
  )
  assert.match(expiry, /is_permanent === true/)
  assert.match(expiry, /return '永久会员'/)
  assert.ok(
    expiry.indexOf('is_permanent') < expiry.indexOf('formatDate'),
    'is_permanent 的判断必须在 formatDate 之前，否则 null 会先被格式化成「——」'
  )
})

test('永久会员：到期提示不再说「剩余 N 天」', () => {
  const hint = MEMBER.slice(
    MEMBER.indexOf('const expiryHint = computed'),
    MEMBER.indexOf('const identityName = computed')
  )
  assert.match(hint, /is_permanent === true/)
  assert.match(hint, /一次开通，长期有效/)
})

test('会员免卡密：附注按「本等级已解锁/上限」渲染，而不是固定话术', () => {
  // 2.6.1：用户实测反馈这条附注要显示当前等级的额度（v1 形如「可解锁 1/1 个卡密工具」）
  const block = MEMBER.slice(
    MEMBER.indexOf('function benefitFootText'),
    MEMBER.indexOf('function formatDate')
  )
  assert.match(block, /toolQuota\.value/)
  assert.match(block, /quota\.is_member !== true/)
  assert.match(block, /可解锁 \$\{used\}\/\$\{limit\} 个卡密工具/)
  assert.match(block, /不限次数，已激活 \$\{used\} 个/)
  // 锁定态仍走权益元数据的 desc（这条没变）
  assert.match(MEMBER_CONST, /根据会员等级解锁固定数量的卡密工具/)
})

test('结算卡片：券下拉只用 selectableCoupons', () => {
  const block = CART.slice(
    CART.indexOf('const couponOptions = computed'),
    CART.indexOf('const couponValue = computed')
  )
  assert.match(block, /checkoutStore\.selectableCoupons/)
  assert.ok(
    !/disabled:\s*coupon\.selectable !== true/.test(block),
    '不可用的券不应再作为 disabled 选项列出'
  )
  assert.match(block, /option\.value === current/)

  // 数据源 getter 的口径
  assert.match(
    CHECKOUT_STORE,
    /selectableCoupons: \(state\) => state\.coupons\.filter\(\(row\) => row\.selectable === true\)/
  )
})
