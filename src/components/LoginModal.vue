<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div
      ref="modalRef"
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <h2 id="login-modal-title" class="visually-hidden">
        {{ activeTab === 'login' ? '登录' : '注册' }}
      </h2>

      <button class="close-btn" @click="close" aria-label="关闭弹窗">
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
      <div class="tab-content">
        <!-- Login Form -->
        <form v-if="activeTab === 'login'" class="form login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="login-username">用户名</label>
            <input
              id="login-username"
              v-model="loginForm.username"
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
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>

          <div class="form-options">
            <label class="checkbox">
              <input v-model="loginForm.rememberMe" type="checkbox" />
              <span>记住我</span>
            </label>
            <a href="#" class="forgot-password">忘记密码?</a>
          </div>

          <button
            type="submit"
            class="submit-btn"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            <span class="btn-text">{{ loading ? '登录中...' : '登录' }}</span>
          </button>

          <div class="divider">或者</div>

          <div class="social-login">
            <button type="button" class="social-btn wechat">
              <span>微信登录</span>
            </button>
            <button type="button" class="social-btn qq">
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
              type="password"
              placeholder="请再次输入密码"
              required
            />
          </div>

          <div class="form-options">
            <label class="checkbox">
              <input v-model="registerForm.agreeTerms" type="checkbox" />
              <span>我同意<a href="#">用户协议</a>和<a href="#">隐私政策</a></span>
            </label>
          </div>

          <button
            type="submit"
            class="submit-btn"
            :disabled="loading"
            :aria-busy="loading"
          >
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-in-out;
  overflow: hidden;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  padding: 40px;
  position: relative;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease-in-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: var(--color-muted);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--color-primary);
  transform: scale(1.1);
}

.modal-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 30px;
  border-bottom: 2px solid #EEE;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-muted);
  cursor: pointer;
  position: relative;
  transition: color 0.3s ease-in-out;
}

.tab-btn.active {
  color: var(--color-primary);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gradient-primary);
}

.tab-content {
  animation: fadeInScale 0.3s ease-in-out;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-dark);
}

.form-group input {
  padding: 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease-in-out;
  background: white;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(138, 109, 255, 0.1);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox input:checked {
  accent-color: var(--color-primary);
}

.checkbox span {
  color: var(--color-dark);
}

.checkbox a {
  color: var(--color-primary);
  text-decoration: none;
}

.checkbox a:hover {
  text-decoration: underline;
}

.forgot-password {
  color: var(--color-primary);
  text-decoration: none;
  transition: all 0.2s ease-in-out;
}

.forgot-password:hover {
  text-decoration: underline;
}

.submit-btn {
  padding: 12px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  margin-top: 8px;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
}

/* 按钮加载样式 */
.submit-btn[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.divider {
  text-align: center;
  color: var(--color-muted);
  font-size: 14px;
  position: relative;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(50% - 20px);
  height: 1px;
  background: var(--color-border-strong);
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
  gap: 12px;
}

.social-btn {
  padding: 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.social-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.social-btn.wechat {
  color: #09B981;
  border-color: #D1FAE5;
  background: var(--color-success-bg);
}

.social-btn.qq {
  color: #3B82F6;
  border-color: #DBEAFE;
  background: #F0F9FF;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #FEE;
  color: #C33;
  border: 1px solid #FCC;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  animation: shake 0.3s ease-in-out;
}

.success-message {
  margin-top: 16px;
  padding: 12px;
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid #BBF7D0;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* 响应式 */
@media (max-width: 575px) {
  .modal-content {
    width: 90%;
    max-width: 320px;
    padding: 20px 16px;
  }

  .modal-tabs {
    margin-bottom: 16px;
  }

  .tab-btn {
    font-size: 13px;
    padding: 10px 8px;
  }

  .form-group input {
    font-size: 14px;
    padding: 10px;
  }

  .form-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .social-login {
    gap: 8px;
  }

  .social-btn {
    font-size: 12px;
    padding: 8px;
  }

  .submit-btn {
    font-size: 14px;
    padding: 10px;
  }
}
</style>
