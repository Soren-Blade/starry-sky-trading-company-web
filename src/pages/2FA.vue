<template>
  <div class="fp-page-2fa">
    <div class="fp-container">
      <h1>2FA验证码工具（实时更新）</h1>

      <div class="field">
        <label class="fp-label" for="secret">请输入双重密钥 (2FA Secret Key, Base32格式)：</label>
        <input id="secret" v-model="secret" placeholder="例如：JBSWY3DPEHPK3PXP" aria-label="2FA 密钥（Base32）" />
        <div class="helper">示例密钥为演示用，点击下方"演示密钥"可复制。</div>
      </div>

      <div class="actions">
        <!--
          这里原先写的是 aria-disabled="!hasSecret" —— 那是**字面量字符串**，
          浏览器会解析为 aria-disabled="true" 且永远为真，反而与真实状态相悖。
          :disabled 已是原生语义，辅助技术可直接识别，无需再写 aria-disabled。
        -->
        <button class="primary" @click="generateNow" :disabled="!hasSecret">获取并复制验证码</button>
        <button @click="copyCode" :disabled="!code">复制当前验证码</button>
      </div>

      <div v-if="!cryptoAvailable" class="fp-note secure-warning" role="alert">
        当前页面不是安全上下文，浏览器已禁用 WebCrypto，无法生成验证码。请通过 HTTPS 或 localhost 访问本页。
      </div>

      <div class="fp-code-area" v-if="hasSecret">
        <div class="fp-card">
          <div class="fp-meta">
            <div class="meta-row">
              <div class="meta-label">当前密钥：</div>
              <div class="meta-value">{{ secret || '未设置' }}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">当前验证码：</div>
              <!--
                这里原先带 aria-live="polite"，但验证码每 30 秒换一次、倒计时每秒都在变，
                会把整个区域变成高频播报源，对屏幕阅读器用户是干扰而非帮助。
                需要播报验证码时由 copyCode() 的 message 提示承担。
              -->
              <div class="meta-value meta-code">{{ code || '—' }}</div>
              <div class="meta-remaining">剩余 {{ countdown }}s</div>
            </div>
          </div>

          <div
            class="fp-progress"
            role="progressbar"
            aria-label="验证码有效期剩余时间"
            :aria-valuenow="countdown"
            aria-valuemin="0"
            aria-valuemax="30"
          >
            <div class="fp-progress-bar" :style="{ width: (countdown/30*100) + '%' }"></div>
          </div>

          <div class="fp-note" v-if="error">{{ error }}</div>
        </div>
      </div>
    </div>
    
    <div class="fp-tutorial">
      <!-- 一个页面只应有一个 h1；这里是次级说明区块，用 h2 -->
      <h2>2FA工具说明</h2>
      <div class="fp-tutorial-body">
        <p>
          <span>演示密钥：</span>
          <button class="key-inline" @click="copyDemoKey" aria-label="复制演示密钥">7J64V3P3E77J3LKNUGSZ5QANTLRLTKVL</button>
          （点击此密钥可复制）
        </p>
        <p>
          <span>新手提示：</span>必须在倒计时结束前输入验证码登录或验证，否则会失效显示错误。测试功能时必须输入正确编码的密钥，不要随便输入1串字符测试获取功能。目前点击获取验证码的按钮后会自动复制验证码到剪切板，直接去粘贴即可。如果想要验证生成的验证码是否正确，点击生成二维码的按钮，使用谷歌验证器APP扫描添加检查。
        </p>
        <!-- <p>
          <span>更多方式：</span>还可以将密钥加在网址（https://2fa.run/2fa/）后面，示例：
          <a class="demo-link" href="https://2fa.run/2fa/7J64V3P3E77J3LKNUGSZ5QANTLRLTKVL" target="_blank" rel="noreferrer">https://2fa.run/2fa/7J64V3P3E77J3LKNUGSZ5QANTLRLTKVL</a>，这样访问也可查询验证码。这样的格式发给新手使用，最合适不过。
        </p> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { message } from 'ant-design-vue'
import { createKeyCache, isCryptoAvailable } from '@/utils/totp.js'
import { computeSecondsRemaining } from '@/utils/totpCountdown.js'
import { copyText } from '@/utils/clipboard.js'

const secret = ref("");
const code = ref("");
const countdown = ref(30);
const error = ref("");

// TOTP 算法在 @/utils/totp.js（可用 RFC 6238 官方向量验证）；
// 这里只保留交互逻辑与密钥缓存。
const keyCache = createKeyCache();
let intervalId = null;
// 已触发的计算序号，用于丢弃过期的异步结果
let computeSeq = 0;

const hasSecret = computed(() => secret.value.trim().length > 0);

/**
 * WebCrypto 的 crypto.subtle 只在安全上下文（HTTPS 或 localhost）可用。
 * 非安全上下文下 importKey 会抛异常，原先会被当成「密钥格式错误」误导用户。
 */
const cryptoAvailable = isCryptoAvailable();

// 说明：Base32 解码、计数器编码、HMAC-SHA1、动态截断与 TOTP 计算
// 已抽到 @/utils/totp.js —— 这段算法有明确标准（RFC 6238 / RFC 4226），
// 必须能用官方测试向量验证；留在本文件里只能靠正则提取函数来测。
// 本文件只保留交互逻辑。

async function updateCode() {
  if (!hasSecret.value) {
    code.value = "";
    return;
  }
  // 序号守卫：倒计时每秒触发一次计算，输入时也会触发，
  // 若较慢的旧计算后返回，会覆盖掉较新的结果。
  const seq = ++computeSeq;
  try {
    error.value = "";
    const { otp } = await keyCache.compute(secret.value);
    if (seq !== computeSeq) return; // 已有更新的计算，丢弃本次结果
    code.value = otp;
  } catch (e) {
    if (seq !== computeSeq) return;
    error.value =
      e && e.name === 'MissingSecureContext'
        ? e.message
        : "无法解析密钥：" + (e.message || e);
    code.value = "";
  }
}

function updateCountdown() {
  // 从时钟派生（见 @/utils/totpCountdown.js），范围 1..30。
  // 不用自减计数：定时器被节流后自减会累积误差。
  countdown.value = computeSecondsRemaining();
}

function handleVisibilityChange() {
  // 只在重新可见时处理（切到后台不需要做事）
  if (document.visibilityState === 'hidden') return;

  updateCountdown();
  // 长时间在后台后当前显示的验证码大概率已过期，因此无条件重新生成一次
  if (hasSecret.value) {
    void updateCode();
  }
}

function startInterval() {
  stopInterval();
  updateCountdown();
  intervalId = setInterval(() => {
    const before = countdown.value;
    updateCountdown();
    // 刚进入新周期时（倒计时回到 30）重新生成验证码。
    // 相比「判断等于 30」，用前后比较可以容忍定时器被节流后一次跳过多个周期。
    if (countdown.value === 30 && before !== 30) {
      void updateCode();
    }
  }, 1000);

  // 页面切到后台时浏览器会节流 setInterval，定时器不再按时触发，
  // 回到前台时可能仍在显示上一个周期的验证码。因此在重新可见时立刻重算一次。
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function stopInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

async function generateNow() {
  await updateCode()
  // 自动复制最新验证码到剪贴板（若生成成功）
  await copyCode()
}

async function copyDemoKey() {
  const demo = '7J64V3P3E77J3LKNUGSZ5QANTLRLTKVL'
  const result = await copyText(demo)
  // 必须按结果提示：早期实现的降级分支既不检查复制是否成功、也不提示用户，
  // 失败时完全静默 —— 用户以为复制成功，粘贴出来却是旧内容。
  if (result.ok) message.success('密钥已复制到剪贴板')
  else message.warning(result.message)
}

async function copyCode() {
  if (!code.value) return
  const result = await copyText(code.value)
  if (result.ok) message.success('验证码已复制到剪贴板')
  else message.warning(result.message)
}

watch(secret, async () => {
  // keyCache 是 createKeyCache() 返回的对象（const），切换密钥时必须调用它的 clear()。
  // 早期版本写的是 `keyCache = null` —— 那是旧实现的遗留（当时 keyCache 是可重新赋值的
  // 模块级变量），改成 const 后会抛 TypeError: Assignment to constant variable，
  // 导致用户一输入密钥页面就崩。
  keyCache.clear();
  await updateCode();
});

onMounted(() => {
  startInterval();
});

onBeforeUnmount(() => {
  stopInterval();
});
</script>

<style scoped>
.fp-page-2fa {
  padding-top: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 18px;
  background: transparent;
}
.fp-container {
  max-width: 640px;
  width: 100%;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 6px 18px rgba(23, 23, 23, 0.06);
}
h1 {
  margin: 0 0 18px 0;
  font-size: 20px;
  font-weight: 700;
  color: #222;
  text-align: center;
}
.fp-row {
  margin: 12px 0;
  display: flex;
  gap: 12px;  
}
.fp-row.actions {
  justify-content: flex-start;
}
.fp-label {
  min-width: 160px;
  color: #444;
  font-weight: 600;
}
input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e6e6e6;
  background: #fff;
  outline: none;
}
input:focus {
  box-shadow: 0 0 0 4px rgba(138, 109, 255, 0.06);
  border-color: #8a6dff;
}
button {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: #f3f4f6;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.primary {
  background: linear-gradient(90deg,#8a6dff,#6f54ff);
  color: white;
}
.fp-tutorial {
  margin-top: 0;
  padding: 16px;
  max-width: 640px;
  width: 100%;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(23, 23, 23, 0.04);
}
.fp-tutorial h2 { margin: 8px 0; font-size:16px }
.fp-tutorial-body p { white-space:pre-line; color:#444; line-height:1.6; margin:8px 0 }
.fp-tutorial-body p span { font-weight:600; color:#222 }
.fp-demo-key { margin-top:10px; display:flex; gap:8px; align-items:center }
.link-like { background:transparent; border:none; color:#6f54ff; cursor:pointer; padding:6px 8px; border-radius:6px }
.link-like:hover { background:rgba(111,84,255,0.06) }
.key-inline { background: linear-gradient(90deg,#fff,#fff); border:1px solid #ededff; color:#6f54ff; padding:4px 8px; border-radius:6px; cursor:pointer }
.key-inline:hover { background:rgba(111,84,255,0.04) }
.demo-link { color:#6f54ff }

/* layout improvements */
.field { display:block; margin-bottom:12px; width: 100%; }
.field .fp-label { display:block; margin-bottom:8px; font-size:14px }
.field input { width:100%; font-size:14px }
.field .helper { margin-top:6px; color:#777; font-size:13px; }
.actions { display:flex; gap:10px; margin-top:10px; justify-content: center;}
.actions button { min-width:160px }
.fp-code-area {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.fp-code {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  border: 1px solid #eef3ff;
  box-shadow: 0 6px 18px rgba(18, 38, 63, 0.06);
}

.fp-code-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 3px;
  padding: 6px 12px;
  border-radius: 8px;
  color: #0b1a2b;
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Noto Mono', monospace;
}

.fp-countdown {
  font-size: 13px;
  color: #6b7280;
  background: #f5f7fb;
  padding: 6px 8px;
  border-radius: 8px;
}

.fp-note {
  margin-top: 8px;
  color: #b00020;
  font-size: 13px;
  text-align: center;
}

.secure-warning {
  margin: 0 0 16px;
  padding: 12px 16px;
  background: var(--color-danger-bg, #fef2f2);
  border: 1px solid #fcc;
  border-radius: var(--radius-sm, 8px);
  text-align: left;
  line-height: 1.6;
}

/* Card-style container inside the main container */
.fp-card {
  width: 100%;
  background: #fff;
  border: 1px solid #e6eef9;
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 2px 6px rgba(11, 26, 43, 0.04);
}

.fp-meta { display: flex; flex-direction: column; gap: 10px }
.meta-row { display:flex; align-items:center; gap:12px }
.meta-label { min-width:90px; color:#344054; font-weight:600 }
.meta-value { color:#0b1a2b; font-weight:700 }
.meta-code { color:#0b8a3a; font-size:20px; letter-spacing:2px }
.meta-remaining { margin-left: auto; color:#6b7280; font-size:13px }

.fp-progress { margin-top:10px; height:8px; background:#f1f5f9; border-radius:8px; overflow:hidden }
.fp-progress-bar { height:100%; background: linear-gradient(90deg,#20c997,#12b886); width:50%; transition:width 0.3s linear }

@media (max-width: 560px) {
  .meta-row { flex-direction:column; align-items:flex-start }
  .meta-remaining { margin-left:0 }
  .fp-card { padding:12px }
}

@media (max-width: 560px) {
  .actions { flex-direction:column }
  .actions button { width:100% }
  .fp-container { padding:16px }
  .fp-code-value { font-size:24px }
}

/* Responsive: stack label and input on small screens */
@media (max-width: 560px) {
  .fp-row {
    flex-direction: column;
    align-items: stretch;
  }
  .fp-label {
    min-width: auto;
    margin-bottom: 6px;
  }
  .fp-row.actions {
    display: flex;
    gap: 8px;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
