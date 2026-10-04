import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useToastStore, TOAST_DURATION, TOAST_MAX } = await loadAppModule('/stores/toast.js')

/**
 * 提示框 store
 *
 * 覆盖规范里的三条行为约定：3000ms 自动消失、悬停暂停后剩余时间继续、
 * 超出上限时挤掉最早的一条。位置与尺寸属于 CSS（`.u-toast-host` / `.u-toast`），
 * 不在这里测。
 */

async function freshStore() {
  setActivePinia(createPinia())
  const store = useToastStore()
  store.clear()
  return store
}

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

test('规范值：自动消失 3000ms', () => {
  assert.equal(TOAST_DURATION, 3000)
})

test('push：空文案不入队并返回 null', async () => {
  const store = await freshStore()
  assert.equal(store.push(''), null)
  assert.equal(store.push('   '), null)
  assert.equal(store.push(null), null)
  assert.equal(store.items.length, 0)
})

test('push：合法文案入队并返回自增 id，文案做 trim', async () => {
  const store = await freshStore()
  const first = store.push('  已保存  ')
  const second = store.push('已复制')
  assert.ok(Number.isInteger(first))
  assert.equal(second, first + 1)
  assert.equal(store.items[0].text, '已保存')
  assert.equal(store.items.length, 2)
})

test('语义 helper 写入对应 type，未知 type 退回 info', async () => {
  const store = await freshStore()
  store.success('a')
  store.warning('b')
  store.error('c')
  // 注意：一次只放 TOAST_MAX 条，否则会触发「挤掉最早一条」把首条顶掉
  store.push('d', 'not-a-type')
  assert.deepEqual(
    store.items.map((item) => item.type),
    ['success', 'warning', 'error', 'info']
  )

  store.clear()
  store.info('e')
  assert.equal(store.items[0].type, 'info')
})

test('icon：按 type 返回图标，未知 type 退回信息图标', async () => {
  const store = await freshStore()
  assert.notEqual(store.icon('success'), store.icon('error'))
  assert.equal(store.icon('not-a-type'), store.icon('info'))
})

test('超过上限时挤掉最早的一条', async () => {
  const store = await freshStore()
  // 用不自动消失的时长，避免定时器干扰断言
  for (let i = 0; i < TOAST_MAX + 2; i++) store.push(`第 ${i} 条`, 'info', 0)
  assert.equal(store.items.length, TOAST_MAX)
  assert.equal(store.items[0].text, '第 2 条')
  assert.equal(store.items.at(-1).text, `第 ${TOAST_MAX + 1} 条`)
})

test('duration <= 0 时不自动消失', async () => {
  const store = await freshStore()
  store.push('常驻', 'info', 0)
  await sleep(30)
  assert.equal(store.items.length, 1)
})

test('到时间自动消失', async () => {
  const store = await freshStore()
  store.push('短命', 'info', 20)
  assert.equal(store.items.length, 1)
  await sleep(60)
  assert.equal(store.items.length, 0)
})

test('pause 后不消失，resume 后按剩余时间继续', async () => {
  const store = await freshStore()
  const id = store.push('暂停我', 'info', 40)

  store.pause(id)
  await sleep(80)
  assert.equal(store.items.length, 1, '暂停期间不应消失')

  store.resume(id)
  await sleep(60)
  assert.equal(store.items.length, 0, '恢复后应按剩余时间消失')
})

test('剩余的暂停被 resume 时立即消失（剩余时间已耗尽）', async () => {
  const store = await freshStore()
  const id = store.push('快到头了', 'info', 20)
  await sleep(30)
  // 定时器已被触发过；此时再 resume 不应让它复活
  store.resume(id)
  assert.equal(store.items.length, 0)
})

test('dismiss / pause / resume 对未知 id 不抛错', async () => {
  const store = await freshStore()
  assert.doesNotThrow(() => store.dismiss(9999))
  assert.doesNotThrow(() => store.pause(9999))
  assert.doesNotThrow(() => store.resume(9999))
})

test('clear 清空全部（并取消未触发的计时器）', async () => {
  const store = await freshStore()
  store.push('a', 'info', 20)
  store.push('b', 'info', 20)
  store.clear()
  assert.equal(store.items.length, 0)
  await sleep(50)
  assert.equal(store.items.length, 0, '清空后不应有残留定时器把条目带回来')
})
