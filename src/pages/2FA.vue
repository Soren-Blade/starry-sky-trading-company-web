<template>
  <div class="fp-page-2fa">
    <div class="fp-container">
      <h1>2FA验证码工具（实时更新）</h1>

      <div class="field">
        <label class="fp-label" for="secret">请输入双重密钥 (2FA Secret Key, Base32格式)：</label>
        <input
          id="secret"
          v-model="secret"
          class="u-input"
          placeholder="例如：JBSWY3DPEHPK3PXP"
          aria-label="2FA 密钥（Base32）"
        />
        <div class="helper">示例密钥为演示用，点击下方"演示密钥"可复制。</div>
      </div>

      <div class="actions">
        <!--
          这里原先写的是 aria-disabled="!hasSecret" —— 那是**字面量字符串**，
          浏览器会解析为 aria-disabled="true" 且永远为真，反而与真实状态相悖。
          :disabled 已是原生语义，辅助技术可直接识别，无需再写 aria-disabled。
        -->
        <button class="u-btn-primary" @click="generateNow" :disabled="!hasSecret">获取并复制验证码</button>
        <button class="u-btn-secondary" @click="copyCode" :disabled="!code">复制当前验证码</button>
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
                需要播报验证码时由 copyCode() 的 notify 提示承担。
              -->
              <div class="meta-value meta-code">{{ code || '—' }}</div>
              <div class="meta-remaining">剩余 {{ countdown }}s</div>
            </div>
          </div>

          <!-- 进度条：高度 / 圆角 / 轨道色 / 过渡全部来自 .u-progress 与 --progress-* -->
          <div
            class="u-progress fp-progress"
            role="progressbar"
            aria-label="验证码有效期剩余时间"
            :aria-valuenow="countdown"
            aria-valuemin="0"
            aria-valuemax="30"
          >
            <div class="u-progress-bar" :style="{ width: (countdown/30*100) + '%' }"></div>
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
          <button class="u-btn-secondary key-inline" @click="copyDemoKey" aria-label="复制演示密钥">7J64V3P3E77J3LKNUGSZ5QANTLRLTKVL</button>
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
import { notify } from '@/hooks/useToast/index.js'
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
  if (result.ok) notify.success('密钥已复制到剪贴板')
  else notify.warning(result.message)
}

async function copyCode() {
  if (!code.value) return
  const result = await copyText(code.value)
  if (result.ok) notify.success('验证码已复制到剪贴板')
  else notify.warning(result.message)
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
  /* 顶栏占位由 App.vue 的 .main-content 统一负责，页面不再声明顶部内边距 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: calc(var(--space-unit) * 2.25);
  padding: var(--section-gap) var(--container-padding);
  background: transparent;
}

/* 两张卡片同宽同表面：窄内容列取 --container-narrow 的 64%，与改造前的 640px 一致。
   不写成 calc(var(--space-unit) * 80)：4px 基础单位的主题下会缩到 320px 挤坏表单。 */
.fp-container,
.fp-tutorial {
  width: 100%;
  max-width: calc(var(--container-narrow) * 0.64);
  padding: var(--card-padding-lg);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

h1 {
  margin: 0 0 calc(var(--space-unit) * 2.25);
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
  text-align: center;
}

.field {
  display: block;
  width: 100%;
  margin-bottom: calc(var(--space-unit) * 1.5);
}

.field .fp-label {
  display: block;
  margin-bottom: var(--space-unit);
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
}

/* 输入框本体视觉（底色 / 边框 / 圆角 / 聚焦环）来自 .u-input */

.field .helper {
  margin-top: calc(var(--space-unit) * 0.75);
  color: var(--text-muted);
  font-size: var(--fs-label);
}

.actions {
  display: flex;
  gap: calc(var(--space-unit) * 1.25);
  margin-top: calc(var(--space-unit) * 1.25);
  justify-content: center;
}

/* 两个按钮等宽：视觉重量对称，窄屏换行后也不参差 */
.actions .u-btn-primary,
.actions .u-btn-secondary {
  min-width: calc(var(--space-unit) * 20);
}

.fp-code-area {
  margin-top: calc(var(--space-unit) * 2.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: var(--space-unit);
}

/* Card-style container inside the main container */
.fp-card {
  width: 100%;
  padding: calc(var(--space-unit) * 1.75) calc(var(--space-unit) * 2);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-card);
}

.fp-meta {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.25);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

.meta-label {
  min-width: calc(var(--space-unit) * 11.25);
  color: var(--text-secondary);
  font-weight: var(--fw-label);
}

.meta-value {
  color: var(--text-primary);
  font-weight: var(--fw-price);
}

/* 验证码是这一页的主角：等宽字体 + 价格档字号 + 主题强调色 */
.meta-code {
  font-family: var(--font-mono);
  font-size: var(--fs-price);
  font-weight: var(--fw-price);
  letter-spacing: var(--tracking-label);
  color: var(--accent);
}

.meta-remaining {
  margin-left: auto;
  color: var(--text-muted);
  font-size: var(--fs-label);
}

/* 进度条本体交给 .u-progress / .u-progress-bar（高度、圆角、轨道色、过渡由
   --progress-* 与 --transition-progress 决定），这里只补它与上方 meta 区的间距 */
.fp-progress {
  margin-top: calc(var(--space-unit) * 1.25);
}

/* 错误提示：先声明 .fp-note，再声明 .secure-warning，
   两者优先级相同，靠后的一条在同时命中时生效 */
.fp-note {
  margin-top: var(--space-unit);
  color: var(--danger);
  font-size: var(--fs-label);
  text-align: center;
}

.secure-warning {
  margin: 0 0 calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2);
  color: var(--danger);
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  text-align: left;
  background: var(--danger-bg);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--radius-panel);
}

.fp-tutorial h2 {
  margin: var(--space-unit) 0;
  font-family: var(--font-display);
  font-size: var(--fs-body);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.fp-tutorial-body p {
  white-space: pre-line;
  color: var(--text-secondary);
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  margin: var(--space-unit) 0;
}

.fp-tutorial-body p span {
  font-weight: var(--fw-label);
  color: var(--text-primary);
}

/* 演示密钥：按钮外观（底色 / 描边 / 圆角 / 悬停）来自 .u-btn-secondary，
   这里只把它换成等宽字体，读起来才像一串密钥。
   密钥是 32 位不可断行的长串，窄屏下必须允许在按钮内换行，
   否则 neo-brutalism 的内边距会把卡片撑破；高度仍以 --btn-height 为下限。 */
.key-inline {
  height: auto;
  min-height: var(--btn-height);
  font-family: var(--font-mono);
  white-space: normal;
  overflow-wrap: anywhere;
}

/*
 * 移动端缩放（规范第十四节）：区块间距 ×0.6、内边距 ×0.8、正文字号 ×0.95。
 * 标题字号不乘 --mobile-title-scale：本页 h1 的桌面档只有 --fs-h3（紧凑工具页），
 * ×0.7 后会小于同页 h2（--fs-body），层级反而倒挂。
 */
@media (max-width: 767px) {
  .fp-page-2fa {
    padding: calc(var(--section-gap) * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .fp-container,
  .fp-tutorial {
    padding: calc(var(--card-padding-lg) * var(--mobile-padding-scale));
  }

  .fp-card {
    padding: calc(var(--space-unit) * 1.75 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2 * var(--mobile-padding-scale));
  }

  /* 控件高度在移动端 ×0.9，换行型按钮的高度下限同样跟着收 */
  .key-inline {
    min-height: calc(var(--btn-height) * var(--mobile-control-scale));
  }

  .fp-tutorial-body p {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }
}

/*
 * 小屏适配（统一断点 575，与 global.css 末尾的断点体系一致）。
 *
 * 原来三段重复的小屏媒体查询已合并到这一处；其中「标签与输入框竖排」
 * 的意图由 `.fp-label` 的 display:block + 输入框 width:100% 直接满足，
 * 「按钮横排并换行」由 .actions 的默认横排 + 这里的 flex-wrap 满足。
 */
@media (max-width: 575px) {
  .meta-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .meta-remaining {
    margin-left: 0;
  }

  .actions {
    flex-wrap: wrap;
  }

  .actions .u-btn-primary,
  .actions .u-btn-secondary {
    width: 100%;
  }
}
</style>
