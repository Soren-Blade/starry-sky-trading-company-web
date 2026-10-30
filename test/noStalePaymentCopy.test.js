import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

/**
 * 支付相关文案与页面的守卫（3.3.0 接入易支付后新增）。
 *
 * 接入支付这件事最容易留下的不是代码 bug，而是**说反话的文案**：
 * 通道接上了，页面上还写着「本平台支付通道尚未接入」、「会员开通后不支持自助退款」。
 * 这类过期文案不会报错，也不会有任何测试红，只会让用户怀疑自己的钱去哪了。
 */

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(WEB_ROOT, 'src')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const sources = walk(SRC).filter((file) => /\.(js|vue)$/.test(file))
const rel = (file) => relative(WEB_ROOT, file).replace(/\\/g, '/')
const read = (file) => readFileSync(file, 'utf8')

/** 只留代码，丢掉注释：注释里提到旧文案是合理的（解释历史），不该被当成缺陷 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

test('离线支付文案只在 constants/content.js 里出现一次（组件不得各抄一份）', () => {
  const phrase = '支付通道尚未接入'
  const hits = sources.filter((file) => stripComments(read(file)).includes(phrase)).map(rel)

  assert.deepEqual(
    hits,
    ['src/constants/content.js'],
    `这句文案是单一事实，只能在一处定义；改文案时否则会漏改：${hits.join(', ')}`
  )
})

test('已接入支付后不得再声称「不支持自助退款」', () => {
  const offenders = sources
    .filter((file) => stripComments(read(file)).includes('不支持自助退款'))
    .map(rel)

  assert.deepEqual(
    offenders,
    [],
    '退款链路已实现（管理端发起、成功后撤销会员开卡），条款必须同步改写，否则与对不上实现的条款同样有害'
  )
})

test('订单页的两个动作按钮由状态机判定，不再写死 pending', () => {
  for (const file of ['src/pages/Orders.vue', 'src/pages/OrderDetail.vue']) {
    const text = stripComments(read(join(WEB_ROOT, file)))

    assert.ok(text.includes('canCancel('), `${file} 的「取消」必须走 canCancel`)
    assert.ok(text.includes('canConfirmComplete('), `${file} 的「确认完成」必须走 canConfirmComplete`)
    assert.ok(
      !/v-if="order\.status === 'pending'"\s+type="button"[\s\S]{0,80}orderCancel/.test(text),
      `${file} 还把「取消」按钮绑在 pending 上：接入支付后 status 变 paid，按钮会一起消失`
    )
  }
})

test('支付面板只在「待付款 + 通道已配置」时出现，且不被缓存包装', () => {
  const detail = stripComments(read(join(WEB_ROOT, 'src/pages/OrderDetail.vue')))

  assert.ok(
    detail.includes("order.status === 'pending' && payEnabled"),
    '支付面板的显示条件必须同时包含状态与通道开关，否则未配置通道的部署会渲染出一个点不动的二维码位'
  )

  const api = stripComments(read(join(WEB_ROOT, 'src/api/ask/payment.js')))
  // 路径写成 `${baseURL}/create` 的形式：api-contract 守卫会把 baseURL 代进去再比对后端路由
  assert.ok(api.includes("'/payApi'"), '支付接口的前缀必须是 /payApi')
  assert.ok(api.includes('/create'), '建支付单必须走 /payApi/create')
  assert.ok(api.includes('/status'), '轮询必须走 /payApi/status')

  const panel = stripComments(read(join(WEB_ROOT, 'src/components/PaymentPanel.vue')))
  assert.ok(
    !panel.includes('shortCache'),
    '轮询绝不能套 8 秒缓存：那会让「已付钱」最多 8 秒后才反映到界面'
  )
  assert.ok(panel.includes('401'), '轮询遇到 401 必须停表（会话过期时继续打只会连着弹提示）')
})

test('状态键集合与后端 ORDER_STATUSES 逐项一致（前端不发明状态）', () => {
  const source = read(join(WEB_ROOT, 'src/constants/order.js'))
  const block = source.match(/ORDER_STATUSES\s*=\s*\[([\s\S]*?)\]/)
  assert.ok(block, '找不到 ORDER_STATUSES 定义')

  const keys = [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()
  assert.deepEqual(keys, ['cancelled', 'completed', 'paid', 'pending', 'refunded'])
})
