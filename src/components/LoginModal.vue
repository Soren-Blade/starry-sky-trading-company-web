<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="close-btn" @click="$emit('close')" aria-label="Close modal">
        ✕
      </button>

      <!-- Tabs -->
      <div class="modal-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'"
        >
          登录
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'register' }"
          @click="activeTab = 'register'"
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
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useBodyScroll } from '@/hooks/useBodyScroll/useBodyScroll';

const emit = defineEmits(['close', 'login-success']);
const userStore = useUserStore();
const { disableScroll, enableScroll } = useBodyScroll();

const activeTab = ref('login');
const errorMessage = ref('');
const loading = ref(false);

// 模态框打开时禁用滚动
onMounted(() => {
  disableScroll();
});

// 模态框关闭时恢复滚动
onUnmounted(() => {
  enableScroll();
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
    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    const success = userStore.login(
      loginForm.value.username,
      loginForm.value.password,
      loginForm.value.rememberMe
    );

    if (success) {
      emit('login-success', loginForm.value.username);
      resetForms();
    } else {
      errorMessage.value = '用户名或密码错误';
    }
  } catch (error) {
    errorMessage.value = '登录失败，请稍后重试';
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

  } catch (error) {
    errorMessage.value = '注册失败，请稍后重试';
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
  color: #999;
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
  color: #999;
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
  border: 1px solid #DDD;
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
  color: #999;
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
  background: #DDD;
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
  border: 1px solid #DDD;
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
  background: #F0FDF4;
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
