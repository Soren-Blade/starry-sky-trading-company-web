<template>
  <div class="u-modal-overlay" @click.self="$emit('close')">
    <div
      ref="modalRef"
      class="u-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <h2 id="login-modal-title" class="visually-hidden">
        {{ activeTab === 'login' ? '登录' : '注册' }}
      </h2>

      <button class="u-modal-close" @click="close" aria-label="关闭弹窗">
        ✕
      </button>

      <!-- Tabs -->
      <div class="modal-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'login' }"
          @click="switchTab('login')"
        >
          登录
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'register' }"
          @click="switchTab('register')"
        >
          注册
        </button>
      </div>

      <!-- Tab Content -->
      <div class="u-modal-body tab-content">
        <!-- Login Form -->
        <form v-if="activeTab === 'login'" class="form login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-username">用户名</label>
            <input
              id="login-username"
              v-model="loginForm.username"
              class="u-input"
              type="text"
              placeholder="请输入用户名/邮箱/手机号"
              required
            />
          </div>

          <div class="form-group">
            <label for="login-password">密码</label>
            <input
              id="login-password"
              v-model="loginForm.password"
              class="u-input"
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>

          <div class="form-options">
            <label class="u-checkbox">
              <input v-model="loginForm.rememberMe" type="checkbox" /><span class="u-checkbox-box" aria-hidden="true"></span>
              <span>记住我</span>
            </label>
            <a href="#" class="forgot-password">忘记密码?</a>
          </div>

          <button
            type="submit"
            class="u-btn-primary submit-btn"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span v-if="loading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
            <span class="btn-text">{{ loading ? '登录中...' : '登录' }}</span>
          </button>

          <div class="divider">或者</div>

          <div class="social-login">
            <button type="button" class="u-btn-secondary social-btn">
              <span>微信登录</span>
            </button>
            <button type="button" class="u-btn-secondary social-btn">
              <span>QQ登录</span>
            </button>
          </div>
        </form>

        <!-- Register Form -->
        <form v-else class="form register-form" @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="register-username">用户名</label>
            <input
              id="register-username"
              v-model="registerForm.username"
              class="u-input"
              type="text"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-email">邮箱</label>
            <input
              id="register-email"
              v-model="registerForm.email"
              class="u-input"
              type="email"
              placeholder="请输入邮箱地址"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-password">密码</label>
            <input
              id="register-password"
              v-model="registerForm.password"
              class="u-input"
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>

          <div class="form-group">
            <label for="register-confirm">确认密码</label>
            <input
              id="register-confirm"
              v-model="registerForm.confirmPassword"
              class="u-input"
              type="password"
              placeholder="请再次输入密码"
              required
            />
          </div>

          <div class="form-options">
            <label class="u-checkbox">
              <input v-model="registerForm.agreeTerms" type="checkbox" /><span class="u-checkbox-box" aria-hidden="true"></span>
              <span>我同意<a href="#">用户协议</a>和<a href="#">隐私政策</a></span>
            </label>
          </div>

          <button
            type="submit"
            class="u-btn-primary submit-btn"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span v-if="loading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
            <span class="btn-text">{{ loading ? '提交中...' : '注册' }}</span>
          </button>
        </form>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="success-message" role="status">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useBodyScroll } from '@/hooks/useBodyScroll/useBodyScroll';

const emit = defineEmits(['close', 'login-success']);
const userStore = useUserStore();
const { disableScroll, enableScroll } = useBodyScroll();

const modalRef = ref(null);
const activeTab = ref('login');
const errorMessage = ref('');
const successMessage = ref('');
const loading = ref(false);

/** 打开弹窗前拥有焦点的元素，关闭后归还焦点 */
let previouslyFocused = null;

/** 关闭弹窗：统一走这里，保证滚动与焦点都被恢复 */
const close = () => {
  emit('close');
};

/** 把 Tab 焦点限制在弹窗内 —— 弹窗是模态的，焦点不应跑到背后的页面 */
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }

  if (event.key !== 'Tab' || !modalRef.value) return;

  const focusable = modalRef.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const list = Array.from(focusable).filter((el) => !el.disabled && el.offsetParent !== null);
  if (list.length === 0) return;

  const first = list[0];
  const last = list[list.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

onMounted(async () => {
  disableScroll();

  // 记录来源焦点，并把焦点移入弹窗（首个输入框）
  previouslyFocused = document.activeElement;
  await nextTick();
  const firstInput = modalRef.value?.querySelector('input, button');
  firstInput?.focus();

  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  enableScroll();
  document.removeEventListener('keydown', handleKeydown);
  // 归还焦点，避免焦点落回 body 导致键盘用户失去位置
  if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
    previouslyFocused.focus();
  }
});

const loginForm = ref({
  username: '',
  password: '',
  rememberMe: false,
});

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
});

const handleLogin = async () => {
  errorMessage.value = '';

  if (!loginForm.value.username || !loginForm.value.password) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;

  try {
    // 输入既可能是用户名，也可能是邮箱或手机号，交给后端按 login_type 判定
    const identifier = loginForm.value.username.trim();
    const loginType = identifier.includes('@')
      ? 'email'
      : /^1[3-9]\d{9}$/.test(identifier)
        ? 'phone'
        : 'username';

    const result = await userStore.login({
      login_type: loginType,
      username: loginType === 'username' ? identifier : undefined,
      email: loginType === 'email' ? identifier : undefined,
      phone: loginType === 'phone' ? identifier : undefined,
      password: loginForm.value.password,
    });

    if (result.success) {
      emit('login-success', identifier);
      resetForms();
    } else {
      errorMessage.value = result.message || '用户名或密码错误';
    }
  } catch (error) {
    errorMessage.value = error.message || '登录失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  errorMessage.value = '';

  if (
    !registerForm.value.username ||
    !registerForm.value.email ||
    !registerForm.value.password ||
    !registerForm.value.confirmPassword
  ) {
    errorMessage.value = '请填写所有字段';
    return;
  }

  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致';
    return;
  }

  if (!registerForm.value.agreeTerms) {
    errorMessage.value = '请同意用户协议和隐私政策';
    return;
  }

  loading.value = true;

  try {
    const result = await userStore.register({
      username: registerForm.value.username.trim(),
      email: registerForm.value.email.trim(),
      password: registerForm.value.password,
    });

    if (result.success) {
      successMessage.value = result.message || '注册成功，请使用该账号登录';
      resetForms();
      // 注册成功后切回登录页签，降低用户操作成本
      activeTab.value = 'login';
    } else {
      errorMessage.value = result.message || '注册失败';
    }
  } catch (error) {
    errorMessage.value = error.message || '注册失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

const resetForms = () => {
  loginForm.value = {
    username: '',
    password: '',
    rememberMe: false,
  };
  registerForm.value = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  };
};

const switchTab = (tab) => {
  activeTab.value = tab;
  errorMessage.value = '';
  successMessage.value = '';
};
</script>

<style scoped>
/*
 * 登录/注册弹窗
 *
 * 外壳（宽度 480~520px、内边距 24~28px、圆角 16~24px、遮罩、阴影、关闭按钮尺寸）
 * 全部来自 global.css 的 .u-modal-overlay / .u-modal / .u-modal-close 与 --modal-* 令牌；
 * 输入框与按钮同理复用 .u-input / .u-btn-primary / .u-btn-secondary / .u-checkbox。
 * 这里只保留登录弹窗特有的内部布局。
 */

/* ── 页签：下划线式，与主题弹窗的胶囊页签区分开 ─────────── */
.modal-tabs {
  display: flex;
  margin-bottom: calc(var(--space-unit) * 3);
  border-bottom: var(--stroke-width) solid var(--divider);
}

.tab-btn {
  position: relative;
  flex: 1;
  height: var(--btn-height);
  font-size: var(--btn-font-size);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  transition: color var(--transition-interactive);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: calc(var(--stroke-width) * -1);
  left: 0;
  height: var(--dropdown-active-bar);
  background: var(--accent);
}

/* ── 表单 ───────────────────────────────────────────────── */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--modal-title-gap);
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
}

.form-group label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  color: var(--text-secondary);
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-unit);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.u-checkbox span {
  color: var(--text-secondary);
}

.checkbox a,
.forgot-password {
  color: var(--accent);
  transition: color var(--transition-interactive);
}

.checkbox a:hover,
.forgot-password:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

.submit-btn {
  width: 100%;
}

/* ── 分隔线与第三方登录 ─────────────────────────────────── */
.divider {
  position: relative;
  margin: calc(var(--space-unit) * 2) 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  text-align: center;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(50% - var(--space-unit) * 2.5);
  height: var(--stroke-width);
  background: var(--divider);
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.social-login {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(var(--space-unit) * 1.5);
}

/* 微信 / QQ 统一成次按钮：令牌体系里没有第三方品牌色的位置 */
.social-btn {
  width: 100%;
}

/* ── 结果提示：语义色 10% 底 + 语义色文字（规范第八节的颜色变体）── */
.error-message,
.success-message {
  margin-top: var(--modal-title-gap);
  padding: var(--tag-padding-y) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  text-align: center;
  border-radius: var(--radius-input);
}

.error-message {
  color: var(--danger);
  background: var(--danger-bg);
  animation: shake var(--enter-duration) var(--enter-ease) both;
}

.success-message {
  color: var(--success);
  background: var(--success-bg);
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(calc(var(--space-unit) * -0.6));
  }

  75% {
    transform: translateX(calc(var(--space-unit) * 0.6));
  }
}

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 767px) {
  .form-options {
    flex-direction: column;
    align-items: flex-start;
  }

  .social-login {
    grid-template-columns: 1fr;
  }
}
</style>