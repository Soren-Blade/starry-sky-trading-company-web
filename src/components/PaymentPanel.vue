<script setup>
/**
 * 支付面板（易支付，3.3.0）
 *
 * 只在「订单待支付」时出现。三个刻意的行为：
 *
 * 1. **不自动建支付单**：用户点「立即支付」才 `createPayment`。下单即建单会让
 *    每一次「打开详情页看看」都在网关上留下一次尝试记录。
 * 2. **轮询有节流与停表**：2.5 秒一次，页面隐藏时暂停、重新可见立刻补查一次；
 *    401 立刻停表（会话过期还继续轮询只会连弹错误），组件卸载必须清理定时器。
 * 3. **绝不套 shortCache**（`utils/shortCache.js` 默认 8 秒 TTL）：那会让
 *    「已付款」最多晚 8 秒才反映，用户会以为没成功又付一次。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'

import AppIcon from '@/components/AppIcon.vue'
import paymentApi from '@/api/ask/payment.js'
import { notify } from '@/hooks/useToast/index.js'
import { formatUtils } from '@/utils/index.js'

const props = defineProps({
  orderNo: { type: String, required: true },
  amountFen: { type: Number, default: 0 },
  amountYuan: { type: String, default: '' },
  payMethods: { type: Array, default: () => ['alipay', 'wxpay'] },
})

const emit = defineEmits(['paid'])

const POLL_INTERVAL_MS = 2500
const PAY_TYPE_LABELS = {
  alipay: { label: '支付宝' },
  wxpay: { label: '微信支付' },
}

const payType = ref(props.payMethods[0] || 'alipay')
const creating = ref(false)
const payload = ref(null)
const qrDataUrl = ref('')
const errorText = ref('')
const paid = ref(false)
const polling = ref(false)

let timer = null

const ua = typeof navigator === 'undefined' ? '' : String(navigator.userAgent || '')
const isWechat = /MicroMessenger/i.test(ua)
const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)

/** 金额展示用服务端的 fen，不自己从订单算（口径只有服务端一处） */
const amountText = computed(() =>
  props.amountYuan || formatUtils.formatPrice(props.amountFen / 100, { prefix: '', decimals: 2 })
)

const methods = computed(() =>
  (props.payMethods || []).map((value) => ({
    value,
    label: (PAY_TYPE_LABELS[value] || { label: value }).label,
  }))
)

const stopPolling = () => {
  polling.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const refreshStatus = async () => {
  try {
    const res = await paymentApi.getPaymentStatus({ order_no: props.orderNo })
    const status = res && res.data && res.data.payment ? res.data.payment.status : ''
    if (status === 'paid' || status === 'refunded') {
      paid.value = true
      stopPolling()
      if (status === 'paid') emit('paid')
    }
  } catch (error) {
    // 401 = 会话过期：停表，别把用户刷成一片红字
    if (error && error.status === 401) stopPolling()
  }
}

const startPolling = () => {
  if (polling.value) return
  polling.value = true
  timer = setInterval(() => {
    // 后台标签页里的 setInterval 会被浏览器降频/暂停，回到前台立刻补一次由下面的监听负责
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    refreshStatus()
  }, POLL_INTERVAL_MS)
}

const handleVisibility = () => {
  if (typeof document === 'undefined' || !polling.value) return
  if (document.visibilityState === 'visible') refreshStatus()
}

const applyPayload = async (data) => {
  payload.value = data
  const url = data.qrcode || data.pay_url || ''
  if (url) {
    try {
      // 生成动作必须在浏览器侧（setup 顶层同步调用会在 SSR 阶段炸）
      // 白底烘进 PNG：二维码的对比度是功能需求，不能交给主题色（暗色主题下深底深码扫不出来）
      qrDataUrl.value = await QRCode.toDataURL(url, {
        width: 220,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    } catch {
      qrDataUrl.value = ''
    }
  }
  startPolling()
}

const handlePay = async () => {
  if (creating.value) return
  creating.value = true
  errorText.value = ''
  try {
    const res = await paymentApi.createPayment({ order_no: props.orderNo, pay_type: payType.value })
    const data = res && res.data ? res.data : null
    if (!data) throw new Error('支付单创建失败')

    if (isMobile && data.pay_url) {
      // 手机上直接跳收银台，不展示二维码（扫自己的屏幕没有意义）
      window.location.href = data.pay_url
      return
    }
    await applyPayload(data)
    notify('支付单已创建，请扫码或点击下方链接完成支付', 'info')
  } catch (error) {
    errorText.value = (error && error.message) || '支付单创建失败，请稍后重试'
  } finally {
    creating.value = false
  }
}

const openPayUrl = () => {
  if (!payload.value || !payload.value.pay_url) return
  // 同窗口跳转：支付完成后网关会 302 回 /payApi/return → 订单页
  window.location.href = payload.value.pay_url
}

const openUrlScheme = () => {
  if (!payload.value || !payload.value.urlscheme) return
  window.location.href = payload.value.urlscheme
}

watch(
  () => props.orderNo,
  () => {
    stopPolling()
    payload.value = null
    qrDataUrl.value = ''
    paid.value = false
  }
)

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibility)
  // 进来先查一次：可能用户已经在上一页付过款
  refreshStatus()
})

onBeforeUnmount(() => {
  stopPolling()
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <section class="pay-panel ui-card">
    <header class="pay-panel-head">
      <h3 class="pay-panel-title">在线支付</h3>
      <span class="pay-panel-amount">{{ amountText }}</span>
    </header>

    <p v-if="paid" class="pay-panel-done">
      <AppIcon name="check-circle" :size="18" />
      已收到付款，等待交付后即可确认完成。
    </p>

    <template v-else>
      <div v-if="!payload" class="pay-panel-body">
        <p class="pay-panel-tip">选择支付方式后生成支付单（30 分钟内有效）。</p>
        <div class="pay-panel-methods">
          <button
            v-for="item in methods"
            :key="item.value"
            type="button"
            class="pay-panel-method"
            :class="{ 'pay-panel-method--active': payType === item.value }"
            @click="payType = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <p v-if="isWechat" class="pay-panel-warn">
          微信里无法直接打开支付宝收银台，请选择微信支付或换浏览器打开。
        </p>
        <button type="button" class="u-btn-primary pay-panel-pay" :disabled="creating" @click="handlePay">
          {{ creating ? '正在创建支付单…' : '立即支付' }}
        </button>
        <p v-if="errorText" class="pay-panel-error">{{ errorText }}</p>
      </div>

      <div v-else class="pay-panel-body pay-panel-body--qr">
        <div v-if="qrDataUrl" class="pay-panel-qr">
          <img :src="qrDataUrl" alt="支付二维码" width="220" height="220" />
          <p class="pay-panel-tip">用{{ payType === 'wxpay' ? '微信' : '支付宝' }}扫一扫完成支付</p>
        </div>
        <p v-else class="pay-panel-tip">支付单已创建，请点击下方按钮打开收银台。</p>
        <div class="pay-panel-actions">
          <button v-if="payload.pay_url" type="button" class="u-btn-primary" @click="openPayUrl">
            打开收银台
          </button>
          <button v-if="payload.urlscheme" type="button" class="u-btn-secondary" @click="openUrlScheme">
            打开 App 支付
          </button>
        </div>
        <p class="pay-panel-polling">
          <AppIcon name="refresh-cw" :size="14" />
          正在等待支付结果，付款成功后本页会自动更新。
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.pay-panel {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 3);
}

.pay-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2);
}

.pay-panel-title {
  margin: 0;
  font-size: var(--fs-h3);
  color: var(--text-primary);
}

.pay-panel-amount {
  font-size: var(--fs-price);
  color: var(--accent);
  font-weight: 600;
}

.pay-panel-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2);
}

.pay-panel-body--qr {
  align-items: center;
  text-align: center;
}

.pay-panel-tip,
.pay-panel-polling,
.pay-panel-warn,
.pay-panel-error {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
}

.pay-panel-error {
  color: var(--danger);
}

.pay-panel-warn {
  color: var(--warning);
}

.pay-panel-methods {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
}

.pay-panel-method {
  padding: calc(var(--space-unit) * 1) calc(var(--space-unit) * 2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.pay-panel-method--active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.pay-panel-pay {
  align-self: flex-start;
}

.pay-panel-qr img {
  display: block;
  border-radius: var(--radius-input);
  background: none;
  padding: calc(var(--space-unit) * 1);
}

.pay-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 1.5);
  justify-content: center;
}

.pay-panel-done {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1);
  color: var(--success);
  font-size: var(--fs-body);
}

@media (max-width: 575px) {
  .pay-panel {
    padding: calc(var(--space-unit) * 2);
  }

  .pay-panel-pay,
  .pay-panel-actions > * {
    width: 100%;
  }
}
</style>
